import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { ClientManager } from '../../src/identity/client.js';
import { UserManager } from '../../src/identity/user.js';
import { PersistentStorage } from '../../src/storage/persistentStorage.js';
import { IdentityError, IdentityErrorType } from '../../src/identity/types.js';
import { defaultProvider as machineIdProvider } from '../../src/identity/platform/index.js';

describe('ClientManager', () => {
  let tempDir: string;
  let storage: PersistentStorage;
  let userManager: UserManager;
  let clientManager: ClientManager;
  let userId: string;
  let machineId: string;

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

    // Create managers
    userManager = new UserManager({
      storage,
      userDataPath: join(tempDir, 'users')
    });

    clientManager = new ClientManager({
      storage,
      userManager,
      clientDataPath: join(tempDir, 'clients')
    });

    // Create test user and get machine ID
    machineId = await machineIdProvider.getId();
    const user = await userManager.createUser(machineId);
    userId = user.id;
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('createClient', () => {
    it('should create client with machine ID', async () => {
      const client = await clientManager.createClient(userId, 'claude', machineId);

      expect(client).toBeDefined();
      expect(client.id).toMatch(/^claude-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-\d+$/);
      expect(client.components.userId).toBe(userId);
      expect(client.components.machineId).toBe(machineId);
      expect(client.components.clientType).toBe('claude');
      expect(client.components.instance).toBe(0);
      expect(client.created).toBeInstanceOf(Date);
      expect(client.lastSeen).toBeInstanceOf(Date);
      expect(client.sessions).toHaveLength(0);
    });

    it('should create client without machine ID', async () => {
      const client = await clientManager.createClient(userId, 'cline');

      expect(client).toBeDefined();
      expect(client.id).toMatch(/^cline-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-\d+$/);
      expect(client.components.userId).toBe(userId);
      expect(machineIdProvider.validate(client.components.machineId)).toBe(true);
    });

    it('should increment instance number', async () => {
      const first = await clientManager.createClient(userId, 'claude');
      const second = await clientManager.createClient(userId, 'claude');

      expect(first.components.instance).toBe(0);
      expect(second.components.instance).toBe(1);
    });

    it('should fail with invalid user', async () => {
      await expect(clientManager.createClient('invalid', 'claude'))
        .rejects
        .toThrow(IdentityErrorType.USER_NOT_FOUND);
    });

    it('should fail with unauthorized machine', async () => {
      await expect(clientManager.createClient(userId, 'claude', 'unauthorized'))
        .rejects
        .toThrow(IdentityErrorType.CLIENT_INVALID);
    });
  });

  describe('getClient', () => {
    it('should get existing client', async () => {
      const created = await clientManager.createClient(userId, 'claude');
      const retrieved = await clientManager.getClient(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should fail for non-existent client', async () => {
      await expect(clientManager.getClient('non-existent'))
        .rejects
        .toThrow(IdentityErrorType.CLIENT_NOT_FOUND);
    });
  });

  describe('getClientsByUser', () => {
    it('should get all user clients', async () => {
      const claude = await clientManager.createClient(userId, 'claude');
      const cline = await clientManager.createClient(userId, 'cline');
      const clients = await clientManager.getClientsByUser(userId);

      expect(clients).toHaveLength(2);
      expect(clients).toContainEqual(claude);
      expect(clients).toContainEqual(cline);
    });

    it('should return empty array for user with no clients', async () => {
      const newUser = await userManager.createUser();
      const clients = await clientManager.getClientsByUser(newUser.id);

      expect(clients).toHaveLength(0);
    });

    it('should fail for non-existent user', async () => {
      await expect(clientManager.getClientsByUser('non-existent'))
        .rejects
        .toThrow(IdentityErrorType.USER_NOT_FOUND);
    });
  });

  describe('updateClient', () => {
    it('should update client sessions', async () => {
      const client = await clientManager.createClient(userId, 'claude');
      const updated = await clientManager.updateClient(client.id, {
        sessions: ['test-session']
      });

      expect(updated.sessions).toContain('test-session');
      expect(updated.lastSeen).not.toEqual(client.lastSeen);
    });

    it('should fail with invalid updates', async () => {
      const client = await clientManager.createClient(userId, 'claude');
      await expect(clientManager.updateClient(client.id, {
        components: {
          ...client.components,
          clientType: 'invalid' as any
        }
      }))
        .rejects
        .toThrow(IdentityErrorType.CLIENT_INVALID);
    });
  });

  describe('deleteClient', () => {
    it('should delete existing client', async () => {
      const client = await clientManager.createClient(userId, 'claude');
      await clientManager.deleteClient(client.id);

      await expect(clientManager.getClient(client.id))
        .rejects
        .toThrow(IdentityErrorType.CLIENT_NOT_FOUND);
    });

    it('should fail for non-existent client', async () => {
      await expect(clientManager.deleteClient('non-existent'))
        .rejects
        .toThrow(IdentityErrorType.CLIENT_NOT_FOUND);
    });
  });

  describe('validation', () => {
    it('should validate client ID format', async () => {
      const clientManager = new ClientManager({
        storage,
        userManager,
        clientDataPath: join(tempDir, 'clients'),
        validationRules: {
          clientId: {
            pattern: /^(claude|cline)-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-\d+$/
          }
        }
      });

      const client = await clientManager.createClient(userId, 'claude');
      expect(client.id).toMatch(/^claude-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-\d+$/);
    });

    it('should validate machine IDs', async () => {
      const client = await clientManager.createClient(userId, 'claude');
      expect(machineIdProvider.validate(client.components.machineId))
        .toBe(true);
    });

    it('should validate client type', async () => {
      await expect(clientManager.createClient(userId, 'invalid' as any))
        .rejects
        .toThrow(IdentityErrorType.CLIENT_INVALID);
    });
  });
});
