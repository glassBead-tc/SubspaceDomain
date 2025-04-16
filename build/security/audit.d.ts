import { AuditLogEntry } from './types.js';
/**
 * Audit logger options
 */
interface AuditLoggerOptions {
    enabled: boolean;
    logDirectory: string;
    retention: {
        days: number;
        maxSize?: number;
    };
    rotationInterval?: number;
}
/**
 * Audit logger
 * Handles security event logging and log rotation
 */
export declare class AuditLogger {
    private enabled;
    private logDirectory;
    private retentionDays;
    private maxSize?;
    private rotationInterval;
    private currentLogFile?;
    private currentLogPath?;
    private rotationTimer?;
    constructor(options: AuditLoggerOptions);
    /**
     * Initialize audit logger
     */
    initialize(): Promise<void>;
    /**
     * Log audit event
     */
    log(entry: AuditLogEntry): Promise<void>;
    /**
     * Close audit logger
     */
    close(): Promise<void>;
    /**
     * Start new log file
     */
    private startNewLogFile;
    /**
     * Start log rotation timer
     */
    private startRotationTimer;
    /**
     * Rotate log file
     */
    private rotateLog;
    /**
     * Clean up old log files
     */
    private cleanupOldLogs;
    /**
     * Get current log file stats
     */
    private getCurrentLogStats;
    /**
     * Get current log file path
     */
    getCurrentLogPath(): string | undefined;
    /**
     * Check if audit logging is enabled
     */
    isEnabled(): boolean;
}
export {};
