import { jest } from '@jest/globals';
import { StateManager } from '../src/stateManager.js';
import { Router } from '../src/router.js';
import { Message, ClientInfo, ConnectionState } from '../src/types.js';

describe('MCP Bridge Server', () => {
  let stateManager: StateManager;
  let router: Router;

  beforeEach(() => {
    stateManager = new StateManager({
      cleanupIntervalMs: 1000,
      taskExpirationMs: 5000
    });

    router = new Router({
      defaultTargetType: 'claude',
      routingRules: {
        'tools/optimize_code': {
          targetType: 'claude',
          priority: 1
        }
      }
    }, stateManager);
  });

  afterEach(() => {
    stateManager.dispose();
  });

  describe('StateManager', () => {
    it('should manage client connections', () => {
      const client: ClientInfo = {
        id: 'test-client',
        type: 'claude',
        transport: 'stdio',
        connected: true,
        lastSeen: new Date(),
        state: ConnectionState.CONNECTED
      };

      stateManager.registerClient(client);
      const clients = stateManager.getConnectedClientsByType('claude');
      
      expect(clients).toHaveLength(1);
      expect(clients[0].id).toBe('test-client');
    });

    it('should track task state', () => {
      const taskId = 'test-task';
      const task = stateManager.createTask(taskId, 'test-client', 3);

      expect(task.id).toBe(taskId);
      expect(task.status).toBe('pending');
      expect(task.attempts).toBe(0);

      const updatedTask = stateManager.incrementTaskAttempts(taskId);
      expect(updatedTask?.attempts).toBe(1);
    });
  });

  describe('Router', () => {
    it('should route messages based on rules', async () => {
      // Register a test client
      const clientId = 'claude-1';
      stateManager.registerClient({
        id: clientId,
        type: 'claude',
        transport: 'stdio',
        connected: true,
        lastSeen: new Date(),
        state: ConnectionState.CONNECTED
      });

      // Create a test message
      const message: Message = {
        id: 'test-message',
        type: 'request',
        method: 'tools/optimize_code',
        sourceClientId: 'test-client',
        payload: { code: 'function test() {}' },
        timestamp: new Date()
      };

      // Set up message handler
      let receivedMessage: Message | undefined;
      router.onMessage((msgClientId: string, msg: Message) => {
        receivedMessage = msg;
      });

      // Route the message
      const success = await router.routeMessage(message);

      // Verify routing
      expect(success).toBe(true);
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage?.targetClientId).toBe(clientId);
    });

    it('should handle missing target clients', async () => {
      const message: Message = {
        id: 'test-message',
        type: 'request',
        method: 'tools/optimize_code',
        sourceClientId: 'test-client',
        payload: { code: 'function test() {}' },
        timestamp: new Date()
      };

      // Set up error handler
      let receivedError: Error | undefined;
      router.onError((error: Error) => {
        receivedError = error;
      });

      // Attempt to route message with no available clients
      const success = await router.routeMessage(message);

      expect(success).toBe(false);
      expect(receivedError).toBeDefined();
      expect(receivedError?.message).toContain('No available clients');
    });
  });
});
