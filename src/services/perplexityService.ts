import axios from "axios";
import { logger } from "../utils/logger";
import { getAllCategories, getBusinessExpenseCategories, getIncomeCategories } from "../config/categories";
import { dataEncryptionService } from "./dataEncryption";

export interface TransactionCategorizationRequest {
  transactionId: string;
  amount: number;
  description: string;
  merchant: string;
  date: string;
  type: "Income" | "Expense";
  userId?: string;
}

export interface CategorySuggestion {
  label: string;
  confidence: number;
  reasoning: string;
}

export interface TransactionCategorizationResponse {
  categories: CategorySuggestion[];
  description: string;
  primaryCategory: string;
  confidence: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TransactionChatResponse {
  message: string;
  suggestions?: CategorySuggestion[];
  updatedCategory?: string;
}

/**
 * Service for categorizing business transactions using Perplexity AI
 * with live web data and privacy-safe tokenization
 */
export class PerplexityService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.perplexity.ai/chat/completions";
  private readonly model = "sonar";

  // Request deduplication cache
  private readonly requestCache = new Map<
    string,
    Promise<TransactionCategorizationResponse>
  >();
  private readonly cacheTimeout = 30000; // 30 seconds

  // Rate limiting (global in-process limiter for all outbound calls)
  private readonly maxRequestsPerMinute = 500; // hard cap
  private requestTimestamps: number[] = [];
  private processingQueue = false;
  private requestQueue: Array<{
    run: () => Promise<any>;
    resolve: (v: any) => void;
    reject: (e: any) => void;
    enqueuedAt: number;
  }> = [];

  /**
   * IRS-compliant business expense categories for accurate accounting and tax purposes
   * Based on IRS Publication 535 - Business Expenses
   */
  private readonly legalCategories: string[];

