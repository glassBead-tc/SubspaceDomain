/**
 * Log levels
 */
export declare enum LogLevel {
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
export declare class Logger {
    private options;
    constructor(options?: Partial<LoggerOptions>);
    /**
     * Log a debug message
     */
    debug(message: string, ...args: any[]): void;
    /**
     * Log an info message
     */
    info(message: string, ...args: any[]): void;
    /**
     * Log a warning message
     */
    warn(message: string, ...args: any[]): void;
    /**
     * Log an error message
     */
    error(message: string | Error, ...args: any[]): void;
    /**
     * Log a message with the specified level
     */
    private log;
    /**
     * Format a log message
     */
    private formatMessage;
    /**
     * Log to console
     */
    private logToConsole;
    /**
     * Get string representation of log level
     */
    private getLevelString;
    /**
     * Create a child logger with a different prefix
     */
    child(prefix: string): Logger;
    /**
     * Set log level
     */
    setLevel(level: LogLevel): void;
    /**
     * Get current log level
     */
    getLevel(): LogLevel;
    /**
     * Check if a level is enabled
     */
    isLevelEnabled(level: LogLevel): boolean;
}
export declare const logger: Logger;
