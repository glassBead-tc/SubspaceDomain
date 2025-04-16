/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Logger options
 */
export interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  console?: boolean;
  file?: string;
}

/**
 * Logger
 * Provides structured logging capabilities
 */
export class Logger {
  private options: LoggerOptions;
  
  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: LogLevel.INFO,
      prefix: '',
      timestamp: true,
      console: true,
      ...options
    };
  }
  
  /**
   * Log a debug message
   */
  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }
  
  /**
   * Log an info message
   */
  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }
  
  /**
   * Log an error message
   */
  public error(message: string | Error, ...args: any[]): void {
    if (message instanceof Error) {
      this.log(LogLevel.ERROR, message.message, ...args, { stack: message.stack });
    } else {
      this.log(LogLevel.ERROR, message, ...args);
    }
  }
  
  /**
   * Log a message with the specified level
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Check if level is enabled
    if (level < this.options.level) {
      return;
    }
    
    // Format message
    const formattedMessage = this.formatMessage(level, message);
    
    // Log to console
    if (this.options.console) {
      this.logToConsole(level, formattedMessage, ...args);
    }
    
    // Log to file (not implemented yet)
    if (this.options.file) {
      // TODO: Implement file logging
    }
  }
  
  /**
   * Format a log message
   */
  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];
    
    // Add timestamp
    if (this.options.timestamp) {
      parts.push(new Date().toISOString());
    }
    
    // Add level
    parts.push(this.getLevelString(level));
    
    // Add prefix
    if (this.options.prefix) {
      parts.push(`[${this.options.prefix}]`);
    }
    
    // Add message
    parts.push(message);
    
    return parts.join(' ');
  }
  
  /**
   * Log to console
   */
  private logToConsole(level: LogLevel, message: string, ...args: any[]): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message, ...args);
        break;
      case LogLevel.INFO:
        console.info(message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(message, ...args);
        break;
      case LogLevel.ERROR:
        console.error(message, ...args);
        break;
    }
  }
  
  /**
   * Get string representation of log level
   */
  private getLevelString(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '[DEBUG]';
      case LogLevel.INFO:
        return '[INFO]';
      case LogLevel.WARN:
        return '[WARN]';
      case LogLevel.ERROR:
        return '[ERROR]';
      default:
        return '[UNKNOWN]';
    }
  }
  
  /**
   * Create a child logger with a different prefix
   */
  public child(prefix: string): Logger {
    return new Logger({
      ...this.options,
      prefix: this.options.prefix
        ? `${this.options.prefix}:${prefix}`
        : prefix
    });
  }
  
  /**
   * Set log level
   */
  public setLevel(level: LogLevel): void {
    this.options.level = level;
  }
  
  /**
   * Get current log level
   */
  public getLevel(): LogLevel {
    return this.options.level;
  }
  
  /**
   * Check if a level is enabled
   */
  public isLevelEnabled(level: LogLevel): boolean {
    return level >= this.options.level;
  }
}

// Create default logger
export const logger = new Logger();
