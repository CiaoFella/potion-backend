import crypto from "crypto";
import { logger } from "../utils/logger";

export interface TokenizedData {
  originalText: string;
  tokenizedText: string;
  tokens: Map<string, string>;
}

export interface EncryptionResult {
  encrypted: string;
  iv: string;
}

export class DataEncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly encryptionKey: Buffer;
  private readonly tokenPrefix = "TOKEN_";

  // Patterns for sensitive financial data
  private readonly sensitivePatterns = [
    // SSN patterns
    /\b\d{3}-\d{2}-\d{4}\b/g,
    /\b\d{9}\b/g,
    // Credit card patterns
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    // Bank account patterns
    /\b\d{8,17}\b/g,
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Phone numbers
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ];

  // Dollar amount patterns (separated for conditional use)
  private readonly dollarAmountPatterns = [
    // All dollar amounts (including small amounts)
    /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
  ];

  constructor() {
    const encryptionKey = process.env.DATA_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("DATA_ENCRYPTION_KEY environment variable is required");
    }

    if (encryptionKey.length < 32) {
      throw new Error(
        "DATA_ENCRYPTION_KEY must be at least 32 characters long"
      );
    }

    this.encryptionKey = Buffer.from(encryptionKey.slice(0, 32), "utf8");
  }

  /**
   * Tokenizes sensitive data in text before AI processing
   */
  public tokenizeSensitiveData(
    text: string,
    options?: { includeDollarAmounts?: boolean }
  ): TokenizedData {
    const tokens = new Map<string, string>();
    let tokenizedText = text;
    let tokenCounter = 1;

    try {
      // Combine patterns based on options
      const patternsToApply = [
        ...this.sensitivePatterns,
        ...(options?.includeDollarAmounts ? this.dollarAmountPatterns : []),
      ];

      // Apply each sensitive pattern
      patternsToApply.forEach((pattern) => {
        tokenizedText = tokenizedText.replace(pattern, (match) => {
          const tokenId = `${this.tokenPrefix}${tokenCounter
            .toString()
            .padStart(4, "0")}`;
          tokens.set(tokenId, match);
          tokenCounter++;
          return tokenId;
        });
      });

      logger.debug("Data tokenization completed", {
        originalLength: text.length,
        tokenizedLength: tokenizedText.length,
        tokensCreated: tokens.size,
      });

      return {
        originalText: text,
        tokenizedText,
        tokens,
      };
    } catch (error) {
      logger.error("Error during data tokenization", { error });
      throw new Error("Failed to tokenize sensitive data");
    }
  }

  /**
   * Restores original sensitive data from tokens
   */
  public detokenizeData(
    tokenizedText: string,
    tokens: Map<string, string>
  ): string {
    let restoredText = tokenizedText;

    try {
      tokens.forEach((originalValue, tokenId) => {
        restoredText = restoredText.replace(
          new RegExp(tokenId, "g"),
          originalValue
        );
      });

      logger.debug("Data detokenization completed", {
        tokensRestored: tokens.size,
      });

      return restoredText;
    } catch (error) {
      logger.error("Error during data detokenization", { error });
      throw new Error("Failed to restore tokenized data");
    }
  }

  /**
   * Encrypts sensitive data for storage
   */
  public encrypt(text: string): EncryptionResult {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      return {
        encrypted,
        iv: iv.toString("hex"),
      };
    } catch (error) {
      logger.error("Encryption failed", { error });
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypts data from storage
   */
  public decrypt(encrypted: string, ivHex: string): string {
    try {
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      logger.error("Decryption failed", { error });
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Generates a secure token for session management
   */
  public generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Validates if text contains potentially sensitive data
   */
  public containsSensitiveData(text: string): boolean {
    return this.sensitivePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Sanitizes text by removing or masking sensitive patterns
   */
  public sanitizeForLogging(text: string): string {
    let sanitized = text;

    this.sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    });

    return sanitized;
  }
}

// Export singleton instance with lazy initialization
let _dataEncryptionService: DataEncryptionService | null = null;

export const dataEncryptionService = {
  get instance(): DataEncryptionService {
    if (!_dataEncryptionService) {
      _dataEncryptionService = new DataEncryptionService();
    }
    return _dataEncryptionService;
  },

  // Delegate all methods to the instance
  tokenizeSensitiveData: (
    text: string,
    options?: { includeDollarAmounts?: boolean }
  ) => dataEncryptionService.instance.tokenizeSensitiveData(text, options),
  detokenizeData: (tokenizedText: string, tokens: Map<string, string>) =>
    dataEncryptionService.instance.detokenizeData(tokenizedText, tokens),
  encrypt: (text: string) => dataEncryptionService.instance.encrypt(text),
  decrypt: (encrypted: string, ivHex: string) =>
    dataEncryptionService.instance.decrypt(encrypted, ivHex),
  generateSecureToken: () =>
    dataEncryptionService.instance.generateSecureToken(),
  containsSensitiveData: (text: string) =>
    dataEncryptionService.instance.containsSensitiveData(text),
  sanitizeForLogging: (text: string) =>
    dataEncryptionService.instance.sanitizeForLogging(text),
};
