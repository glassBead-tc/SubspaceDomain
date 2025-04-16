import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { MonitoringError, MonitoringErrorType } from '../types.js';
import { createFormatter } from './formatters.js';
/**
 * Console transport
 * Outputs logs to the console
 */
export class ConsoleTransport {
    constructor(formatter = createFormatter('text', { colors: true })) {
        this.formatter = formatter;
    }
    async log(entry) {
        const formatted = this.formatter.format(entry);
        switch (entry.level) {
            case 'error':
                console.error(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'info':
                console.info(formatted);
                break;
            default:
                console.log(formatted);
        }
    }
}
/**
 * File transport
 * Outputs logs to a file with rotation support
 */
export class FileTransport {
    constructor(options, formatter = createFormatter(options.format || 'json')) {
        this.options = options;
        this.formatter = formatter;
        this.currentSize = 0;
        this.rotationPromise = null;
        this.options.maxSize = this.options.maxSize || 10 * 1024 * 1024; // 10MB
        this.options.maxFiles = this.options.maxFiles || 5;
        this.options.compress = this.options.compress !== false;
    }
    async initialize() {
        // Create directory if it doesn't exist
        await mkdir(dirname(this.options.path), { recursive: true });
        // Create write stream
        this.stream = createWriteStream(this.options.path, { flags: 'a' });
        // Handle stream errors
        this.stream.on('error', (error) => {
            throw new MonitoringError(MonitoringErrorType.TRANSPORT_ERROR, 'File transport error', error);
        });
    }
    async rotate() {
        // Implementation of rotate method...
        throw new Error('Not implemented');
    }
    async log(entry) {
        try {
            // Format entry
            const formatted = this.formatter.format(entry) + '\n';
            const size = Buffer.byteLength(formatted);
            // Check if rotation is needed
            if (this.currentSize + size > this.options.maxSize) {
                await this.rotate();
            }
            // Write to stream
            if (!this.stream.write(formatted)) {
                await new Promise((resolve) => this.stream.once('drain', () => resolve()));
            }
            this.currentSize += size;
        }
        catch (error) {
            throw new MonitoringError(MonitoringErrorType.LOG_FAILED, 'Failed to write log entry', error);
        }
    }
}
//# sourceMappingURL=transports.js.map