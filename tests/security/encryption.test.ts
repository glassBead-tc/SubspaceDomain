import { EncryptionManager } from '../../src/security/encryption.js';
import {
  EncryptionAlgorithm,
  KeyDerivationFunction,
  SecurityError,
  SecurityErrorType
} from '../../src/security/types.js';

describe('EncryptionManager', () => {
  let encryptionManager: EncryptionManager;

  beforeEach(async () => {
    encryptionManager = new EncryptionManager({
      config: {
        enabled: true,
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        keyDerivation: {
          function: KeyDerivationFunction.PBKDF2,
          iterations: 10000,
          saltLength: 32
        },
        keyLength: 32,
        ivLength: 16,
        tagLength: 16
      },
      masterKey: 'test-master-key'
    });
    await encryptionManager.initialize();
  });

  describe('initialization', () => {
    it('should initialize with valid config', async () => {
      const manager = new EncryptionManager({
        config: {
          enabled: true,
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          keyDerivation: {
            function: KeyDerivationFunction.PBKDF2,
            iterations: 10000,
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16,
          tagLength: 16
        },
        masterKey: 'test-master-key'
      });

      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should fail with invalid config', () => {
      expect(() => new EncryptionManager({
        config: {
          enabled: true,
          algorithm: 'invalid' as any,
          keyDerivation: {
            function: KeyDerivationFunction.PBKDF2,
            iterations: 10000,
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16,
          tagLength: 16
        },
        masterKey: 'test-master-key'
      })).toThrow(SecurityErrorType.INVALID_CONFIG);
    });

    it('should fail with invalid key derivation', () => {
      expect(() => new EncryptionManager({
        config: {
          enabled: true,
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          keyDerivation: {
            function: KeyDerivationFunction.PBKDF2,
            iterations: 100, // Too low
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16,
          tagLength: 16
        },
        masterKey: 'test-master-key'
      })).toThrow(SecurityErrorType.INVALID_CONFIG);
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt data', async () => {
      const data = 'test-data';
      const encrypted = await encryptionManager.encrypt(data);
      const decrypted = await encryptionManager.decrypt(encrypted);

      expect(decrypted).toBe(data);
    });

    it('should fail when encryption is disabled', async () => {
      const manager = new EncryptionManager({
        config: {
          enabled: false,
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          keyDerivation: {
            function: KeyDerivationFunction.PBKDF2,
            iterations: 10000,
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16,
          tagLength: 16
        },
        masterKey: 'test-master-key'
      });

      await expect(manager.encrypt('test'))
        .rejects
        .toThrow(SecurityErrorType.ENCRYPTION_FAILED);
    });

    it('should fail with algorithm mismatch', async () => {
      const data = 'test-data';
      const encrypted = await encryptionManager.encrypt(data);
      encrypted.algorithm = EncryptionAlgorithm.AES_256_CBC;

      await expect(encryptionManager.decrypt(encrypted))
        .rejects
        .toThrow(SecurityErrorType.DECRYPTION_FAILED);
    });

    it('should fail with tampered data', async () => {
      const data = 'test-data';
      const encrypted = await encryptionManager.encrypt(data);
      encrypted.data = encrypted.data.slice(1); // Tamper with data

      await expect(encryptionManager.decrypt(encrypted))
        .rejects
        .toThrow(SecurityErrorType.DECRYPTION_FAILED);
    });

    it('should fail with tampered tag', async () => {
      const data = 'test-data';
      const encrypted = await encryptionManager.encrypt(data);
      if (encrypted.tag) {
        encrypted.tag = Buffer.from('invalid-tag').toString('base64');
      }

      await expect(encryptionManager.decrypt(encrypted))
        .rejects
        .toThrow(SecurityErrorType.DECRYPTION_FAILED);
    });
  });

  describe('key derivation', () => {
    it('should work with PBKDF2', async () => {
      const manager = new EncryptionManager({
        config: {
          enabled: true,
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          keyDerivation: {
            function: KeyDerivationFunction.PBKDF2,
            iterations: 10000,
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16,
          tagLength: 16
        },
        masterKey: 'test-master-key'
      });

      await manager.initialize();
      const data = 'test-data';
      const encrypted = await manager.encrypt(data);
      const decrypted = await manager.decrypt(encrypted);

      expect(decrypted).toBe(data);
    });

    it('should work with scrypt', async () => {
      const manager = new EncryptionManager({
        config: {
          enabled: true,
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          keyDerivation: {
            function: KeyDerivationFunction.SCRYPT,
            iterations: 16384,
            memory: 8,
            parallelism: 1,
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16,
          tagLength: 16
        },
        masterKey: 'test-master-key'
      });

      await manager.initialize();
      const data = 'test-data';
      const encrypted = await manager.encrypt(data);
      const decrypted = await manager.decrypt(encrypted);

      expect(decrypted).toBe(data);
    });

    it('should fail with Argon2', async () => {
      expect(() => new EncryptionManager({
        config: {
          enabled: true,
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          keyDerivation: {
            function: KeyDerivationFunction.ARGON2,
            iterations: 10000,
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16,
          tagLength: 16
        },
        masterKey: 'test-master-key'
      })).toThrow(SecurityErrorType.INVALID_CONFIG);
    });
  });

  describe('algorithms', () => {
    it('should work with AES-256-GCM', async () => {
      const manager = new EncryptionManager({
        config: {
          enabled: true,
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          keyDerivation: {
            function: KeyDerivationFunction.PBKDF2,
            iterations: 10000,
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16,
          tagLength: 16
        },
        masterKey: 'test-master-key'
      });

      await manager.initialize();
      const data = 'test-data';
      const encrypted = await manager.encrypt(data);
      const decrypted = await manager.decrypt(encrypted);

      expect(decrypted).toBe(data);
      expect(encrypted.tag).toBeDefined();
    });

    it('should work with AES-256-CBC', async () => {
      const manager = new EncryptionManager({
        config: {
          enabled: true,
          algorithm: EncryptionAlgorithm.AES_256_CBC,
          keyDerivation: {
            function: KeyDerivationFunction.PBKDF2,
            iterations: 10000,
            saltLength: 32
          },
          keyLength: 32,
          ivLength: 16
        },
        masterKey: 'test-master-key'
      });

      await manager.initialize();
      const data = 'test-data';
      const encrypted = await manager.encrypt(data);
      const decrypted = await manager.decrypt(encrypted);

      expect(decrypted).toBe(data);
      expect(encrypted.tag).toBeUndefined();
    });
  });
});
