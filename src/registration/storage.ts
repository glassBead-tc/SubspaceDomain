import { join } from 'path';
import { mkdir } from 'fs/promises';
import {
  RegistrationRecord,
  RegistrationStorage,
  RegistrationError,
  RegistrationErrorType
} from './types.js';
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
export class FileStorage implements RegistrationStorage {
  private storage: PersistentStorage;
  private directory: string;
  private retentionDays: number;
  private maxRecords?: number;

  constructor(options: FileStorageOptions) {
    this.storage = options.storage;
    this.directory = options.directory;
    this.retentionDays = options.retention?.days || 30;
    this.maxRecords = options.retention?.maxRecords;
  }

  /**
   * Initialize storage
   */
  public async initialize(): Promise<void> {
    try {
      // Create directory
      await mkdir(this.directory, { recursive: true });

      // Clean up old records
      await this.cleanup();
    } catch (error) {
      throw new RegistrationError(
        RegistrationErrorType.PERSISTENCE_FAILED,
        'Failed to initialize registration storage',
        error
      );
    }
  }

  /**
   * Save registration record
   */
  public async save(record: RegistrationRecord): Promise<void> {
    try {
      await this.storage.write(
        this.getRecordPath(record.id),
        record
      );

      // Check if we need to enforce max records limit
      if (this.maxRecords) {
        const records = await this.list();
        if (records.length > this.maxRecords) {
          // Sort by last updated and remove oldest
          records.sort((a, b) => 
            new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
          );

          // Delete excess records
          await Promise.all(
            records
              .slice(this.maxRecords)
              .map(r => this.delete(r.id))
          );
        }
      }
    } catch (error) {
      throw new RegistrationError(
        RegistrationErrorType.PERSISTENCE_FAILED,
        'Failed to save registration record',
        error
      );
    }
  }

  /**
   * Get registration record
   */
  public async get(id: string): Promise<RegistrationRecord | null> {
    try {
      return await this.storage.read<RegistrationRecord>(
        this.getRecordPath(id)
      );
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }
      throw new RegistrationError(
        RegistrationErrorType.PERSISTENCE_FAILED,
        'Failed to read registration record',
        error
      );
    }
  }

  /**
   * List all registration records
   */
  public async list(): Promise<RegistrationRecord[]> {
    try {
      // Get all record files
      const files = await this.storage.read<string[]>(this.directory);

      // Load each record
      const records = await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => this.storage.read<RegistrationRecord>(
            join(this.directory, file)
          ))
      );

      return records;
    } catch (error) {
      throw new RegistrationError(
        RegistrationErrorType.PERSISTENCE_FAILED,
        'Failed to list registration records',
        error
      );
    }
  }

  /**
   * Delete registration record
   */
  public async delete(id: string): Promise<void> {
    try {
      await this.storage.delete(this.getRecordPath(id));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw new RegistrationError(
          RegistrationErrorType.PERSISTENCE_FAILED,
          'Failed to delete registration record',
          error
        );
      }
    }
  }

  /**
   * Clean up old records
   */
  public async cleanup(): Promise<void> {
    try {
      // Get all records
      const records = await this.list();
      const now = new Date();

      // Delete old records
      await Promise.all(
        records
          .filter(record => {
            const age = (now.getTime() - new Date(record.lastUpdated).getTime()) / (24 * 60 * 60 * 1000);
            return age > this.retentionDays;
          })
          .map(record => this.delete(record.id))
      );
    } catch (error) {
      // Log cleanup errors but don't throw
      console.error('Registration record cleanup failed:', error);
    }
  }

  /**
   * Get record file path
   */
  private getRecordPath(id: string): string {
    return join(this.directory, `${id}.json`);
  }

  /**
   * Validate record data
   */
  private validateRecord(record: RegistrationRecord): boolean {
    // Basic structure validation
    if (!record || typeof record !== 'object') return false;
    if (!record.id || typeof record.id !== 'string') return false;
    if (!record.request || typeof record.request !== 'object') return false;
    if (!record.response || typeof record.response !== 'object') return false;
    if (!(record.created instanceof Date)) return false;
    if (!(record.lastUpdated instanceof Date)) return false;
    if (typeof record.attempts !== 'number') return false;
    if (!Array.isArray(record.history)) return false;

    // Request validation
    const request = record.request;
    if (!request.clientType || typeof request.clientType !== 'string') return false;
    if (!request.machineId || typeof request.machineId !== 'string') return false;
    if (!(request.timestamp instanceof Date)) return false;

    // Response validation
    const response = record.response;
    if (!response.registrationId || typeof response.registrationId !== 'string') return false;
    if (!response.state || typeof response.state !== 'string') return false;
    if (!(response.expiresAt instanceof Date)) return false;

    // History validation
    for (const entry of record.history) {
      if (!(entry.timestamp instanceof Date)) return false;
      if (!entry.state || typeof entry.state !== 'string') return false;
    }

    return true;
  }
}
