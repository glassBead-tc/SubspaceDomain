/**
 * JSON log formatter
 * Formats log entries as JSON strings
 */
export class JsonFormatter {
    format(entry) {
        const formatted = {
            level: entry.level,
            message: entry.message,
            timestamp: entry.timestamp.toISOString(),
            ...entry.context
        };
        if (entry.error) {
            formatted.error = {
                name: entry.error.name,
                message: entry.error.message,
                stack: entry.error.stack
            };
        }
        return JSON.stringify(formatted);
    }
}
/**
 * Text log formatter
 * Formats log entries as human-readable text
 */
export class TextFormatter {
    constructor(useColors = true) {
        this.useColors = useColors;
        this.colors = {
            debug: '\x1b[36m', // cyan
            info: '\x1b[32m', // green
            warn: '\x1b[33m', // yellow
            error: '\x1b[31m', // red
            reset: '\x1b[0m' // reset
        };
    }
    format(entry) {
        // Format timestamp
        const timestamp = entry.timestamp.toISOString();
        // Format level
        let level = entry.level.toUpperCase().padEnd(5);
        if (this.useColors) {
            level = this.colors[entry.level] + level + this.colors.reset;
        }
        // Format context
        let context = '';
        if (entry.context) {
            const contextParts = [];
            for (const [key, value] of Object.entries(entry.context)) {
                if (value !== undefined) {
                    contextParts.push(`${key}=${value}`);
                }
            }
            if (contextParts.length > 0) {
                context = ` [${contextParts.join(' ')}]`;
            }
        }
        // Format message
        let message = entry.message;
        // Format error
        let error = '';
        if (entry.error) {
            error = `\n${entry.error.stack || entry.error.message}`;
        }
        // Combine all parts
        return `${timestamp} ${level}${context} ${message}${error}`;
    }
}
/**
 * Create formatter instance
 */
export function createFormatter(format = 'text', options = {}) {
    switch (format) {
        case 'json':
            return new JsonFormatter();
        case 'text':
            return new TextFormatter(options.colors);
        default:
            throw new Error(`Unsupported log format: ${format}`);
    }
}
//# sourceMappingURL=formatters.js.map