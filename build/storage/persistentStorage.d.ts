import { StorageOptions, StorageEvent } from './types.js';
export declare class PersistentStorage {
    private options;
    private encryption?;
    private eventHandlers;
    constructor(options?: Partial<StorageOptions>);
    /**
     * Get storage directory path
     */
    get directory(): string;
    /**
     * Initialize storage
     */
    initialize(): Promise<void>;
    /**
     * Read data from storage
     */
    read<T>(path: string): Promise<T>;
    /**
     * Write data to storage
     */
    write<T>(path: string, data: T): Promise<void>;
    /**
     * Update data in storage
     */
    update<T>(path: string, updater: (data: T) => T): Promise<void>;
    /**
     * Delete data from storage
     */
    delete(path: string): Promise<void>;
    /**
     * Create backup of data
     */
    private createBackup;
    /**
     * Calculate checksum for data
     */
    private calculateChecksum;
    /**
     * Validate checksum in storage data
     */
    private validateChecksum;
    /**
     * Get full path for storage item
     */
    private getFullPath;
    /**
     * Add event handler
     */
    onEvent(handler: (event: StorageEvent) => void): void;
    /**
     * Emit storage event
     */
    private emitEvent;
    /**
     * Clean up resources
     */
    dispose(): Promise<void>;
}
