import { EncryptionConfig, EncryptedData } from './types.js';
/**
 * Encryption manager options
 */
interface EncryptionManagerOptions {
    config: EncryptionConfig;
    masterKey: string;
}
/**
 * Encryption manager
 * Handles data encryption and decryption using configured algorithms
 */
export declare class EncryptionManager {
    private config;
    private masterKey;
    private derivedKey?;
    constructor(options: EncryptionManagerOptions);
    /**
     * Initialize encryption manager
     */
    initialize(): Promise<void>;
    /**
     * Encrypt data
     */
    encrypt(data: string): Promise<EncryptedData>;
    /**
     * Decrypt data
     */
    decrypt(encrypted: EncryptedData): Promise<string>;
    /**
     * Derive key using configured KDF
     */
    private deriveKey;
    /**
     * Check if algorithm is AEAD
     */
    private isAEAD;
    /**
     * Validate encryption config
     */
    private validateConfig;
}
export {};
