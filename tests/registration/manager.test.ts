import { RegistrationManager } from '../../src/registration/manager.js';
import {
  RegistrationState,
  RegistrationRequest,
  RegistrationErrorType
} from '../../src/registration/types.js';

describe('RegistrationManager', () => {
  let manager: RegistrationManager;
  const testRequest: RegistrationRequest = {
    clientType: 'test-client',
    machineId: 'test-machine',
    capabilities: {
      tools: ['test-tool'],
      resources: ['test-resource']
    },
    timestamp: new Date()
  };

  beforeEach(async () => {
    manager = new RegistrationManager({
      enabled: true,
      autoApprove: {
        enabled: false
      }
    });

    await manager.initialize();
  });

  afterEach(async () => {
    await manager.close();
  });

  describe('initialization', () => {
    it('should initialize with default config', async () => {
      const manager = new RegistrationManager({
        enabled: true
      });

      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should not initialize when disabled', async () => {
      const manager = new RegistrationManager({
        enabled: false
      });

      await manager.initialize();
      const response = await expect(manager.handleRequest(testRequest))
        .rejects
        .toThrow(RegistrationErrorType.REQUEST_INVALID);
    });
  });

  describe('registration workflow', () => {
    it('should handle registration request', async () => {
      const response = await manager.handleRequest(testRequest);

      expect(response.state).toBe(RegistrationState.PENDING);
      expect(response.registrationId).toBeDefined();
      expect(response.expiresAt).toBeInstanceOf(Date);
    });

    it('should approve registration', async () => {
      const response = await manager.handleRequest(testRequest);
      await manager.approve(response.registrationId);

      const record = await manager.getRecord(response.registrationId);
      expect(record.response.state).toBe(RegistrationState.APPROVED);
    });

    it('should reject registration', async () => {
      const response = await manager.handleRequest(testRequest);
      const message = 'Test rejection';
      await manager.reject(response.registrationId, message);

      const record = await manager.getRecord(response.registrationId);
      expect(record.response.state).toBe(RegistrationState.REJECTED);
      expect(record.response.message).toBe(message);
    });

    it('should track registration history', async () => {
      const response = await manager.handleRequest(testRequest);
      await manager.approve(response.registrationId);
      await manager.reject(response.registrationId, 'Test rejection');

      const record = await manager.getRecord(response.registrationId);
      expect(record.history).toHaveLength(3);
      expect(record.history[0].state).toBe(RegistrationState.PENDING);
      expect(record.history[1].state).toBe(RegistrationState.APPROVED);
      expect(record.history[2].state).toBe(RegistrationState.REJECTED);
    });
  });

  describe('auto-approval', () => {
    it('should auto-approve matching client type', async () => {
      const manager = new RegistrationManager({
        enabled: true,
        autoApprove: {
          enabled: true,
          rules: {
            clientTypes: ['test-client']
          }
        }
      });

      await manager.initialize();
      const response = await manager.handleRequest(testRequest);
      expect(response.state).toBe(RegistrationState.APPROVED);
    });

    it('should not auto-approve non-matching client type', async () => {
      const manager = new RegistrationManager({
        enabled: true,
        autoApprove: {
          enabled: true,
          rules: {
            clientTypes: ['other-client']
          }
        }
      });

      await manager.initialize();
      const response = await manager.handleRequest(testRequest);
      expect(response.state).toBe(RegistrationState.PENDING);
    });

    it('should check required capabilities', async () => {
      const manager = new RegistrationManager({
        enabled: true,
        autoApprove: {
          enabled: true,
          rules: {
            capabilities: {
              required: ['test-tool', 'required-tool']
            }
          }
        }
      });

      await manager.initialize();
      const response = await manager.handleRequest(testRequest);
      expect(response.state).toBe(RegistrationState.PENDING);
    });

    it('should check excluded capabilities', async () => {
      const manager = new RegistrationManager({
        enabled: true,
        autoApprove: {
          enabled: true,
          rules: {
            capabilities: {
              excluded: ['test-tool']
            }
          }
        }
      });

      await manager.initialize();
      const response = await manager.handleRequest(testRequest);
      expect(response.state).toBe(RegistrationState.PENDING);
    });
  });

  describe('hooks', () => {
    it('should call request hook', async () => {
      const onRequest = jest.fn();
      const manager = new RegistrationManager({
        enabled: true,
        hooks: [{
          onRequest
        }]
      });

      await manager.initialize();
      await manager.handleRequest(testRequest);

      expect(onRequest).toHaveBeenCalledWith(testRequest);
    });

    it('should call approve hook', async () => {
      const onApprove = jest.fn();
      const manager = new RegistrationManager({
        enabled: true,
        hooks: [{
          onApprove
        }]
      });

      await manager.initialize();
      const response = await manager.handleRequest(testRequest);
      await manager.approve(response.registrationId);

      expect(onApprove).toHaveBeenCalled();
      const record = onApprove.mock.calls[0][0];
      expect(record.response.state).toBe(RegistrationState.APPROVED);
    });

    it('should call reject hook', async () => {
      const onReject = jest.fn();
      const manager = new RegistrationManager({
        enabled: true,
        hooks: [{
          onReject
        }]
      });

      await manager.initialize();
      const response = await manager.handleRequest(testRequest);
      await manager.reject(response.registrationId, 'Test rejection');

      expect(onReject).toHaveBeenCalled();
      const record = onReject.mock.calls[0][0];
      expect(record.response.state).toBe(RegistrationState.REJECTED);
    });
  });

  describe('expiration', () => {
    it('should set expiration times', async () => {
      const pendingTimeout = 1000;
      const approvedTimeout = 2000;
      const manager = new RegistrationManager({
        enabled: true,
        expiration: {
          pendingTimeout,
          approvedTimeout
        }
      });

      await manager.initialize();

      // Check pending expiration
      const response = await manager.handleRequest(testRequest);
      const pendingExpiry = new Date(Date.now() + pendingTimeout);
      expect(response.expiresAt.getTime()).toBeCloseTo(pendingExpiry.getTime(), -2);

      // Check approved expiration
      await manager.approve(response.registrationId);
      const record = await manager.getRecord(response.registrationId);
      const approvedExpiry = new Date(Date.now() + approvedTimeout);
      expect(record.response.expiresAt.getTime()).toBeCloseTo(approvedExpiry.getTime(), -2);
    });

    it('should expire records', async () => {
      const manager = new RegistrationManager({
        enabled: true,
        expiration: {
          pendingTimeout: 100, // 100ms for testing
          approvedTimeout: 200
        }
      });

      await manager.initialize();
      const response = await manager.handleRequest(testRequest);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Trigger cleanup
      await (manager as any).cleanupExpired();

      const record = await manager.getRecord(response.registrationId);
      expect(record.response.state).toBe(RegistrationState.EXPIRED);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent record', async () => {
      await expect(manager.getRecord('non-existent'))
        .rejects
        .toThrow(RegistrationErrorType.REQUEST_NOT_FOUND);
    });

    it('should handle hook errors', async () => {
      const manager = new RegistrationManager({
        enabled: true,
        hooks: [{
          onRequest: async () => {
            throw new Error('Hook error');
          }
        }]
      });

      await manager.initialize();
      await expect(manager.handleRequest(testRequest))
        .rejects
        .toThrow(RegistrationErrorType.REQUEST_INVALID);
    });
  });
});
