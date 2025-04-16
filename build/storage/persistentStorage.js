import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { StorageEncryption } from './encryption.js';
import { StorageError, StorageErrorType, StorageEventType } from './types.js';
/**
 * Default storage options
 */
const DEFAULT_OPTIONS = {
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
    constructor(options = {}) {
        this.eventHandlers = [];
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Get storage directory path
     */
    get directory() {
        return this.options.directory;
    }
    /**
     * Initialize storage
     */
    async initialize() {
        try {
            // Create storage directory if it doesn't exist
            await fs.mkdir(this.options.directory, { recursive: true });
            // Initialize encryption if enabled
            if (this.options.encryption?.enabled) {
                this.encryption = new StorageEncryption(this.options.directory, {
                    algorithm: this.options.encryption.algorithm
                });
                await this.encryption.initialize();
            }
            // Emit initialization event
            this.emitEvent({
                type: StorageEventType.READ,
                path: this.options.directory,
                timestamp: new Date()
            });
        }
        catch (error) {
            throw new StorageError(StorageErrorType.PERMISSION_DENIED, 'Failed to initialize storage', this.options.directory, error);
        }
    }
    /**
     * Read data from storage
     */
    async read(path) {
        const fullPath = this.getFullPath(path);
        try {
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
                throw new StorageError(StorageErrorType.CHECKSUM_MISMATCH, 'Data corruption detected');
            }
            // Emit read event
            this.emitEvent({
                type: StorageEventType.READ,
                path,
                timestamp: new Date(),
                metadata: parsed.metadata
            });
            return parsed.data;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new StorageError(StorageErrorType.FILE_NOT_FOUND, 'File not found', path);
            }
            throw new StorageError(StorageErrorType.INVALID_DATA, 'Failed to read data', path, error);
        }
    }
    /**
     * Write data to storage
     */
    async write(path, data) {
        const fullPath = this.getFullPath(path);
        try {
            // Create metadata
            const metadata = {
                version: '1.0',
                lastModified: new Date(),
                checksum: this.calculateChecksum(data)
            };
            // Prepare storage data
            const storageData = {
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
            }
            else {
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
        }
        catch (error) {
            throw new StorageError(StorageErrorType.INVALID_DATA, 'Failed to write data', path, error);
        }
    }
    /**
     * Update data in storage
     */
    async update(path, updater) {
        try {
            // Read current data
            const current = await this.read(path);
            // Apply update
            const updated = updater(current);
            // Write back
            await this.write(path, updated);
        }
        catch (error) {
            if (error instanceof StorageError) {
                throw error;
            }
            throw new StorageError(StorageErrorType.INVALID_DATA, 'Failed to update data', path, error);
        }
    }
    /**
     * Delete data from storage
     */
    async delete(path) {
        const fullPath = this.getFullPath(path);
        try {
            await fs.unlink(fullPath);
            // Emit delete event
            this.emitEvent({
                type: StorageEventType.DELETE,
                path,
                timestamp: new Date()
            });
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new StorageError(StorageErrorType.FILE_NOT_FOUND, 'File not found', path);
            }
            throw new StorageError(StorageErrorType.INVALID_DATA, 'Failed to delete data', path, error);
        }
    }
    /**
     * Create backup of data
     */
    async createBackup(path, data) {
        if (!this.options.backupEnabled)
            return;
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
                    await Promise.all(toDelete.map(b => fs.unlink(join(backupDir, b))));
                }
            }
        }
        catch (error) {
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
    calculateChecksum(data) {
        return createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }
    /**
     * Validate checksum in storage data
     */
    validateChecksum(storageData) {
        const calculated = this.calculateChecksum(storageData.data);
        return calculated === storageData.metadata.checksum;
    }
    /**
     * Get full path for storage item
     */
    getFullPath(path) {
        const fullPath = join(this.options.directory, path);
        const parentDir = dirname(fullPath);
        // Ensure path is within storage directory
        if (!fullPath.startsWith(this.options.directory)) {
            throw new StorageError(StorageErrorType.PERMISSION_DENIED, 'Path outside storage directory', path);
        }
        return fullPath;
    }
    /**
     * Add event handler
     */
    onEvent(handler) {
        this.eventHandlers.push(handler);
    }
    /**
     * Emit storage event
     */
    emitEvent(event) {
        this.eventHandlers.forEach(handler => handler(event));
    }
    /**
     * Clean up resources
     */
    async dispose() {
        if (this.encryption) {
            await this.encryption.dispose();
        }
        this.eventHandlers = [];
    }
}
//# sourceMappingURL=persistentStorage.js.map