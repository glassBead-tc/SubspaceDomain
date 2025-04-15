import { join } from 'path';
import { createWriteStream, WriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import {
  AuditLogEntry,
  SecurityError,
  SecurityErrorType
} from './types.js';

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
export class AuditLogger {
  private enabled: boolean;
  private logDirectory: string;
  private retentionDays: number;
  private maxSize?: number;
  private rotationInterval: number;
  private currentLogFile?: WriteStream;
  private currentLogPath?: string;
  private rotationTimer?: NodeJS.Timeout;

  constructor(options: AuditLoggerOptions) {
    this.enabled = options.enabled;
    this.logDirectory = options.logDirectory;
    this.retentionDays = options.retention.days;
    this.maxSize = options.retention.maxSize;
    this.rotationInterval = options.rotationInterval || 24 * 60 * 60 * 1000; // Default 24 hours
  }

  /**
   * Initialize audit logger
   */
  public async initialize(): Promise<void> {
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
    } catch (error) {
      throw new SecurityError(
        SecurityErrorType.AUDIT_FAILED,
        'Failed to initialize audit logger',
        error
      );
    }
  }

  /**
   * Log audit event
   */
  public async log(entry: AuditLogEntry): Promise<void> {
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
    } catch (error) {
      throw new SecurityError(
        SecurityErrorType.AUDIT_FAILED,
        'Failed to write audit log',
        error
      );
    }
  }

  /**
   * Close audit logger
   */
  public async close(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = undefined;
    }

    if (this.currentLogFile) {
      await new Promise<void>((resolve, reject) => {
        this.currentLogFile?.end((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.currentLogFile = undefined;
    }
  }

  /**
   * Start new log file
   */
  private async startNewLogFile(): Promise<void> {
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
  private startRotationTimer(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    this.rotationTimer = setInterval(
      () => this.rotateLog(),
      this.rotationInterval
    );
  }

  /**
   * Rotate log file
   */
  private async rotateLog(): Promise<void> {
    try {
      await this.startNewLogFile();
      await this.cleanupOldLogs();
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  /**
   * Clean up old log files
   */
  private async cleanupOldLogs(): Promise<void> {
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
    } catch (error) {
      console.error('Log cleanup failed:', error);
    }
  }

  /**
   * Get current log file stats
   */
  private async getCurrentLogStats(): Promise<{ size: number } | null> {
    if (!this.currentLogPath) {
      return null;
    }

    try {
      const { stat } = await import('fs/promises');
      return await stat(this.currentLogPath);
    } catch (error) {
      console.error('Failed to get log stats:', error);
      return null;
    }
  }

  /**
   * Get current log file path
   */
  public getCurrentLogPath(): string | undefined {
    return this.currentLogPath;
  }

  /**
   * Check if audit logging is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
}