  // Initialize categories from shared config
  constructor() {
    this.legalCategories = getAllCategories();
    this.apiKey = process.env.PERPLEXITY_API_KEY || "";
    if (!this.apiKey) {
      logger.warn(
        "PERPLEXITY_API_KEY not configured - transaction categorization may not work"
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get appropriate categories based on transaction type
   */
  private getCategoriesForTransactionType(
    type: "Income" | "Expense",
    amount: number
  ): string[] {
    // Use the transaction type field as the primary determinant
    if (type === "Income") {
      return getIncomeCategories();
    }
    // For expense transactions, use business expense categories
    return getBusinessExpenseCategories();
  }

  /**
   * Generate a cache key for request deduplication
   */
  private generateCacheKey(request: TransactionCategorizationRequest): string {
    return `${request.transactionId}-${request.amount}-${request.type}-${request.merchant}-${request.description}`.replace(
      /\s+/g,
      "_"
    );
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    // Simple cleanup - in production, you might want a more sophisticated approach
    if (this.requestCache.size > 100) {
      const keysToDelete = Array.from(this.requestCache.keys()).slice(0, 50);
      keysToDelete.forEach((key) => this.requestCache.delete(key));
    }
  }

  /**
   * Safely truncate text for logging without exposing sensitive data
   */
  private truncateForLogging(text: string, maxLength = 200): string {
    if (!text) return "";
    const sanitized = String(text);
    return sanitized.length > maxLength
      ? `${sanitized.slice(0, maxLength)}…`
      : sanitized;
  }

  /**
   * Process and clean suggestion arrays to ensure quality and consistency
   */
  private cleanSuggestions(
    rawSuggestions:
      | Array<{ label: string; confidence: number; reasoning?: string }>
      | undefined,
    currentCategory?: string,
    transactionType?: "Income" | "Expense",
    amount?: number
  ): Array<{ label: string; confidence: number; reasoning?: string }> {
    if (!Array.isArray(rawSuggestions)) return [];

    const processedSuggestions: Array<{
      label: string;
      confidence: number;
      reasoning?: string;
    }> = [];
    const seenLabels = new Set<string>();

    // Process each suggestion
    for (const suggestion of rawSuggestions) {
      const normalizedLabel = this.findBestCategoryMatch(
        suggestion?.label || "",
        transactionType,
        amount
      );

      if (!normalizedLabel) continue;

      const labelKey = normalizedLabel.toLowerCase();
      if (seenLabels.has(labelKey)) continue;

      seenLabels.add(labelKey);
      processedSuggestions.push({
        label: normalizedLabel,
        confidence: Math.max(
          0,
          Math.min(1, Number(suggestion?.confidence) || 0)
        ),
        reasoning: suggestion?.reasoning || "",
      });
    }

    // Sort by confidence and limit results
    const sortedSuggestions = processedSuggestions
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 4);

    // Handle "Other" category specially - only include if no better options
    const otherSuggestions = sortedSuggestions.filter(
      (s) => s.label === "Other Expenses"
    );
    const nonOtherSuggestions = sortedSuggestions.filter(
      (s) => s.label !== "Other Expenses"
    );

    if (nonOtherSuggestions.length === 0 && otherSuggestions.length > 0) {
      return [
        {
          ...otherSuggestions[0],
          confidence: Math.min(otherSuggestions[0].confidence || 0.55, 0.6),
        },
      ];
    }

    return nonOtherSuggestions;
  }

  /**
   * Find the best matching legal category without keyword prejudging
   * Uses fuzzy matching and semantic similarity instead of hardcoded keywords
   */
  private findBestCategoryMatch(
    inputLabel: string,
    transactionType?: "Income" | "Expense",
    amount?: number
  ): string {
    if (!inputLabel) {
      // Return appropriate default based on transaction type
      if (transactionType === "Income") {
        return "Income";
      }
      return "Other Expenses";
    }

    const normalized = inputLabel.toLowerCase().trim();

    // Get appropriate categories for this transaction type
    const categoriesToSearch =
      transactionType && amount !== undefined
        ? this.getCategoriesForTransactionType(transactionType, amount)
        : this.legalCategories;

    // Direct match first
    const directMatch = categoriesToSearch.find(
      (category) => category.toLowerCase() === normalized
    );
    if (directMatch) return directMatch;

    // Semantic similarity matching (without keyword prejudging)
    const similarityScores = categoriesToSearch.map((category) => ({
      category,
      score: this.calculateSemanticSimilarity(
        normalized,
        category.toLowerCase()
      ),
    }));

    const bestMatch = similarityScores.sort((a, b) => b.score - a.score)[0];

    // Only return a match if similarity is reasonably high
    if (bestMatch.score > 0.3) {
      return bestMatch.category;
    }

    // Return appropriate fallback based on transaction type
    if (transactionType === "Income") {
      return "Income";
    }
    return "Other Expenses";
  }

  /**
   * Calculate semantic similarity between two strings
   * Uses word overlap and common business terms without hardcoded prejudging
   */
  private calculateSemanticSimilarity(input: string, category: string): number {
    const inputWords = input.split(/\s+/).filter((word) => word.length > 2);
    const categoryWords = category
      .split(/\s+/)
      .filter((word) => word.length > 2);

    if (inputWords.length === 0 || categoryWords.length === 0) return 0;

    let matches = 0;
    for (const inputWord of inputWords) {
      for (const categoryWord of categoryWords) {
        if (
          inputWord.includes(categoryWord) ||
          categoryWord.includes(inputWord)
        ) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(inputWords.length, categoryWords.length);
  }

  private cleanupOldTimestamps(now: number): void {
    const cutoff = now - 60000; // 1 minute window
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > cutoff);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }

    private async queueApiCall<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push({
        run: async () => {
          try {
            return await fn();
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 429 || status === 503) {
              const retryAfter =
                Number(err?.response?.headers?.["retry-after"]) ||
                Number(err?.response?.headers?.["x-ratelimit-reset"]) ||
                30;
              logger.warn("Perplexity 429 or 503 received, backing off", {
                waitSeconds: retryAfter,
              });
              await this.sleep(retryAfter * 1000);
            }
            throw err;
          }
        },
        resolve,
        reject,
        enqueuedAt: Date.now(),
      });
      if (!this.processingQueue) {
        this.processRequestQueue().catch((err) =>
          logger.error("Rate limiter loop error", { err: err?.message })
        );
      }
    });
  }

  private async processRequestQueue(): Promise<void> {
    if (this.processingQueue) return;
    this.processingQueue = true;

    try {
      while (this.requestQueue.length > 0) {
        const now = Date.now();
        this.cleanupOldTimestamps(now);

        if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
          const oldest = Math.min(...this.requestTimestamps);
          const waitTime = Math.max(0, 60000 - (now - oldest));
          logger.info("Perplexity RPM cap reached. Waiting.", {
            waitTimeMs: waitTime,
            queueLength: this.requestQueue.length,
            requestsInLastMinute: this.requestTimestamps.length,
          });
          await this.sleep(waitTime);
          continue;
        }

        const item = this.requestQueue.shift();
        if (!item) continue;

        try {
          this.requestTimestamps.push(Date.now());
          const result = await item.run();
          item.resolve(result);
        } catch (err) {
          item.reject(err);
        }

        // Small inter-request spacing to avoid burstiness
        if (this.requestQueue.length > 0) {
          await this.sleep(75);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  // ============================================================================
  // LOGGING METHODS
  // ============================================================================

  private logRequest(
    type: "chat" | "categorize",
    metadata: Record<string, any>
  ): void {
    try {
      logger.info(`Perplexity ${type} request initiated`, {
        service: "potion-ai",
        ...metadata,
      });
    } catch {
      // Silent fail
    }
  }

  private logResponse(
    type: "chat" | "categorize",
    metadata: Record<string, any>
  ): void {
    try {
      logger.debug(`Perplexity ${type} response received`, {
        service: "potion-ai",
        ...metadata,
      });
    } catch {
      // Silent fail
    }
  }

  private logError(type: "chat" | "categorize", error: any): void {
    const errorInfo = {
      service: "potion-ai",
      status: error?.response?.status,
      message: error?.message,
      snippet: this.extractErrorSnippet(error?.response?.data),
      ratelimit: {
        limit: error?.response?.headers?.["x-ratelimit-limit"],
        remaining: error?.response?.headers?.["x-ratelimit-remaining"],
        reset: error?.response?.headers?.["x-ratelimit-reset"],
      },
    };

    logger.error(`Perplexity ${type} error`, errorInfo);
  }

  private extractErrorSnippet(data: any): string {
    try {
      const dataString = typeof data === "string" ? data : JSON.stringify(data);
      return this.truncateForLogging(dataString);
    } catch {
      return "<unavailable>";
    }
  }

  // ============================================================================
  // CONTENT PARSING METHODS
  // ============================================================================

  /**
   * Parse markdown table format suggestions
   * Example: | Category | Confidence | Reasoning |
   */
  private parseMarkdownTable(
    content: string
  ): Array<{ label: string; confidence: number; reasoning?: string }> {
    try {
      const lines = content.split(/\r?\n/);
      const headerIndex = lines.findIndex(
        (line) => /\bCategory\b/i.test(line) && /\bConfidence\b/i.test(line)
      );

      if (headerIndex < 0) return [];

      const dataStartIndex =
        headerIndex + 2 < lines.length ? headerIndex + 2 : headerIndex + 1;
      const suggestions: Array<{
        label: string;
        confidence: number;
        reasoning?: string;
      }> = [];

      for (let i = dataStartIndex; i < lines.length; i++) {
        const row = lines[i].trim();
        if (!row.startsWith("|") || row.replace(/\|/g, "").trim().length === 0)
          continue;

        const cells = row
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell.length > 0);

        if (cells.length < 2) continue;

        const label = cells[0];
        const confidenceRaw = cells[1];
        const reasoning = cells[2] || "";

        let confidence = parseFloat(confidenceRaw);

        // Handle percentage format
        if (!isFinite(confidence)) {
          const percentMatch = /([0-9]+)\s*%/.exec(confidenceRaw);
          if (percentMatch) {
            confidence = Number(percentMatch[1]) / 100;
          }
        }

        if (confidence > 1) confidence = confidence / 100;
        if (!isFinite(confidence)) confidence = 0;

        suggestions.push({ label, confidence, reasoning });
      }

      return suggestions;
    } catch {
      return [];
    }
  }

  /**
   * Parse bullet point format suggestions
   * Example: - Category Name: 0.9 - reasoning
   */
  private parseBulletPoints(
    content: string
  ): Array<{ label: string; confidence: number; reasoning?: string }> {
    const lines = content.split(/\r?\n/);
    const suggestions: Array<{
      label: string;
      confidence: number;
      reasoning?: string;
    }> = [];

    for (const line of lines) {
      const cleanLine = line.trim().replace(/^[-*•]\s*/, "");
      if (!cleanLine) continue;

      // Try different patterns for extracting category and confidence
      const patterns = [
        /(.*?)[|\-—]+\s*(\d+(?:\.\d+)?)%?\s*(?:[|\-—]+\s*(.*))?$/i,
        /(.*?)(?:\(|\[)?\s*Confidence\s*[:=]\s*(\d+(?:\.\d+)?)%?(?:\)|\])?\s*(?:-\s*(.*))?$/i,
      ];

      for (const pattern of patterns) {
        const match = pattern.exec(cleanLine);
        if (match) {
          const label = match[1].trim();
          let confidence = parseFloat(match[2]);

          if (confidence > 1) confidence = confidence / 100;
          if (!isFinite(confidence)) confidence = 0;

          const reasoning = (match[3] || "").trim();

          if (label) {
            suggestions.push({ label, confidence, reasoning });
            break;
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Extract structured suggestions from various text formats
   */
  private extractStructuredSuggestions(
    content: string,
    currentCategory?: string,
    transactionType?: "Income" | "Expense",
    amount?: number
  ): Array<{ label: string; confidence: number; reasoning?: string }> {
    // Try markdown table format first
    const tableResults = this.parseMarkdownTable(content);
    if (tableResults.length > 0) {
      return this.cleanSuggestions(
        tableResults,
        currentCategory,
        transactionType,
        amount
      );
    }

    // Try bullet point format
    const bulletResults = this.parseBulletPoints(content);
    if (bulletResults.length > 0) {
      return this.cleanSuggestions(
        bulletResults,
        currentCategory,
        transactionType,
        amount
      );
    }

    return [];
  }

  /**
   * Normalize chat message history for API compatibility
   */
  private normalizeChatHistory(
    history: ChatMessage[],
    maxPairs = 4
  ): ChatMessage[] {
    if (!Array.isArray(history)) return [];

    const normalizedMessages: ChatMessage[] = [];

    // Find first user message (skip leading assistant messages)
    const firstUserIndex = history.findIndex((msg) => msg.role === "user");
    if (firstUserIndex < 0) return [];

    const relevantHistory = history.slice(firstUserIndex);
    let expectedRole: "user" | "assistant" = "user";

    for (const message of relevantHistory) {
      if (message.role !== expectedRole) continue;

      normalizedMessages.push({
        role: message.role,
        content: message.content,
      });

      expectedRole = expectedRole === "user" ? "assistant" : "user";

      // Limit to recent conversation pairs
      if (normalizedMessages.length >= maxPairs * 2) break;
    }

    return normalizedMessages;
  }

  // ============================================================================
  // MAIN API METHODS
  // ============================================================================

  /**
   * Categorize a transaction using Perplexity AI with live web data
   */
  public async categorizeTransaction(
    request: TransactionCategorizationRequest
  ): Promise<TransactionCategorizationResponse> {
    try {
      // Generate cache key for deduplication
      const cacheKey = this.generateCacheKey(request);

      // Check if we already have a pending request for this transaction
      if (this.requestCache.has(cacheKey)) {
        logger.info("Using cached categorization request", {
          service: "potion-ai",
          transactionId: request.transactionId,
          cacheKey: cacheKey.substring(0, 50) + "...",
        });
        return await this.requestCache.get(cacheKey)!;
      }

      // Create the promise and cache it immediately to prevent duplicates
      const categorizationPromise = this.performCategorization(request);
      this.requestCache.set(cacheKey, categorizationPromise);

      // Set up cache cleanup
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
        this.cleanupCache();
      }, this.cacheTimeout);

      return await categorizationPromise;
    } catch (error: any) {
      logger.error("Transaction categorization failed", {
        service: "potion-ai",
        transactionId: request.transactionId,
        error: error.message,
      });

      // Return fallback categorization
      return this.createFallbackCategorization(request);
    }
  }

  /**
   * Perform the actual categorization logic with rate limiting
   */
  private async performCategorization(
    request: TransactionCategorizationRequest
  ): Promise<TransactionCategorizationResponse> {
    return this.queueApiCall(async () => {
      return this.executeCategorization(request);
    });
  }

  /**
   * Execute the actual categorization request
   */
  private async executeCategorization(
    request: TransactionCategorizationRequest
  ): Promise<TransactionCategorizationResponse> {
    try {
      // Prepare sanitized logging data
      const logData = {
        service: "potion-ai",
        transactionId: request.transactionId,
        merchant: dataEncryptionService.sanitizeForLogging(
          request.merchant || ""
        ),
        description: dataEncryptionService.sanitizeForLogging(
          request.description || ""
        ),
        amount: request.amount,
      };

      logger.info("Starting transaction categorization", logData);

      // Tokenize sensitive data before sending to external API
      const tokenizedDescription = dataEncryptionService.tokenizeSensitiveData(
        request.description || ""
      );
      const tokenizedMerchant = dataEncryptionService.tokenizeSensitiveData(
        request.merchant || ""
      );

      const secureRequest: TransactionCategorizationRequest = {
        ...request,
        description: tokenizedDescription.tokenizedText,
        merchant: tokenizedMerchant.tokenizedText,
      };

      // Build categorization prompt
      const prompt = this.buildCategorizationPrompt(secureRequest);

      // Log request details
      this.logRequest("categorize", {
        service: "potion-ai",
        model: this.model,
        amount: request.amount,
        type: request.type,
        date: request.date,
        merchant: this.truncateForLogging(logData.merchant),
        description: this.truncateForLogging(logData.description),
      });

      // Make API request to Perplexity
      const response = await axios.post(
        this.baseUrl,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content: this.buildSystemPrompt(request.type, request.amount),
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 1500, // Increased to prevent truncation
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      // Process response
      const responseContent = response.data.choices[0]?.message?.content;

      this.logResponse("categorize", {
        service: "potion-ai",
        status: response.status,
        rateLimit: {
          limit: response.headers["x-ratelimit-limit"],
          remaining: response.headers["x-ratelimit-remaining"],
          reset: response.headers["x-ratelimit-reset"],
        },
        contentPreview: this.truncateForLogging(responseContent || ""),
      });

      if (!responseContent) {
        throw new Error("No response content from Perplexity API");
      }

      // Parse and validate response
      const categorization = this.parseCategorizationResponse(
        responseContent,
        tokenizedDescription
      );

      // Clean and process suggestions
      categorization.categories = this.cleanSuggestions(
        categorization.categories,
        undefined,
        request.type,
        request.amount
      ).map((suggestion) => ({
        label: suggestion.label,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning || "",
      }));

      if (categorization?.primaryCategory) {
        categorization.primaryCategory = this.findBestCategoryMatch(
          categorization.primaryCategory,
          request.type,
          request.amount
        );
      }

      // Validate final response structure
      if (
        !categorization.categories ||
        !Array.isArray(categorization.categories)
      ) {
        throw new Error("Invalid categorization response structure");
      }

      logger.info("Transaction categorization completed successfully", {
        service: "potion-ai",
        transactionId: request.transactionId,
        primaryCategory: categorization.primaryCategory,
        confidence: categorization.confidence,
        suggestionsCount: categorization.categories.length,
      });

      return categorization;
    } catch (error: any) {
      this.logError("categorize", error);
      throw error; // Re-throw to be handled by the calling method
    }
  }

  /**
   * Handle conversational transaction categorization with context
   */
  public async chatAboutTransaction(
    request: TransactionCategorizationRequest,
    messages: ChatMessage[],
    currentCategory?: string
  ): Promise<TransactionChatResponse> {
    try {
      logger.info("Starting transaction categorization chat", {
        transactionId: request.transactionId,
        messageCount: messages.length,
        currentCategory,
      });

      // Tokenize sensitive data
      const tokenizedDescription = dataEncryptionService.tokenizeSensitiveData(
        request.description || ""
      );
      const tokenizedMerchant = dataEncryptionService.tokenizeSensitiveData(
        request.merchant || ""
      );

      const secureRequest: TransactionCategorizationRequest = {
        ...request,
        description: tokenizedDescription.tokenizedText,
        merchant: tokenizedMerchant.tokenizedText,
      };

      // Prepare chat messages
      const systemPrompt = this.buildChatSystemPrompt(
        secureRequest,
        currentCategory
      );
      const guidancePrompt = this.buildGuidancePrompt();
      const normalizedHistory = this.normalizeChatHistory(messages);

      const chatMessages = [
        { role: "system", content: systemPrompt },
        { role: "system", content: guidancePrompt },
        ...normalizedHistory.map((msg) => ({
          role: msg.role,
          content: dataEncryptionService.tokenizeSensitiveData(
            msg.content || ""
          ).tokenizedText,
        })),
      ];

      // Log request details
      this.logRequest("chat", {
        model: this.model,
        temperature: 0.4,
        max_tokens: 900,
        messageCount: chatMessages.length,
        lastUserMessage: this.truncateForLogging(
          messages.filter((m) => m.role === "user").pop()?.content || ""
        ),
        currentCategory,
        amount: request.amount,
        type: request.type,
        date: request.date,
      });

      // Make API request with rate limiting
      const response = await this.queueApiCall(() =>
        axios.post(
          this.baseUrl,
          {
            model: this.model,
            messages: chatMessages,
            temperature: 0.4,
            max_tokens: 900,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        )
      );

      // Process response
      const responseContent = response.data.choices[0]?.message?.content;

      this.logResponse("chat", {
        status: response.status,
        rateLimit: {
          limit: response.headers["x-ratelimit-limit"],
          remaining: response.headers["x-ratelimit-remaining"],
          reset: response.headers["x-ratelimit-reset"],
        },
        contentPreview: this.truncateForLogging(responseContent || ""),
      });

      if (!responseContent) {
        throw new Error("No response content from Perplexity API");
      }

      // Detokenize content for safe display
      const detokenizedContent = dataEncryptionService.detokenizeData(
        responseContent,
        tokenizedDescription.tokens
      );

      // Parse response and extract suggestions
      const chatResponse = await this.processChatResponse(
        detokenizedContent,
        request,
        currentCategory
      );

      logger.info("Transaction chat completed successfully", {
        transactionId: request.transactionId,
        hasSuggestions: !!chatResponse.suggestions,
        hasUpdatedCategory: !!chatResponse.updatedCategory,
      });

      return chatResponse;
    } catch (error: any) {
      this.logError("chat", error);
      logger.error("Transaction chat failed", {
        transactionId: request.transactionId,
        error: error.message,
      });

      // Fallback to direct categorization
      return this.createChatFallback(request);
    }
  }

  // ============================================================================
  // PROMPT BUILDING METHODS
  // ============================================================================

  private buildSystemPrompt(
    transactionType: "Income" | "Expense",
    amount: number
  ): string {
    const availableCategories = this.getCategoriesForTransactionType(
      transactionType,
      amount
    );

    return `You are a financial expert specializing in business transaction categorization. You have access to live web data to help categorize business expenses and income accurately according to IRS guidelines.

CRITICAL: Your response MUST be ONLY valid JSON in this EXACT format (no markdown, no code blocks, no extra text):
{
  "categories": [
    {"label": "Category Name", "confidence": 0.95, "reasoning": "Brief explanation based on web research"},
    {"label": "Alternative Category", "confidence": 0.75, "reasoning": "Brief explanation"}
  ],
  "description": "Detailed explanation of what this transaction likely represents",
  "primaryCategory": "Most Likely Category Name",
  "confidence": 0.95
}

You must pick labels ONLY from these ${
      transactionType === "Income" ? "income" : "business expense"
    } categories:
${availableCategories.map((category) => `- ${category}`).join("\n")}

STRICT RULES:
1) Output ONLY valid JSON. No markdown blocks, no prose, no explanations outside JSON.
2) Use web search to research the merchant's actual business and services.
3) Base categorization on the merchant's real business activities, not assumptions.
4) Consider IRS guidelines for business ${
      transactionType === "Income" ? "income" : "expense"
    } classification.
5) ${
      transactionType === "Income"
        ? "Focus on income classification - determine if it's business revenue, interest, refunds, deposits, or donations."
        : "Focus on business expense classification according to IRS Schedule C categories."
    }
6) Provide 2-4 alternative categories with confidence scores (0.0 to 1.0).
7) Confidence should reflect how certain you are based on web research.
8) Keep reasoning strings SHORT (under 100 characters each) to prevent truncation.
9) Ensure all JSON strings are properly escaped and terminated.
10) End each reasoning with a period to ensure completeness.`;
  }

  private buildCategorizationPrompt(
    request: TransactionCategorizationRequest
  ): string {
    const { amount, description, merchant, date, type } = request;

    return `Please categorize this business transaction using live web data about the merchant:

Transaction Details:
- Amount: $${Math.abs(amount).toFixed(2)}
- Type: ${type}
- Description: "${description}"
- Merchant: "${merchant}"
- Date: ${date}

Please search for information about "${merchant}" to understand their actual business model and services. Based on your web research:

1. What type of business is this merchant?
2. What specific services/products do they provide?
3. How should this expense be classified for business accounting and tax purposes?
4. Are there any industry-specific or seasonal factors to consider?

IMPORTANT: Provide your response as valid JSON only, with no additional text. Keep all reasoning fields under 100 characters and end with a period to ensure complete responses.`;
  }

  private buildChatSystemPrompt(
    request: TransactionCategorizationRequest,
    currentCategory?: string
  ): string {
    const availableCategories = this.getCategoriesForTransactionType(
      request.type,
      request.amount
    );

    return `You are a financial advisor helping categorize a SPECIFIC business transaction. Unless the user states otherwise, assume every user message refers to THIS transaction and its categorization.

Transaction Details:
- Amount: $${Math.abs(request.amount).toFixed(2)}
- Type: ${request.type}
- Description: "${request.description}"
- Merchant: "${request.merchant}"
- Date: ${request.date}
${currentCategory ? `- Current Category: "${currentCategory}"` : ""}

Available ${
      request.type === "Income" ? "Income" : "Business Expense"
    } Categories:
${availableCategories.map((category) => `- ${category}`).join("\n")}

Guidelines:
1. Use web search to understand the merchant's actual business
2. Provide specific, actionable advice based on IRS guidelines for ${
      request.type === "Income" ? "income" : "business expense"
    } classification
3. Consider tax implications and business accounting best practices
4. Be conversational but professional
5. If the user's intent is ambiguous, focus on category guidance for THIS transaction
6. If confidence is low, ask clarifying questions about the transaction purpose
7. ${
      request.type === "Income"
        ? "Focus on determining if this is business income, interest, refunds, deposits, or donations"
        : "Focus on proper IRS Schedule C business expense classification"
    }

You can include JSON suggestions in your response like:
{
  "message": "Your conversational response here",
  "suggestions": [{"label": "Category", "confidence": 0.9, "reasoning": "Why"}],
  "updatedCategory": "New Category Name"
}

But plain text responses are also acceptable.`;
  }

  private buildGuidancePrompt(): string {
    return `When users express disagreement or ask for alternatives, explain your rationale briefly and propose 2-4 alternative categories with confidence scores and reasoning. Always provide fresh insights rather than repeating previous responses.`;
  }

  // ============================================================================
  // JSON PROCESSING HELPERS
  // ============================================================================

  /**
   * Clean and prepare JSON content for parsing
   */
  private cleanJsonContent(content: string): string {
    if (!content) return "{}";

    // Remove markdown code blocks
    let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

    // Find the main JSON object
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    // Remove any trailing text after the JSON
    const lines = cleaned.split("\n");
    let jsonLines: string[] = [];
    let braceCount = 0;
    let foundStart = false;

    for (const line of lines) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;

      if (openBraces > 0 && !foundStart) foundStart = true;
      if (foundStart) {
        jsonLines.push(line);
        braceCount += openBraces - closeBraces;
        if (braceCount === 0 && foundStart) break;
      }
    }

    return jsonLines.join("\n").trim();
  }

  /**
   * Extract JSON from malformed content using multiple strategies
   */
  private extractJsonFromContent(
    content: string
  ): TransactionCategorizationResponse | null {
    const strategies = [
      // Strategy 1: Try to repair and parse truncated JSON
      () => {
        let cleaned = content.trim();

        // Remove markdown code blocks
        cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

        // Find the JSON start
        const jsonStart = cleaned.indexOf("{");
        if (jsonStart < 0) return null;

        cleaned = cleaned.substring(jsonStart);

        // Try to find and repair truncated JSON
        const lines = cleaned.split("\n");
        let jsonText = "";
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          jsonText += line + "\n";

          // Count braces to find where JSON should end
          for (let j = 0; j < line.length; j++) {
            const char = line[j];

            if (escapeNext) {
              escapeNext = false;
              continue;
            }

            if (char === "\\") {
              escapeNext = true;
              continue;
            }

            if (char === '"') {
              inString = !inString;
              continue;
            }

            if (!inString) {
              if (char === "{") braceCount++;
              if (char === "}") braceCount--;
            }
          }

          // If we have balanced braces, try to parse
          if (braceCount === 0 && jsonText.trim().endsWith("}")) {
            try {
              return JSON.parse(jsonText);
            } catch {
              continue;
            }
          }
        }

        // If JSON is incomplete, try to repair it
        if (braceCount > 0) {
          // Remove incomplete reasoning field if present
          jsonText = jsonText.replace(/"reasoning":\s*"[^"]*$/m, "");

          // Add missing closing quotes and braces
          let repaired = jsonText.trim();

          // Fix incomplete string values
          const incompleteStringMatch = repaired.match(/"[^"]*$/);
          if (incompleteStringMatch) {
            repaired = repaired.replace(/"[^"]*$/, '"Truncated response"');
          }

          // Add missing closing braces
          while (braceCount > 0) {
            repaired += "}";
            braceCount--;
          }

          try {
            return JSON.parse(repaired);
          } catch {
            return null;
          }
        }

        return null;
      },

      // Strategy 2: Extract individual JSON fields and reconstruct
      () => {
        const categoryPattern =
          /"label":\s*"([^"]+)"[\s\S]*?"confidence":\s*([\d.]+)[\s\S]*?"reasoning":\s*"([^"]*?)(?:"|$)/g;
        const categories: Array<{
          label: string;
          confidence: number;
          reasoning: string;
        }> = [];
        let match: RegExpExecArray | null;

        while ((match = categoryPattern.exec(content)) !== null) {
          categories.push({
            label: match[1],
            confidence: parseFloat(match[2]) || 0.5,
            reasoning: match[3] || "Extracted from partial response",
          });
        }

        if (categories.length === 0) {
          // Try simpler pattern for just label and confidence
          const simplePattern =
            /"label":\s*"([^"]+)"[\s\S]*?"confidence":\s*([\d.]+)/g;
          while ((match = simplePattern.exec(content)) !== null) {
            categories.push({
              label: match[1],
              confidence: parseFloat(match[2]) || 0.5,
              reasoning: "Extracted from partial response",
            });
          }
        }

        if (categories.length > 0) {
          // Try to extract other fields
          const primaryCategoryMatch = content.match(
            /"primaryCategory":\s*"([^"]+)"/
          );
          const descriptionMatch = content.match(/"description":\s*"([^"]+)"/);
          const confidenceMatch = content.match(/"confidence":\s*([\d.]+)/);

          return {
            categories,
            description:
              descriptionMatch?.[1] || "Extracted from partial API response",
            primaryCategory:
              primaryCategoryMatch?.[1] ||
              categories[0]?.label ||
              "Other Expenses",
            confidence: parseFloat(
              confidenceMatch?.[1] || String(categories[0]?.confidence || 0.5)
            ),
          };
        }

        return null;
      },

      // Strategy 3: Fallback to basic pattern matching
      () => {
        const lines = content.split("\n");
        const result: any = { categories: [] };

        for (const line of lines) {
          if (line.includes('"primaryCategory"')) {
            const match = line.match(/"primaryCategory":\s*"([^"]+)"/);
            if (match) result.primaryCategory = match[1];
          }
          if (line.includes('"confidence"') && !result.confidence) {
            const match = line.match(/"confidence":\s*([\d.]+)/);
            if (match) result.confidence = parseFloat(match[1]);
          }
          if (line.includes('"description"')) {
            const match = line.match(/"description":\s*"([^"]+)"/);
            if (match) result.description = match[1];
          }
        }

        if (result.primaryCategory) {
          result.categories = [
            {
              label: result.primaryCategory,
              confidence: result.confidence || 0.5,
              reasoning: "Extracted from line parsing",
            },
          ];
          return result;
        }

        return null;
      },
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result && result.categories && Array.isArray(result.categories)) {
          return result;
        }
      } catch {
        // Continue to next strategy
        continue;
      }
    }

    return null;
  }

  // ============================================================================
  // RESPONSE PROCESSING METHODS
  // ============================================================================

  private parseCategorizationResponse(
    content: string,
    tokenizedDescription: any
  ): TransactionCategorizationResponse {
    let categorization: TransactionCategorizationResponse;

    try {
      // Clean the content first
      const cleanedContent = this.cleanJsonContent(content);
      categorization = JSON.parse(cleanedContent);
    } catch {
      logger.warn("Failed to parse JSON response, attempting extraction", {
        service: "potion-ai",
        content: this.truncateForLogging(content, 200),
        contentLength: content.length,
        hasTruncation:
          content.includes("```json") || !content.trim().endsWith("}"),
      });

      // Try multiple extraction methods
      const extractedCategorization = this.extractJsonFromContent(content);

      if (!extractedCategorization) {
        logger.error("Unable to parse categorization response", {
          service: "potion-ai",
          contentLength: content.length,
          contentPreview: this.truncateForLogging(content, 100),
        });
        throw new Error("Unable to parse categorization response");
      }

      categorization = extractedCategorization;

      logger.info("Successfully extracted categorization from truncated JSON", {
        service: "potion-ai",
        extractedCategories: extractedCategorization.categories?.length || 0,
        primaryCategory: extractedCategorization.primaryCategory,
      });
    }

    // Detokenize any leaked tokens
    if (categorization?.description) {
      categorization.description = dataEncryptionService.detokenizeData(
        categorization.description,
        tokenizedDescription.tokens
      );
    }

    if (Array.isArray(categorization?.categories)) {
      categorization.categories = categorization.categories.map((category) => ({
        ...category,
        reasoning: category.reasoning
          ? dataEncryptionService.detokenizeData(
              category.reasoning,
              tokenizedDescription.tokens
            )
          : category.reasoning,
        label: dataEncryptionService.detokenizeData(
          category.label,
          tokenizedDescription.tokens
        ),
      }));
    }

    return categorization;
  }

  private async processChatResponse(
    content: string,
    request: TransactionCategorizationRequest,
    currentCategory?: string
  ): Promise<TransactionChatResponse> {
    // Try to extract JSON suggestions first
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsedJson = JSON.parse(jsonMatch[0]);
        let suggestions = this.cleanSuggestions(
          Array.isArray(parsedJson.suggestions) ? parsedJson.suggestions : [],
          currentCategory,
          request.type,
          request.amount
        ).map((suggestion) => ({
          label: suggestion.label,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning || "",
        }));

        // Enrich with direct categorization if needed
        if (!suggestions || suggestions.length < 2) {
          suggestions = await this.enrichSuggestions(
            suggestions,
            request,
            currentCategory
          );
        }

        const updatedCategory = parsedJson.updatedCategory
          ? this.findBestCategoryMatch(
              parsedJson.updatedCategory,
              request.type,
              request.amount
            )
          : undefined;

        return {
          message:
            parsedJson.message ||
            (suggestions.length
              ? "Here are alternative categories based on your input."
              : content),
          suggestions: suggestions.length ? suggestions : undefined,
          updatedCategory,
        };
      } catch {
        // Fall through to text parsing
      }
    }

    // Try to extract structured suggestions from markdown/bullets
    const extractedSuggestions = this.extractStructuredSuggestions(
      content,
      currentCategory,
      request.type,
      request.amount
    );

    if (extractedSuggestions.length > 0) {
      return {
        message: "Here are alternative categories based on your input.",
        suggestions: extractedSuggestions.map((suggestion) => ({
          label: suggestion.label,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning || "",
        })),
      };
    }

    // Final fallback: run direct categorization
    try {
      const categorization = await this.categorizeTransaction(request);
      const suggestions = this.cleanSuggestions(
        categorization.categories,
        currentCategory,
        request.type,
        request.amount
      ).map((suggestion) => ({
        label: suggestion.label,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning || "",
      }));

      return {
        message: content,
        suggestions,
        updatedCategory: this.findBestCategoryMatch(
          categorization.primaryCategory,
          request.type,
          request.amount
        ),
      };
    } catch {
      return { message: content };
    }
  }

  private async enrichSuggestions(
    existingSuggestions: CategorySuggestion[],
    request: TransactionCategorizationRequest,
    currentCategory?: string
  ): Promise<CategorySuggestion[]> {
    try {
      const categorization = await this.categorizeTransaction(request);
      const newSuggestions = this.cleanSuggestions(
        categorization.categories,
        currentCategory,
        request.type,
        request.amount
      ).map((suggestion) => ({
        label: suggestion.label,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning || "",
      }));

      // Merge unique suggestions
      const existingLabels = new Set(
        (existingSuggestions || []).map((s) => s.label.toLowerCase())
      );

      const mergedSuggestions = [...(existingSuggestions || [])];

      for (const suggestion of newSuggestions) {
        if (!existingLabels.has(suggestion.label.toLowerCase())) {
          mergedSuggestions.push(suggestion);
        }
      }

      return mergedSuggestions
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 4);
    } catch {
      return existingSuggestions || [];
    }
  }
  private createFallbackCategorization(
    request: TransactionCategorizationRequest
  ): TransactionCategorizationResponse {
    const { description, merchant, type } = request;
    const combinedText = `${description} ${merchant}`.toLowerCase();

    let category = "Other Expenses";
    let confidence = 0.55;

    // Simple fallback logic without keyword prejudging
    if (type === "Income") {
      category = "Income";
      confidence = 0.6;
    } else {
      // Basic pattern matching for common business expenses
      if (
        combinedText.includes("software") ||
        combinedText.includes("subscription")
      ) {
        category = "Office Expenses";
        confidence = 0.7;
      } else if (
        combinedText.includes("office") ||
        combinedText.includes("supply")
      ) {
        category = "Supplies";
        confidence = 0.7;
      }
    }

    return {
      categories: [
        {
          label: category,
          confidence,
          reasoning: "Fallback categorization based on basic pattern matching",
        },
      ],
      description: `This appears to be a ${type.toLowerCase()} transaction that may fall under ${category}.`,
      primaryCategory: category,
      confidence,
    };
  }

  private async createChatFallback(
    request: TransactionCategorizationRequest
  ): Promise<TransactionChatResponse> {
    try {
      const categorization = await this.categorizeTransaction(request);
      return {
        message: "Here's what I can suggest based on the transaction details.",
        suggestions: categorization.categories
          .map((category) => ({
            label: this.findBestCategoryMatch(
              category.label,
              request.type,
              request.amount
            ),
            confidence: category.confidence,
            reasoning: category.reasoning,
          }))
          .sort((a, b) => b.confidence - a.confidence),
        updatedCategory: this.findBestCategoryMatch(
          categorization.primaryCategory,
          request.type,
          request.amount
        ),
      };
    } catch (fallbackError: any) {
      logger.error("Chat fallback categorization also failed", {
        transactionId: request.transactionId,
        error: fallbackError.message,
      });

      return {
        message:
          "I'm having trouble analyzing this transaction right now. Could you try asking again or manually select a category?",
      };
    }
  }
}

export const perplexityService = new PerplexityService();
