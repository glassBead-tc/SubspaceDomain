import { StateManager } from '../src/stateManager.js';
import { Router } from '../src/router.js';
describe('MCP Bridge Server', () => {
    let stateManager;
    let router;
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
            const client = {
                id: 'test-client',
                type: 'claude',
                transport: 'stdio',
                connected: true,
                lastSeen: new Date()
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
            stateManager.registerClient({
                id: 'claude-1',
                type: 'claude',
                transport: 'stdio',
                connected: true,
                lastSeen: new Date()
            });
            // Create a test message
            const message = {
                id: 'test-message',
                type: 'request',
                method: 'tools/optimize_code',
                sourceClientId: 'test-client',
                payload: { code: 'function test() {}' },
                timestamp: new Date()
            };
            // Set up message handler
            let routedMessage = null;
            router.onMessage((clientId, msg) => {
                routedMessage = msg;
            });
            // Route the message
            await router.routeMessage(message);
            // Verify routing
            expect(routedMessage).toBeTruthy();
            expect(routedMessage?.targetClientId).toBe('claude-1');
        });
        it('should handle missing target clients', async () => {
            const message = {
                id: 'test-message',
                type: 'request',
                method: 'tools/optimize_code',
                sourceClientId: 'test-client',
                payload: { code: 'function test() {}' },
                timestamp: new Date()
            };
            // Set up error handler
            let routingError = null;
            router.onError((error) => {
                routingError = error;
            });
            // Attempt to route message with no available clients
            const result = await router.routeMessage(message);
            expect(result).toBe(false);
            expect(routingError).toBeTruthy();
            expect(routingError?.message).toContain('No available clients');
        });
    });
});
//# sourceMappingURL=server.test.js.map