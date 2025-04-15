import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, Cipher, Decipher } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { EncryptionConfig, EncryptedData, StorageError, StorageErrorType } from './types.js';

/**
 * Default encryption configuration
 */
const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keySize: 32, // 256 bits
  ivSize: 16,  // 128 bits
  iterations: 100000
};

export class StorageEncryption {
  private config: EncryptionConfig;
  private keyFile: string;
  private key?: Buffer;

  constructor(
    storageDir: string,
    config: Partial<EncryptionConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keyFile = join(storageDir, '.encryption-key');
  }

  /**
   * Initialize encryption, creating or loading the key
   */
  public async initialize(): Promise<void> {
    try {
      // Try to load existing key
      this.key = await this.loadKey();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Generate and save new key if none exists
        this.key = await this.generateKey();
      } else {
        throw new StorageError(
          StorageErrorType.ENCRYPTION_ERROR,
          'Failed to initialize encryption',
          this.keyFile,
          error
        );
      }
    }
  }

  /**
   * Encrypt data
   */
  public async encrypt(data: Buffer): Promise<EncryptedData> {
    if (!this.key) {
      throw new StorageError(
        StorageErrorType.ENCRYPTION_ERROR,
        'Encryption not initialized'
      );
    }

    try {
      // Generate random IV
      const iv = randomBytes(this.config.ivSize);

      // Create cipher with auth tag support
      const cipher = createCipheriv(
        this.config.algorithm,
        this.key,
        iv
      ) as Cipher & {
        getAuthTag(): Buffer;
      };

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
    } catch (error) {
      throw new StorageError(
        StorageErrorType.ENCRYPTION_ERROR,
        'Failed to encrypt data',
        undefined,
        error
      );
    }
  }

  /**
   * Decrypt data
   */
  public async decrypt(encrypted: EncryptedData): Promise<Buffer> {
    if (!this.key) {
      throw new StorageError(
        StorageErrorType.ENCRYPTION_ERROR,
        'Encryption not initialized'
      );
    }

    try {
      // Create decipher with auth tag support
      const decipher = createDecipheriv(
        this.config.algorithm,
        this.key,
        encrypted.iv
      ) as Decipher & {
        setAuthTag(tag: Buffer): void;
      };

      // Set auth tag
      decipher.setAuthTag(encrypted.tag);

      // Decrypt data
      return Buffer.concat([
        decipher.update(encrypted.data),
        decipher.final()
      ]);
    } catch (error) {
      throw new StorageError(
        StorageErrorType.ENCRYPTION_ERROR,
        'Failed to decrypt data',
        undefined,
        error
      );
    }
  }

  /**
   * Generate new encryption key
   */
  private async generateKey(): Promise<Buffer> {
    try {
      // Generate random salt
      const salt = randomBytes(this.config.ivSize);

      // Generate key using PBKDF2
      const key = pbkdf2Sync(
        randomBytes(this.config.keySize),
        salt,
        this.config.iterations,
        this.config.keySize,
        'sha512'
      );

      // Save key and salt
      await fs.writeFile(
        this.keyFile,
        Buffer.concat([salt, key]),
        { mode: 0o600 }
      );

      return key;
    } catch (error) {
      throw new StorageError(
        StorageErrorType.ENCRYPTION_ERROR,
        'Failed to generate encryption key',
        this.keyFile,
        error
      );
    }
  }

  /**
   * Load existing encryption key
   */
  private async loadKey(): Promise<Buffer> {
    try {
      // Read key file
      const data = await fs.readFile(this.keyFile);

      // Extract salt and key
      const salt = data.subarray(0, this.config.ivSize);
      const key = data.subarray(this.config.ivSize);

      // Verify key size
      if (key.length !== this.config.keySize) {
        throw new StorageError(
          StorageErrorType.ENCRYPTION_ERROR,
          'Invalid key size'
        );
      }

      return key;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.ENCRYPTION_ERROR,
        'Failed to load encryption key',
        this.keyFile,
        error
      );
    }
  }

  /**
   * Change encryption key
   */
  public async rotateKey(): Promise<void> {
    if (!this.key) {
      throw new StorageError(
        StorageErrorType.ENCRYPTION_ERROR,
        'Encryption not initialized'
      );
    }

    try {
      // Generate new key
      const newKey = await this.generateKey();

      // Update instance key
      this.key = newKey;
    } catch (error) {
      throw new StorageError(
        StorageErrorType.ENCRYPTION_ERROR,
        'Failed to rotate encryption key',
        this.keyFile,
        error
      );
    }
  }

  /**
   * Clean up encryption resources
   */
  public async dispose(): Promise<void> {
    this.key = undefined;
  }
}
