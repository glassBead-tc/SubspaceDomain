/**
 * Log levels
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
/**
 * Logger
 * Provides structured logging capabilities
 */
export class Logger {
    constructor(options = {}) {
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
    debug(message, ...args) {
        this.log(LogLevel.DEBUG, message, ...args);
    }
    /**
     * Log an info message
     */
    info(message, ...args) {
        this.log(LogLevel.INFO, message, ...args);
    }
    /**
     * Log a warning message
     */
    warn(message, ...args) {
        this.log(LogLevel.WARN, message, ...args);
    }
    /**
     * Log an error message
     */
    error(message, ...args) {
        if (message instanceof Error) {
            this.log(LogLevel.ERROR, message.message, ...args, { stack: message.stack });
        }
        else {
            this.log(LogLevel.ERROR, message, ...args);
        }
    }
    /**
     * Log a message with the specified level
     */
    log(level, message, ...args) {
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
    formatMessage(level, message) {
        const parts = [];
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
    logToConsole(level, message, ...args) {
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
    getLevelString(level) {
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
    child(prefix) {
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
    setLevel(level) {
        this.options.level = level;
    }
    /**
     * Get current log level
     */
    getLevel() {
        return this.options.level;
    }
    /**
     * Check if a level is enabled
     */
    isLevelEnabled(level) {
        return level >= this.options.level;
    }
}
// Create default logger
export const logger = new Logger();
//# sourceMappingURL=logger.js.map