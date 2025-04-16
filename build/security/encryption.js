import { createCipheriv, createDecipheriv, randomBytes, scrypt, pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { EncryptionAlgorithm, KeyDerivationFunction, SecurityError, SecurityErrorType } from './types.js';
const scryptAsync = promisify(scrypt);
const pbkdf2Async = promisify(pbkdf2);
/**
 * Encryption manager
 * Handles data encryption and decryption using configured algorithms
 */
export class EncryptionManager {
    constructor(options) {
        this.validateConfig(options.config);
        this.config = options.config;
        this.masterKey = options.masterKey;
    }
    /**
     * Initialize encryption manager
     */
    async initialize() {
        try {
            // Derive key from master key
            this.derivedKey = await this.deriveKey(this.masterKey, randomBytes(this.config.keyDerivation.saltLength || 32));
        }
        catch (error) {
            throw new SecurityError(SecurityErrorType.INVALID_KEY, 'Failed to initialize encryption manager', error);
        }
    }
    /**
     * Encrypt data
     */
    async encrypt(data) {
        try {
            if (!this.config.enabled) {
                throw new SecurityError(SecurityErrorType.ENCRYPTION_FAILED, 'Encryption is disabled');
            }
            // Generate IV and salt
            const iv = randomBytes(this.config.ivLength);
            const salt = randomBytes(this.config.keyDerivation.saltLength || 32);
            // Derive key
            const key = await this.deriveKey(this.masterKey, salt);
            // Create cipher
            // Create cipher with correct options
            let cipher;
            if (this.config.algorithm === EncryptionAlgorithm.CHACHA20_POLY1305) {
                // @ts-ignore: Node.js types don't include chacha20-poly1305 options
                cipher = createCipheriv(this.config.algorithm, key, iv, {
                    authTagLength: this.config.tagLength || 16
                });
            }
            else {
                cipher = createCipheriv(this.config.algorithm, key, iv);
            }
            // Encrypt data
            const encrypted = Buffer.concat([
                cipher.update(data, 'utf8'),
                cipher.final()
            ]);
            // Get authentication tag if using AEAD
            const tag = this.isAEAD(this.config.algorithm)
                ? cipher.getAuthTag()
                : undefined;
            // Format encrypted data
            const result = {
                algorithm: this.config.algorithm,
                iv: iv.toString('base64'),
                salt: salt.toString('base64'),
                data: encrypted.toString('base64'),
                keyDerivation: {
                    function: this.config.keyDerivation.function,
                    iterations: this.config.keyDerivation.iterations,
                    memory: this.config.keyDerivation.memory,
                    parallelism: this.config.keyDerivation.parallelism
                }
            };
            if (tag) {
                result.tag = tag.toString('base64');
            }
            return result;
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(SecurityErrorType.ENCRYPTION_FAILED, 'Failed to encrypt data', error);
        }
    }
    /**
     * Decrypt data
     */
    async decrypt(encrypted) {
        try {
            if (!this.config.enabled) {
                throw new SecurityError(SecurityErrorType.DECRYPTION_FAILED, 'Encryption is disabled');
            }
            // Validate algorithm
            if (encrypted.algorithm !== this.config.algorithm) {
                throw new SecurityError(SecurityErrorType.DECRYPTION_FAILED, 'Algorithm mismatch');
            }
            // Parse components
            const iv = Buffer.from(encrypted.iv, 'base64');
            const salt = Buffer.from(encrypted.salt, 'base64');
            const data = Buffer.from(encrypted.data, 'base64');
            const tag = encrypted.tag
                ? Buffer.from(encrypted.tag, 'base64')
                : undefined;
            // Derive key
            const key = await this.deriveKey(this.masterKey, salt);
            // Create decipher
            // Create decipher
            const decipher = createDecipheriv(encrypted.algorithm, key, iv);
            // Set auth tag if using AEAD
            if (this.isAEAD(encrypted.algorithm) && tag) {
                decipher.setAuthTag(tag);
            }
            // Decrypt data
            const decrypted = Buffer.concat([
                decipher.update(data),
                decipher.final()
            ]);
            return decrypted.toString('utf8');
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(SecurityErrorType.DECRYPTION_FAILED, 'Failed to decrypt data', error);
        }
    }
    /**
     * Derive key using configured KDF
     */
    async deriveKey(password, salt) {
        try {
            switch (this.config.keyDerivation.function) {
                case KeyDerivationFunction.PBKDF2:
                    return pbkdf2Async(password, salt, this.config.keyDerivation.iterations || 100000, this.config.keyLength, 'sha512');
                case KeyDerivationFunction.SCRYPT:
                    return scryptAsync(password, salt, this.config.keyLength);
                case KeyDerivationFunction.ARGON2:
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Argon2 is not yet supported');
                default:
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid key derivation function');
            }
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(SecurityErrorType.INVALID_KEY, 'Failed to derive key', error);
        }
    }
    /**
     * Check if algorithm is AEAD
     */
    isAEAD(algorithm) {
        return [
            EncryptionAlgorithm.AES_256_GCM,
            EncryptionAlgorithm.CHACHA20_POLY1305
        ].includes(algorithm);
    }
    /**
     * Validate encryption config
     */
    validateConfig(config) {
        if (!config) {
            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Missing encryption config');
        }
        if (!Object.values(EncryptionAlgorithm).includes(config.algorithm)) {
            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid encryption algorithm');
        }
        if (!Object.values(KeyDerivationFunction).includes(config.keyDerivation.function)) {
            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid key derivation function');
        }
        if (config.keyLength < 16 || config.keyLength > 64) {
            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid key length');
        }
        if (config.ivLength < 12 || config.ivLength > 32) {
            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid IV length');
        }
        if (this.isAEAD(config.algorithm)) {
            if (!config.tagLength || config.tagLength < 12 || config.tagLength > 32) {
                throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid tag length for AEAD algorithm');
            }
        }
        const kdf = config.keyDerivation;
        switch (kdf.function) {
            case KeyDerivationFunction.PBKDF2:
                if (!kdf.iterations || kdf.iterations < 10000) {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid PBKDF2 iterations');
                }
                break;
            case KeyDerivationFunction.SCRYPT:
                if (!kdf.iterations || kdf.iterations < 16384) {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid scrypt iterations (N)');
                }
                if (!kdf.memory || kdf.memory < 8) {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid scrypt memory (r)');
                }
                if (!kdf.parallelism || kdf.parallelism < 1) {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid scrypt parallelism (p)');
                }
                break;
            case KeyDerivationFunction.ARGON2:
                throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Argon2 is not yet supported');
        }
    }
}
//# sourceMappingURL=encryption.js.map