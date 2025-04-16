import { LogEntry, LogFormatter } from '../types.js';
/**
 * JSON log formatter
 * Formats log entries as JSON strings
 */
export declare class JsonFormatter implements LogFormatter {
    format(entry: LogEntry): string;
}
/**
 * Text log formatter
 * Formats log entries as human-readable text
 */
export declare class TextFormatter implements LogFormatter {
    private useColors;
    private colors;
    constructor(useColors?: boolean);
    format(entry: LogEntry): string;
}
/**
 * Create formatter instance
 */
export declare function createFormatter(format?: 'json' | 'text', options?: any): LogFormatter;
