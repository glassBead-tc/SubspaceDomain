#!/usr/bin/env node
import { BridgeServer } from './server.js';
import { configManager } from './config/configManager.js';
import { MacOSDirectoryManager } from './platform/macos/directoryManager.js';
import { MacOSServiceManager, ServiceStatus } from './platform/macos/serviceManager.js';
import { parseArgs } from 'node:util';
/**
 * Parse command line arguments
 */
function parseCommandLineArgs() {
    const options = {
        'transport': { type: 'string' },
        'socket-path': { type: 'string' },
        'service': { type: 'string' },
        'exec-path': { type: 'string' },
        'help': { type: 'boolean' }
    };
    const { values } = parseArgs({ options, strict: false });
    return {
        transport: values.transport,
        socketPath: values['socket-path'],
        service: values.service,
        execPath: values['exec-path'],
        help: values.help
    };
}
/**
 * Print help message
 */
function printHelp() {
    console.log(`
MCP Bridge Server

Usage:
  mcp-bridge-server [options]

Options:
  --transport <type>     Transport type (stdio, unix-socket)
  --socket-path <path>   Unix socket path (default: /tmp/mcp-bridge.sock)
  --service <command>    Service management (install, uninstall, start, stop, status)
  --exec-path <path>     Path to executable (required for service install)
  --help                 Show this help message
`);
}
/**
 * Handle service management commands
 */
async function handleServiceCommand(command, execPath) {
    // Initialize macOS service manager
    const serviceManager = new MacOSServiceManager();
    await serviceManager.initialize();
    switch (command) {
        case 'install':
            if (!execPath) {
                console.error('Error: --exec-path is required for service installation');
                process.exit(1);
            }
            await serviceManager.install(execPath);
            console.log('Service installed successfully');
            break;
        case 'uninstall':
            await serviceManager.uninstall();
            console.log('Service uninstalled successfully');
            break;
        case 'start':
            await serviceManager.start();
            console.log('Service started successfully');
            break;
        case 'stop':
            await serviceManager.stop();
            console.log('Service stopped successfully');
            break;
        case 'status':
            const status = await serviceManager.getStatus();
            console.log(`Service status: ${status}`);
            if (status === ServiceStatus.NOT_INSTALLED) {
                console.log('Service is not installed. Use --service install to install it.');
            }
            break;
        default:
            console.error(`Unknown service command: ${command}`);
            process.exit(1);
    }
    process.exit(0);
}
async function main() {
    try {
        // Parse command line arguments
        const args = parseCommandLineArgs();
        // Show help if requested
        if (args.help) {
            printHelp();
            process.exit(0);
        }
        // Handle service management commands
        if (args.service) {
            await handleServiceCommand(args.service, args.execPath);
            return; // handleServiceCommand will exit the process
        }
        // Initialize configuration manager
        await configManager.initialize();
        // Override config with command line arguments
        if (args.transport) {
            await configManager.updateServerConfig({
                transport: {
                    type: args.transport,
                    socketPath: args.socketPath
                }
            });
        }
        // Initialize macOS directory structure if on macOS
        if (process.platform === 'darwin') {
            const directoryManager = new MacOSDirectoryManager();
            await directoryManager.initialize();
        }
        // Get configurations
        const serverConfig = configManager.getServerConfig();
        const routerConfig = configManager.getRouterConfig();
        const stateManagerConfig = configManager.getStateManagerConfig();
        // Create bridge server
        const server = new BridgeServer(serverConfig, routerConfig, stateManagerConfig);
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
        // Initialize state manager
        await server.initialize();
        // Start the server
        await server.start();
        console.log('MCP Bridge Server started successfully');
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
main().catch(console.error);
//# sourceMappingURL=index.js.map