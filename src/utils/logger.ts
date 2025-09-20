import winston from "winston";
import "winston-mongodb";

const { combine, timestamp, errors, json, printf } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
  }`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: "potion-ai" },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        consoleFormat
      ),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add MongoDB transport for production audit logs
if (process.env.NODE_ENV === "production" && process.env.MONGODB_URI) {
  logger.add(
    new winston.transports.MongoDB({
      db: process.env.MONGODB_URI,
      collection: "ai_service_logs",
      level: "info",
      storeHost: true,
      capped: true,
      cappedSize: 10000000, // 10MB
      cappedMax: 1000,
    })
  );
}

// Create audit logger for sensitive operations
export const auditLogger = winston.createLogger({
  level: "info",
  format: combine(timestamp(), json()),
  defaultMeta: {
    service: "potion-ai-audit",
    type: "security_audit",
  },
  transports: [
    new winston.transports.File({
      filename: "logs/audit.log",
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Add MongoDB transport for audit logs
if (process.env.MONGODB_URI) {
  auditLogger.add(
    new winston.transports.MongoDB({
      db: process.env.MONGODB_URI,
      collection: "ai_audit_logs",
      storeHost: true,
      capped: true,
      cappedSize: 50000000, // 50MB
      cappedMax: 5000,
    })
  );
}
