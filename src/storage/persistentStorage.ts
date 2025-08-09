import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { StorageEncryption } from './encryption.js';
import {
  StorageOptions,
  StorageMetadata,
  StorageData,
  StorageError,
  StorageErrorType,
  StorageEvent,
  StorageEventType,
  ValidationResult
} from './types.js';

/**
 * Default storage options
 */
const DEFAULT_OPTIONS: StorageOptions = {
  directory: '.mcp-storage',
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm'
  },
  atomicWrites: true,
  backupEnabled: true,
  maxBackups: 5
};

export class PersistentStorage {
  private options: StorageOptions;
  private encryption?: StorageEncryption;
  private eventHandlers: ((event: StorageEvent) => void)[] = [];

  constructor(options: Partial<StorageOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get storage directory path
   */
  public get directory(): string {
    return this.options.directory;
  }

  /**
   * Initialize storage
   */
  public async initialize(): Promise<void> {
    try {
      // Create storage directory if it doesn't exist
      await fs.mkdir(this.options.directory, { recursive: true });

      // Initialize encryption if enabled
      if (this.options.encryption?.enabled) {
        this.encryption = new StorageEncryption(
          this.options.directory,
          {
            algorithm: this.options.encryption.algorithm
          }
        );
        await this.encryption.initialize();
      }

      // Emit initialization event
      this.emitEvent({
        type: StorageEventType.READ,
        path: this.options.directory,
        timestamp: new Date()
      });
    } catch (error) {
      throw new StorageError(
        StorageErrorType.PERMISSION_DENIED,
        'Failed to initialize storage',
        this.options.directory,
        error
      );
    }
  }

  /**
   * Read data from storage
   */
  public async read<T>(path: string): Promise<T> {
    const fullPath = this.getFullPath(path);

    try {
      // If path is a directory, return list of file names
      const stat = await fs.stat(fullPath).catch(() => null);
      if (stat && stat.isDirectory()) {
        const entries = await fs.readdir(fullPath);
        // Emit read event for directory
        this.emitEvent({
          type: StorageEventType.READ,
          path,
          timestamp: new Date()
        });
        return entries as unknown as T;
      }

      // Read file
      const data = await fs.readFile(fullPath);

      // Decrypt if enabled
      const decrypted = this.encryption
        ? await this.encryption.decrypt(JSON.parse(data.toString()))
        : data;

      // Parse JSON
      const parsed = JSON.parse(decrypted.toString());

      // Validate checksum
      if (!this.validateChecksum(parsed)) {
        throw new StorageError(
          StorageErrorType.CHECKSUM_MISMATCH,
          'Data corruption detected'
        );
      }

      // Emit read event
      this.emitEvent({
        type: StorageEventType.READ,
        path,
        timestamp: new Date(),
        metadata: parsed.metadata
      });

      return parsed.data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          'File not found',
          path
        );
      }
      throw new StorageError(
        StorageErrorType.INVALID_DATA,
        'Failed to read data',
        path,
        error
      );
    }
  }

  /**
   * Write data to storage
   */
  public async write<T>(path: string, data: T): Promise<void> {
    const fullPath = this.getFullPath(path);

    try {
      // Ensure parent directory exists
      const parentDir = dirname(fullPath);
      await fs.mkdir(parentDir, { recursive: true });

      // Create metadata
      const metadata: StorageMetadata = {
        version: '1.0',
        lastModified: new Date(),
        checksum: this.calculateChecksum(data)
      };

      // Prepare storage data
      const storageData: StorageData = {
        version: '1.0',
        metadata,
        data
      };

      // Convert to JSON
      const json = JSON.stringify(storageData);

      // Encrypt if enabled
      const encrypted = this.encryption
        ? JSON.stringify(await this.encryption.encrypt(Buffer.from(json)))
        : json;

      if (this.options.atomicWrites) {
        // Write to temporary file first
        const tempPath = `${fullPath}.tmp`;
        await fs.writeFile(tempPath, encrypted);

        // Rename to final path (atomic operation)
        await fs.rename(tempPath, fullPath);
      } else {
        // Write directly
        await fs.writeFile(fullPath, encrypted);
      }

      // Create backup if enabled
      if (this.options.backupEnabled) {
        await this.createBackup(path, encrypted);
      }

      // Emit write event
      this.emitEvent({
        type: StorageEventType.WRITE,
        path,
        timestamp: new Date(),
        metadata
      });
    } catch (error) {
      throw new StorageError(
        StorageErrorType.INVALID_DATA,
        'Failed to write data',
        path,
        error
      );
    }
  }

  /**
   * Update data in storage
   */
  public async update<T>(path: string, updater: (data: T) => T): Promise<void> {
    try {
      // Read current data
      const current = await this.read<T>(path);

      // Apply update
      const updated = updater(current);

      // Write back
      await this.write(path, updated);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.INVALID_DATA,
        'Failed to update data',
        path,
        error
      );
    }
  }

  /**
   * Delete data from storage
   */
  public async delete(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);

    try {
      await fs.unlink(fullPath);

      // Emit delete event
      this.emitEvent({
        type: StorageEventType.DELETE,
        path,
        timestamp: new Date()
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          'File not found',
          path
        );
      }
      throw new StorageError(
        StorageErrorType.INVALID_DATA,
        'Failed to delete data',
        path,
        error
      );
    }
  }

  /**
   * Create backup of data
   */
  private async createBackup(path: string, data: string): Promise<void> {
    if (!this.options.backupEnabled) return;

    const backupDir = join(this.options.directory, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `${path}.${timestamp}.bak`);

    try {
      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });

      // Write backup
      await fs.writeFile(backupPath, data);

      // Clean up old backups
      if (this.options.maxBackups) {
        const backups = await fs.readdir(backupDir);
        const pathBackups = backups.filter(b => b.startsWith(path));
        if (pathBackups.length > this.options.maxBackups) {
          // Sort by timestamp (oldest first)
          pathBackups.sort();
          // Delete oldest backups
          const toDelete = pathBackups.slice(0, pathBackups.length - this.options.maxBackups);
          await Promise.all(
            toDelete.map(b => fs.unlink(join(backupDir, b)))
          );
        }
      }
    } catch (error) {
      // Don't throw on backup failure, just emit error event
      this.emitEvent({
        type: StorageEventType.ERROR,
        path,
        timestamp: new Date(),
        error: 'Failed to create backup'
      });
    }
  }

  /**
   * Calculate checksum for data
   */
  private calculateChecksum(data: any): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Validate checksum in storage data
   */
  private validateChecksum(storageData: StorageData): boolean {
    const calculated = this.calculateChecksum(storageData.data);
    return calculated === storageData.metadata.checksum;
  }

  /**
   * Get full path for storage item
   */
  private getFullPath(path: string): string {
    const fullPath = join(this.options.directory, path);
    const parentDir = dirname(fullPath);

    // Ensure path is within storage directory
    if (!fullPath.startsWith(this.options.directory)) {
      throw new StorageError(
        StorageErrorType.PERMISSION_DENIED,
        'Path outside storage directory',
        path
      );
    }

    return fullPath;
  }

  /**
   * Add event handler
   */
  public onEvent(handler: (event: StorageEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit storage event
   */
  private emitEvent(event: StorageEvent): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  /**
   * Clean up resources
   */
  public async dispose(): Promise<void> {
    if (this.encryption) {
      await this.encryption.dispose();
    }
    this.eventHandlers = [];
  }
}
