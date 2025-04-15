import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { SessionManager } from '../../src/identity/session.js';
import { UserManager } from '../../src/identity/user.js';
import { ClientManager } from '../../src/identity/client.js';
import { PersistentStorage } from '../../src/storage/persistentStorage.js';
import { IdentityError, IdentityErrorType } from '../../src/identity/types.js';
import { defaultProvider as machineIdProvider } from '../../src/identity/platform/index.js';

describe('SessionManager', () => {
  let tempDir: string;
  let storage: PersistentStorage;
  let userManager: UserManager;
  let clientManager: ClientManager;
  let sessionManager: SessionManager;
  let userId: string;
  let machineId: string;
  let clientId: string;

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

    sessionManager = new SessionManager({
      storage,
      userManager,
      clientManager,
      sessionDataPath: join(tempDir, 'sessions'),
      sessionTimeout: 1000, // 1 second for testing
      maxSessionsPerUser: 2
    });

    // Create test user and client
    machineId = await machineIdProvider.getId();
    const user = await userManager.createUser(machineId);
    userId = user.id;
    const client = await clientManager.createClient(userId, 'claude', machineId);
    clientId = client.id;
  });

  afterEach(async () => {
    // Stop cleanup interval
    sessionManager.stopCleanup();

    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('createSession', () => {
    it('should create session', async () => {
      const session = await sessionManager.createSession(userId, machineId, clientId);

      expect(session).toBeDefined();
      expect(session.id).toHaveLength(32);
      expect(session.userId).toBe(userId);
      expect(session.machineId).toBe(machineId);
      expect(session.clients).toContain(clientId);
      expect(session.created).toBeInstanceOf(Date);
      expect(session.lastActive).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should enforce session limit', async () => {
      // Create max sessions
      await sessionManager.createSession(userId, machineId, clientId);
      await sessionManager.createSession(userId, machineId, clientId);

      // Try to create one more
      await expect(sessionManager.createSession(userId, machineId, clientId))
        .rejects
        .toThrow(IdentityErrorType.SESSION_INVALID);
    });

    it('should fail with invalid user', async () => {
      await expect(sessionManager.createSession('invalid', machineId, clientId))
        .rejects
        .toThrow(IdentityErrorType.USER_NOT_FOUND);
    });

    it('should fail with unauthorized machine', async () => {
      await expect(sessionManager.createSession(userId, 'unauthorized', clientId))
        .rejects
        .toThrow(IdentityErrorType.SESSION_INVALID);
    });

    it('should fail with invalid client', async () => {
      await expect(sessionManager.createSession(userId, machineId, 'invalid'))
        .rejects
        .toThrow(IdentityErrorType.CLIENT_NOT_FOUND);
    });
  });

  describe('getSession', () => {
    it('should get active session', async () => {
      const created = await sessionManager.createSession(userId, machineId, clientId);
      const retrieved = await sessionManager.getSession(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should fail for expired session', async () => {
      const session = await sessionManager.createSession(userId, machineId, clientId);

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      await expect(sessionManager.getSession(session.id))
        .rejects
        .toThrow(IdentityErrorType.SESSION_EXPIRED);
    });

    it('should fail for non-existent session', async () => {
      await expect(sessionManager.getSession('non-existent'))
        .rejects
        .toThrow(IdentityErrorType.SESSION_NOT_FOUND);
    });
  });

  describe('getSessionsByUser', () => {
    it('should get all user sessions', async () => {
      const first = await sessionManager.createSession(userId, machineId, clientId);
      const second = await sessionManager.createSession(userId, machineId, clientId);
      const sessions = await sessionManager.getSessionsByUser(userId);

      expect(sessions).toHaveLength(2);
      expect(sessions).toContainEqual(first);
      expect(sessions).toContainEqual(second);
    });

    it('should filter expired sessions', async () => {
      await sessionManager.createSession(userId, machineId, clientId);

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const sessions = await sessionManager.getSessionsByUser(userId);
      expect(sessions).toHaveLength(0);
    });

    it('should fail for non-existent user', async () => {
      await expect(sessionManager.getSessionsByUser('non-existent'))
        .rejects
        .toThrow(IdentityErrorType.USER_NOT_FOUND);
    });
  });

  describe('updateActivity', () => {
    it('should update session timestamps', async () => {
      const session = await sessionManager.createSession(userId, machineId, clientId);
      const updated = await sessionManager.updateActivity(session.id);

      expect(updated.lastActive).not.toEqual(session.lastActive);
      expect(updated.expiresAt).not.toEqual(session.expiresAt);
    });

    it('should fail for expired session', async () => {
      const session = await sessionManager.createSession(userId, machineId, clientId);

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      await expect(sessionManager.updateActivity(session.id))
        .rejects
        .toThrow(IdentityErrorType.SESSION_EXPIRED);
    });
  });

  describe('endSession', () => {
    it('should end session and update client', async () => {
      const session = await sessionManager.createSession(userId, machineId, clientId);
      await sessionManager.endSession(session.id);

      // Session should be deleted
      await expect(sessionManager.getSession(session.id))
        .rejects
        .toThrow(IdentityErrorType.SESSION_NOT_FOUND);

      // Client should be updated
      const client = await clientManager.getClient(clientId);
      expect(client.sessions).not.toContain(session.id);
    });

    it('should fail for non-existent session', async () => {
      await expect(sessionManager.endSession('non-existent'))
        .rejects
        .toThrow(IdentityErrorType.SESSION_NOT_FOUND);
    });
  });

  describe('cleanup', () => {
    it('should clean up expired sessions', async () => {
      // Create session
      const session = await sessionManager.createSession(userId, machineId, clientId);

      // Start cleanup with short interval
      sessionManager.startCleanup(100);

      // Wait for session to expire and cleanup to run
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Session should be deleted
      await expect(sessionManager.getSession(session.id))
        .rejects
        .toThrow(IdentityErrorType.SESSION_NOT_FOUND);

      // Client should be updated
      const client = await clientManager.getClient(clientId);
      expect(client.sessions).not.toContain(session.id);
    });
  });

  describe('validation', () => {
    it('should validate session ID format', async () => {
      const sessionManager = new SessionManager({
        storage,
        userManager,
        clientManager,
        sessionDataPath: join(tempDir, 'sessions'),
        validationRules: {
          sessionId: {
            pattern: /^[0-9a-f]{32}$/
          }
        }
      });

      const session = await sessionManager.createSession(userId, machineId, clientId);
      expect(session.id).toMatch(/^[0-9a-f]{32}$/);
    });
  });
});
