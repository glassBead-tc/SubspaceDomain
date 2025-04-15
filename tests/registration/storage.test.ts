import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { FileStorage } from '../../src/registration/storage.js';
import { PersistentStorage } from '../../src/storage/persistentStorage.js';
import {
  RegistrationState,
  RegistrationRecord,
  RegistrationErrorType
} from '../../src/registration/types.js';

describe('FileStorage', () => {
  let tempDir: string;
  let storage: FileStorage;
  let persistentStorage: PersistentStorage;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), 'mcp-test-'));

    // Create persistent storage
    persistentStorage = new PersistentStorage({
      directory: tempDir,
      encryption: {
        enabled: false
      }
    });

    // Create registration storage
    storage = new FileStorage({
      storage: persistentStorage,
      directory: join(tempDir, 'registrations'),
      retention: {
        days: 7,
        maxRecords: 100
      }
    });

    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should create storage directory', async () => {
      const storage = new FileStorage({
        storage: persistentStorage,
        directory: join(tempDir, 'new-registrations'),
        retention: {
          days: 7
        }
      });

      await storage.initialize();
      const stats = await persistentStorage.read(join(tempDir, 'new-registrations'));
      expect(stats).toBeDefined();
    });
  });

  describe('record management', () => {
    it('should save and retrieve record', async () => {
      const record = createTestRecord();
      await storage.save(record);

      const retrieved = await storage.get(record.id);
      expect(retrieved).toEqual(record);
    });

    it('should return null for non-existent record', async () => {
      const record = await storage.get('non-existent');
      expect(record).toBeNull();
    });

    it('should list all records', async () => {
      const records = [
        createTestRecord('1'),
        createTestRecord('2'),
        createTestRecord('3')
      ];

      await Promise.all(records.map(r => storage.save(r)));

      const listed = await storage.list();
      expect(listed).toHaveLength(3);
      expect(listed).toEqual(expect.arrayContaining(records));
    });

    it('should delete record', async () => {
      const record = createTestRecord();
      await storage.save(record);

      await storage.delete(record.id);
      const retrieved = await storage.get(record.id);
      expect(retrieved).toBeNull();
    });

    it('should handle deleting non-existent record', async () => {
      await expect(storage.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('retention', () => {
    it('should enforce max records limit', async () => {
      // Create storage with small limit
      const storage = new FileStorage({
        storage: persistentStorage,
        directory: join(tempDir, 'limited'),
        retention: {
          days: 7,
          maxRecords: 2
        }
      });

      await storage.initialize();

      // Save records
      const records = [
        createTestRecord('1', new Date('2025-01-01')),
        createTestRecord('2', new Date('2025-01-02')),
        createTestRecord('3', new Date('2025-01-03'))
      ];

      for (const record of records) {
        await storage.save(record);
      }

      // Check only newest records kept
      const remaining = await storage.list();
      expect(remaining).toHaveLength(2);
      expect(remaining.map(r => r.id)).toEqual(['3', '2']);
    });

    it('should clean up old records', async () => {
      // Create old and new records
      const oldRecord = createTestRecord('old', new Date('2024-01-01'));
      const newRecord = createTestRecord('new', new Date());

      await storage.save(oldRecord);
      await storage.save(newRecord);

      // Trigger cleanup
      await storage.cleanup();

      // Check only new record remains
      const remaining = await storage.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('new');
    });
  });

  describe('error handling', () => {
    it('should handle storage read errors', async () => {
      // Create invalid storage
      const invalidStorage = new FileStorage({
        storage: persistentStorage,
        directory: '/invalid/path',
        retention: {
          days: 7
        }
      });

      await expect(invalidStorage.list())
        .rejects
        .toThrow(RegistrationErrorType.PERSISTENCE_FAILED);
    });

    it('should handle storage write errors', async () => {
      // Mock write error
      jest.spyOn(persistentStorage, 'write').mockRejectedValue(new Error('Write failed'));

      await expect(storage.save(createTestRecord()))
        .rejects
        .toThrow(RegistrationErrorType.PERSISTENCE_FAILED);
    });
  });
});

/**
 * Create test registration record
 */
function createTestRecord(
  id: string = '1',
  lastUpdated: Date = new Date()
): RegistrationRecord {
  return {
    id,
    request: {
      clientType: 'test-client',
      machineId: 'test-machine',
      capabilities: {},
      timestamp: new Date()
    },
    response: {
      registrationId: id,
      state: RegistrationState.PENDING,
      expiresAt: new Date(Date.now() + 3600000)
    },
    created: new Date(),
    lastUpdated,
    attempts: 0,
    history: [
      {
        timestamp: new Date(),
        state: RegistrationState.PENDING
      }
    ]
  };
}
