#!/usr/bin/env node
import { MacOSServiceManager, ServiceStatus } from '../platform/macos/serviceManager.js';
import { MacOSDirectoryManager } from '../platform/macos/directoryManager.js';
import { parseArgs } from 'node:util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Parse command line arguments
 */
function parseCommandLineArgs() {
    const options = {
        'install': { type: 'boolean' },
        'uninstall': { type: 'boolean' },
        'start': { type: 'boolean' },
        'stop': { type: 'boolean' },
        'status': { type: 'boolean' },
        'exec-path': { type: 'string' },
        'help': { type: 'boolean' }
    };
    const { values } = parseArgs({ options, strict: false });
    return {
        install: values.install,
        uninstall: values.uninstall,
        start: values.start,
        stop: values.stop,
        status: values.status,
        execPath: values['exec-path'],
        help: values.help
    };
}
/**
 * Print help message
 */
function printHelp() {
    console.log(`
MCP Bridge Service Manager

Usage:
  mcp-service [options]

Options:
  --install            Install the service
  --uninstall          Uninstall the service
  --start              Start the service
  --stop               Stop the service
  --status             Show service status
  --exec-path <path>   Path to executable (required for install)
  --help               Show this help message
`);
}
/**
 * Main function
 */
async function main() {
    try {
        // Parse command line arguments
        const args = parseCommandLineArgs();
        // Show help if requested or no command provided
        if (args.help || (!args.install && !args.uninstall && !args.start && !args.stop && !args.status)) {
            printHelp();
            process.exit(0);
        }
        // Initialize directory manager
        const directoryManager = new MacOSDirectoryManager();
        await directoryManager.initialize();
        // Initialize service manager
        const serviceManager = new MacOSServiceManager();
        await serviceManager.initialize();
        // Handle commands
        if (args.install) {
            const execPath = args.execPath || join(dirname(dirname(__dirname)), 'build', 'index.js');
            await serviceManager.install(execPath);
            console.log(`Service installed successfully with executable: ${execPath}`);
        }
        if (args.uninstall) {
            await serviceManager.uninstall();
            console.log('Service uninstalled successfully');
        }
        if (args.start) {
            await serviceManager.start();
            console.log('Service started successfully');
        }
        if (args.stop) {
            await serviceManager.stop();
            console.log('Service stopped successfully');
        }
        if (args.status) {
            const status = await serviceManager.getStatus();
            console.log(`Service status: ${status}`);
            if (status === ServiceStatus.RUNNING) {
                console.log('Service is running');
            }
            else if (status === ServiceStatus.STOPPED) {
                console.log('Service is installed but not running');
            }
            else if (status === ServiceStatus.NOT_INSTALLED) {
                console.log('Service is not installed');
            }
            else {
                console.log('Service status is unknown');
            }
        }
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
// Run the main function
main().catch(console.error);
//# sourceMappingURL=service.js.map