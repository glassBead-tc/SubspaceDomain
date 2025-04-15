#!/usr/bin/env node

import { BridgeServer } from './server.js';

// Default configurations
const bridgeServerConfig = {
  maxTaskAttempts: 3,
  taskTimeoutMs: 30000, // 30 seconds
  logLevel: 'info' as const
};

const routerConfig = {
  defaultTargetType: 'claude' as const,
  routingRules: {
    // Example routing rules
    'tools/optimize_code': {
      targetType: 'claude' as const,
      priority: 1
    },
    'tools/execute_command': {
      targetType: 'cline' as const,
      priority: 1
    }
  }
};

const stateManagerConfig = {
  cleanupIntervalMs: 60000, // 1 minute
  taskExpirationMs: 300000 // 5 minutes
};

async function main() {
  try {
    // Create and start the bridge server
    const server = new BridgeServer(
      bridgeServerConfig,
      routerConfig,
      stateManagerConfig
    );

    // Handle process signals
    process.on('SIGINT', async () => {
      console.error('Received SIGINT. Shutting down...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM. Shutting down...');
      await server.stop();
      process.exit(0);
    });

    // Start the server
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch(console.error);
