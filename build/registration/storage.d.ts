import { RegistrationRecord, RegistrationStorage } from './types.js';
import { PersistentStorage } from '../storage/persistentStorage.js';
/**
 * File storage options
 */
interface FileStorageOptions {
    storage: PersistentStorage;
    directory: string;
    retention?: {
        days: number;
        maxRecords?: number;
    };
}
/**
 * File-based registration storage
 */
export declare class FileStorage implements RegistrationStorage {
    private storage;
    private directory;
    private retentionDays;
    private maxRecords?;
    constructor(options: FileStorageOptions);
    /**
     * Initialize storage
     */
    initialize(): Promise<void>;
    /**
     * Save registration record
     */
    save(record: RegistrationRecord): Promise<void>;
    /**
     * Get registration record
     */
    get(id: string): Promise<RegistrationRecord | null>;
    /**
     * List all registration records
     */
    list(): Promise<RegistrationRecord[]>;
    /**
     * Delete registration record
     */
    delete(id: string): Promise<void>;
    /**
     * Clean up old records
     */
    cleanup(): Promise<void>;
    /**
     * Get record file path
     */
    private getRecordPath;
    /**
     * Validate record data
     */
    private validateRecord;
}
export {};
