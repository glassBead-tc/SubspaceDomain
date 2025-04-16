import { LogEntry, LogTransport, LogFormatter } from '../types.js';
/**
 * Console transport
 * Outputs logs to the console
 */
export declare class ConsoleTransport implements LogTransport {
    private formatter;
    constructor(formatter?: LogFormatter);
    log(entry: LogEntry): Promise<void>;
}
/**
 * File transport options
 */
export interface FileTransportOptions {
    path: string;
    maxSize?: number;
    maxFiles?: number;
    compress?: boolean;
    format?: 'json' | 'text';
}
/**
 * File transport
 * Outputs logs to a file with rotation support
 */
export declare class FileTransport implements LogTransport {
    private options;
    private formatter;
    private stream;
    private currentSize;
    private rotationPromise;
    constructor(options: FileTransportOptions, formatter?: LogFormatter);
    initialize(): Promise<void>;
    private rotate;
    log(entry: LogEntry): Promise<void>;
}
