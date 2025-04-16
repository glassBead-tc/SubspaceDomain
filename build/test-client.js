#!/usr/bin/env node
import { BridgeServer } from './server.js';
import { ConnectionState } from './types.js';
async function main() {
    // Create server instance
    const server = new BridgeServer({
        maxTaskAttempts: 3,
        taskTimeoutMs: 30000,
        logLevel: 'info'
    }, {
        defaultTargetType: 'claude',
        routingRules: {
            'tools/optimize_code': {
                targetType: 'claude',
                priority: 1
            }
        }
    }, {
        cleanupIntervalMs: 60000,
        taskExpirationMs: 300000
    });
    // Register a test Claude client
    const claudeClient = {
        id: 'claude-test',
        type: 'claude',
        transport: 'stdio',
        connected: true,
        lastSeen: new Date(),
        state: ConnectionState.CONNECTED
    };
    server.registerClient(claudeClient);
    // Start the server
    await server.start();
    // Keep the process running
    process.stdin.resume();
    // Handle shutdown
    process.on('SIGINT', async () => {
        console.error('Shutting down...');
        await server.stop();
        process.exit(0);
    });
}
main().catch(console.error);
//# sourceMappingURL=test-client.js.map