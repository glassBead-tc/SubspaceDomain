import { jest } from '@jest/globals';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { UserManager } from '../../src/identity/user.js';
import { PersistentStorage } from '../../src/storage/persistentStorage.js';
import { IdentityError, IdentityErrorType } from '../../src/identity/types.js';
import { defaultProvider as machineIdProvider } from '../../src/identity/platform/index.js';

// Mock machine ID provider
const mockMachineId = '00000000-0000-0000-0000-000000000000';
jest.spyOn(machineIdProvider, 'getId').mockResolvedValue(mockMachineId);
jest.spyOn(machineIdProvider, 'validate').mockImplementation((id: string) => {
  return /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(id);
});

describe('UserManager', () => {
  let tempDir: string;
  let storage: PersistentStorage;
  let userManager: UserManager;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), 'mcp-test-'));

    // Initialize storage
    storage = new PersistentStorage({
      directory: tempDir,
      encryption: {
        enabled: false
      }
    });
    await storage.initialize();

    // Create and initialize user manager
    userManager = new UserManager({
      storage,
      userDataPath: join(tempDir, 'users')
    });
    await userManager.initialize();
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('createUser', () => {
    it('should create user with machine ID', async () => {
      const machineId = mockMachineId;
      const user = await userManager.createUser(machineId);

      expect(user).toBeDefined();
      expect(user.id).toHaveLength(16);
      expect(user.machineIds).toContain(machineId);
      expect(user.created).toBeInstanceOf(Date);
      expect(user.lastSeen).toBeInstanceOf(Date);
      expect(user.sessions).toHaveLength(0);
      expect(user.preferences).toBeDefined();
      expect(user.preferences.defaultClientType).toBe('claude');
    });

    it('should create user without machine ID', async () => {
      const user = await userManager.createUser();

      expect(user).toBeDefined();
      expect(user.id).toHaveLength(16);
      expect(user.machineIds).toHaveLength(1);
      expect(machineIdProvider.validate(user.machineIds[0])).toBe(true);
    });

    it('should fail with invalid machine ID', async () => {
      await expect(userManager.createUser('invalid-id'))
        .rejects
        .toThrow(IdentityError);
    });
  });

  describe('getUser', () => {
    it('should get existing user', async () => {
      const created = await userManager.createUser();
      const retrieved = await userManager.getUser(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should fail for non-existent user', async () => {
      await expect(userManager.getUser('non-existent'))
        .rejects
        .toThrow(IdentityErrorType.USER_NOT_FOUND);
    });
  });

  describe('getUserByMachine', () => {
    it('should get user by machine ID', async () => {
      const machineId = await machineIdProvider.getId();
      const created = await userManager.createUser(machineId);
      const retrieved = await userManager.getUserByMachine(machineId);

      expect(retrieved).toEqual(created);
    });

    it('should fail for unknown machine ID', async () => {
      await expect(userManager.getUserByMachine('unknown'))
        .rejects
        .toThrow(IdentityErrorType.USER_NOT_FOUND);
    });
  });

  describe('updateUser', () => {
    it('should update user preferences', async () => {
      const user = await userManager.createUser();
      const updated = await userManager.updateUser(user.id, {
        preferences: {
          ...user.preferences,
          autoStartClients: true
        }
      });

      expect(updated.preferences.autoStartClients).toBe(true);
      expect(updated.lastSeen).not.toEqual(user.lastSeen);
    });

    it('should add machine ID', async () => {
      const user = await userManager.createUser();
      const newMachineId = 'new-machine-id';
      const updated = await userManager.updateUser(user.id, {
        machineIds: [...user.machineIds, newMachineId]
      });

      expect(updated.machineIds).toContain(newMachineId);
    });

    it('should fail with invalid updates', async () => {
      const user = await userManager.createUser();
      await expect(userManager.updateUser(user.id, {
        id: '' // Invalid ID
      }))
        .rejects
        .toThrow(IdentityErrorType.USER_INVALID);
    });
  });

  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      const user = await userManager.createUser();
      await userManager.deleteUser(user.id);

      await expect(userManager.getUser(user.id))
        .rejects
        .toThrow(IdentityErrorType.USER_NOT_FOUND);
    });

    it('should fail for non-existent user', async () => {
      await expect(userManager.deleteUser('non-existent'))
        .rejects
        .toThrow(IdentityErrorType.USER_NOT_FOUND);
    });
  });

  describe('validation', () => {
    it('should validate user ID format', async () => {
      const userManager = new UserManager({
        storage,
        userDataPath: join(tempDir, 'users'),
        validationRules: {
          userId: {
            pattern: /^[0-9a-f]{16}$/
          }
        }
      });

      const user = await userManager.createUser();
      expect(user.id).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should validate machine IDs', async () => {
      const user = await userManager.createUser();
      expect(user.machineIds.every(id => machineIdProvider.validate(id)))
        .toBe(true);
    });

    it('should validate preferences', async () => {
      const user = await userManager.createUser();
      await expect(userManager.updateUser(user.id, {
        preferences: {
          defaultClientType: 'invalid' as any
        }
      }))
        .rejects
        .toThrow(IdentityErrorType.USER_INVALID);
    });
  });
});
