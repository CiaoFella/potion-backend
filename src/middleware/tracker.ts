import { UserActivityTracker } from "../models/UserActivityTracker";

// Cache recent activities in memory to reduce DB queries
const recentActivities = new Map();

export const activityTracker = async (req, res, next) => {
    const tool = req?.originalUrl?.replace("/api/", "").split("/")?.[0]?.toLowerCase();
    
    if (!req?.user?.userId || ["admin"].includes(tool) || !["client", "crm", "project", "contract", "invoice", "waitlist", "transaction", "timetracker", "pay", "search", "chat"].includes(tool)) {
        return next();
    }

    const cacheKey = `${req.user.userId}:${tool}`;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    try {
        // First check in-memory cache
        if (recentActivities.has(cacheKey)) {
            const lastActivityTime = recentActivities.get(cacheKey);
            if (now - lastActivityTime < fiveMinutes) {
                return next(); // Skip saving duplicate
            }
        }

        // Fallback to database check if not in cache
        const fiveMinutesAgo = new Date(now - fiveMinutes);
        const existingActivity = await UserActivityTracker.findOne({
            user: req.user.userId,
            tool: tool,
            createdAt: { $gte: fiveMinutesAgo }
        }).select('createdAt').lean();

        if (existingActivity) {
            recentActivities.set(cacheKey, existingActivity.createdAt.getTime());
            return next();
        }

        // Log new activity
        await UserActivityTracker.create({
            user: req.user.userId,
            tool: tool,
            action: req.method,
            type: "tool_usage"
        });
        
        // Update cache
        recentActivities.set(cacheKey, now);
        
    } catch (error) {
        console.error("Activity tracking error:", error);
    }
    
    next();
};

//Clean cache periodically every 30 minutes
setInterval(() => {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    for (const [key, timestamp] of recentActivities.entries()) {
        if (now - timestamp > thirtyMinutes) {
            recentActivities.delete(key);
        }
    }
}, 30 * 60 * 1000);