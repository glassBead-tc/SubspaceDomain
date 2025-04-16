import { join } from 'path';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { SecurityError, SecurityErrorType } from './types.js';
/**
 * Audit logger
 * Handles security event logging and log rotation
 */
export class AuditLogger {
    constructor(options) {
        this.enabled = options.enabled;
        this.logDirectory = options.logDirectory;
        this.retentionDays = options.retention.days;
        this.maxSize = options.retention.maxSize;
        this.rotationInterval = options.rotationInterval || 24 * 60 * 60 * 1000; // Default 24 hours
    }
    /**
     * Initialize audit logger
     */
    async initialize() {
        try {
            if (!this.enabled) {
                return;
            }
            // Create log directory
            await mkdir(this.logDirectory, { recursive: true });
            // Start new log file
            await this.startNewLogFile();
            // Start log rotation timer
            this.startRotationTimer();
            // Clean up old logs
            await this.cleanupOldLogs();
        }
        catch (error) {
            throw new SecurityError(SecurityErrorType.AUDIT_FAILED, 'Failed to initialize audit logger', error);
        }
    }
    /**
     * Log audit event
     */
    async log(entry) {
        try {
            if (!this.enabled || !this.currentLogFile) {
                return;
            }
            // Format log entry
            const formattedEntry = {
                ...entry,
                timestamp: entry.timestamp.toISOString()
            };
            // Write to log file
            this.currentLogFile.write(JSON.stringify(formattedEntry) + '\n');
            // Check file size and rotate if needed
            if (this.maxSize) {
                const stats = await this.getCurrentLogStats();
                if (stats && stats.size >= this.maxSize) {
                    await this.rotateLog();
                }
            }
        }
        catch (error) {
            throw new SecurityError(SecurityErrorType.AUDIT_FAILED, 'Failed to write audit log', error);
        }
    }
    /**
     * Close audit logger
     */
    async close() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = undefined;
        }
        if (this.currentLogFile) {
            await new Promise((resolve, reject) => {
                this.currentLogFile?.end((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            this.currentLogFile = undefined;
        }
    }
    /**
     * Start new log file
     */
    async startNewLogFile() {
        // Close current log file if exists
        if (this.currentLogFile) {
            await this.close();
        }
        // Generate new log file path
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.currentLogPath = join(this.logDirectory, `audit-${timestamp}.log`);
        // Create write stream
        this.currentLogFile = createWriteStream(this.currentLogPath, {
            flags: 'a',
            encoding: 'utf8'
        });
        // Handle stream errors
        this.currentLogFile.on('error', error => {
            console.error('Audit log write error:', error);
        });
    }
    /**
     * Start log rotation timer
     */
    startRotationTimer() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        }
        this.rotationTimer = setInterval(() => this.rotateLog(), this.rotationInterval);
    }
    /**
     * Rotate log file
     */
    async rotateLog() {
        try {
            await this.startNewLogFile();
            await this.cleanupOldLogs();
        }
        catch (error) {
            console.error('Log rotation failed:', error);
        }
    }
    /**
     * Clean up old log files
     */
    async cleanupOldLogs() {
        try {
            const { readdir, stat, unlink } = await import('fs/promises');
            // Get all log files
            const files = await readdir(this.logDirectory);
            const now = new Date();
            // Check each file
            for (const file of files) {
                if (!file.startsWith('audit-') || !file.endsWith('.log')) {
                    continue;
                }
                const filePath = join(this.logDirectory, file);
                const stats = await stat(filePath);
                const ageInDays = (now.getTime() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000);
                // Delete if older than retention period
                if (ageInDays > this.retentionDays) {
                    await unlink(filePath);
                }
            }
        }
        catch (error) {
            console.error('Log cleanup failed:', error);
        }
    }
    /**
     * Get current log file stats
     */
    async getCurrentLogStats() {
        if (!this.currentLogPath) {
            return null;
        }
        try {
            const { stat } = await import('fs/promises');
            return await stat(this.currentLogPath);
        }
        catch (error) {
            console.error('Failed to get log stats:', error);
            return null;
        }
    }
    /**
     * Get current log file path
     */
    getCurrentLogPath() {
        return this.currentLogPath;
    }
    /**
     * Check if audit logging is enabled
     */
    isEnabled() {
        return this.enabled;
    }
}
//# sourceMappingURL=audit.js.map