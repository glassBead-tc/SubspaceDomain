import { EncryptionConfig, EncryptedData } from './types.js';
export declare class StorageEncryption {
    private config;
    private keyFile;
    private key?;
    constructor(storageDir: string, config?: Partial<EncryptionConfig>);
    /**
     * Initialize encryption, creating or loading the key
     */
    initialize(): Promise<void>;
    /**
     * Encrypt data
     */
    encrypt(data: Buffer): Promise<EncryptedData>;
    /**
     * Decrypt data
     */
    decrypt(encrypted: EncryptedData): Promise<Buffer>;
    /**
     * Generate new encryption key
     */
    private generateKey;
    /**
     * Load existing encryption key
     */
    private loadKey;
    /**
     * Change encryption key
     */
    rotateKey(): Promise<void>;
    /**
     * Clean up encryption resources
     */
    dispose(): Promise<void>;
}
