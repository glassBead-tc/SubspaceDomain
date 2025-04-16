import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { StorageError, StorageErrorType } from './types.js';
/**
 * Default encryption configuration
 */
const DEFAULT_CONFIG = {
    algorithm: 'aes-256-gcm',
    keySize: 32, // 256 bits
    ivSize: 16, // 128 bits
    iterations: 100000
};
export class StorageEncryption {
    constructor(storageDir, config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.keyFile = join(storageDir, '.encryption-key');
    }
    /**
     * Initialize encryption, creating or loading the key
     */
    async initialize() {
        try {
            // Try to load existing key
            this.key = await this.loadKey();
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // Generate and save new key if none exists
                this.key = await this.generateKey();
            }
            else {
                throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Failed to initialize encryption', this.keyFile, error);
            }
        }
    }
    /**
     * Encrypt data
     */
    async encrypt(data) {
        if (!this.key) {
            throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Encryption not initialized');
        }
        try {
            // Generate random IV
            const iv = randomBytes(this.config.ivSize);
            // Create cipher with auth tag support
            const cipher = createCipheriv(this.config.algorithm, this.key, iv);
            // Encrypt data
            const encrypted = Buffer.concat([
                cipher.update(data),
                cipher.final()
            ]);
            // Get auth tag
            const tag = cipher.getAuthTag();
            return {
                iv,
                data: encrypted,
                tag
            };
        }
        catch (error) {
            throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Failed to encrypt data', undefined, error);
        }
    }
    /**
     * Decrypt data
     */
    async decrypt(encrypted) {
        if (!this.key) {
            throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Encryption not initialized');
        }
        try {
            // Create decipher with auth tag support
            const decipher = createDecipheriv(this.config.algorithm, this.key, encrypted.iv);
            // Set auth tag
            decipher.setAuthTag(encrypted.tag);
            // Decrypt data
            return Buffer.concat([
                decipher.update(encrypted.data),
                decipher.final()
            ]);
        }
        catch (error) {
            throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Failed to decrypt data', undefined, error);
        }
    }
    /**
     * Generate new encryption key
     */
    async generateKey() {
        try {
            // Generate random salt
            const salt = randomBytes(this.config.ivSize);
            // Generate key using PBKDF2
            const key = pbkdf2Sync(randomBytes(this.config.keySize), salt, this.config.iterations, this.config.keySize, 'sha512');
            // Save key and salt
            await fs.writeFile(this.keyFile, Buffer.concat([salt, key]), { mode: 0o600 });
            return key;
        }
        catch (error) {
            throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Failed to generate encryption key', this.keyFile, error);
        }
    }
    /**
     * Load existing encryption key
     */
    async loadKey() {
        try {
            // Read key file
            const data = await fs.readFile(this.keyFile);
            // Extract salt and key
            const salt = data.subarray(0, this.config.ivSize);
            const key = data.subarray(this.config.ivSize);
            // Verify key size
            if (key.length !== this.config.keySize) {
                throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Invalid key size');
            }
            return key;
        }
        catch (error) {
            if (error instanceof StorageError) {
                throw error;
            }
            throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Failed to load encryption key', this.keyFile, error);
        }
    }
    /**
     * Change encryption key
     */
    async rotateKey() {
        if (!this.key) {
            throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Encryption not initialized');
        }
        try {
            // Generate new key
            const newKey = await this.generateKey();
            // Update instance key
            this.key = newKey;
        }
        catch (error) {
            throw new StorageError(StorageErrorType.ENCRYPTION_ERROR, 'Failed to rotate encryption key', this.keyFile, error);
        }
    }
    /**
     * Clean up encryption resources
     */
    async dispose() {
        this.key = undefined;
    }
}
//# sourceMappingURL=encryption.js.map