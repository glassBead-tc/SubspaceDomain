import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConnectionState } from '../types.js';
import { Logger } from '../utils/logger.js';
import { MacOSDirectoryManager } from '../platform/macos/directoryManager.js';
const execAsync = promisify(exec);
/**
 * Discovery events
 */
export var DiscoveryEvent;
(function (DiscoveryEvent) {
    DiscoveryEvent["CLIENT_FOUND"] = "client_found";
    DiscoveryEvent["CLIENT_LOST"] = "client_lost";
    DiscoveryEvent["SCAN_COMPLETE"] = "scan_complete";
    DiscoveryEvent["ERROR"] = "error";
})(DiscoveryEvent || (DiscoveryEvent = {}));
/**
 * Discovery method
 */
export var DiscoveryMethod;
(function (DiscoveryMethod) {
    DiscoveryMethod["SOCKET"] = "socket";
    DiscoveryMethod["PROCESS"] = "process";
    DiscoveryMethod["CONFIG"] = "config";
})(DiscoveryMethod || (DiscoveryMethod = {}));
/**
 * Discovery manager
 * Handles client discovery and tracking
 */
export class DiscoveryManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.knownClients = new Map();
        this.isScanning = false;
        this.directoryManager = new MacOSDirectoryManager();
        // Set default options
        this.options = {
            socketPath: options.socketPath || this.directoryManager.getSocketPath(),
            scanInterval: options.scanInterval || 60000, // 1 minute
            autoScan: options.autoScan !== false,
            processPatterns: {
                claude: options.processPatterns?.claude || [
                    'Claude.app',
                    'claude-desktop'
                ],
                cline: options.processPatterns?.cline || [
                    'cline',
                    'cline-desktop'
                ]
            }
        };
        this.logger = new Logger({ prefix: 'DiscoveryManager' });
    }
    /**
     * Initialize discovery manager
     */
    async initialize() {
        this.logger.info('Initializing discovery manager');
        // Start auto-scanning if enabled
        if (this.options.autoScan) {
            this.startAutoScan();
        }
        this.logger.info('Discovery manager initialized');
    }
    /**
     * Start auto-scanning for clients
     */
    startAutoScan() {
        if (this.scanInterval) {
            return;
        }
        this.logger.info(`Starting auto-scan with interval ${this.options.scanInterval}ms`);
        // Run initial scan
        this.scan().catch(error => {
            this.logger.error('Error during initial scan:', error);
        });
        // Set up interval
        this.scanInterval = setInterval(() => {
            this.scan().catch(error => {
                this.logger.error('Error during scheduled scan:', error);
            });
        }, this.options.scanInterval);
    }
    /**
     * Stop auto-scanning
     */
    stopAutoScan() {
        if (!this.scanInterval) {
            return;
        }
        this.logger.info('Stopping auto-scan');
        clearInterval(this.scanInterval);
        this.scanInterval = undefined;
    }
    /**
     * Scan for clients
     */
    async scan() {
        if (this.isScanning) {
            this.logger.debug('Scan already in progress, skipping');
            return {
                clients: Array.from(this.knownClients.values()),
                method: DiscoveryMethod.SOCKET,
                timestamp: new Date()
            };
        }
        this.isScanning = true;
        this.logger.info('Starting client scan');
        try {
            // Scan using all methods
            const socketClients = await this.scanSocketClients();
            const processClients = await this.scanProcessClients();
            // Combine results
            const allClients = [...socketClients, ...processClients];
            // Update known clients
            this.updateKnownClients(allClients);
            const result = {
                clients: allClients,
                method: DiscoveryMethod.SOCKET, // Primary method
                timestamp: new Date()
            };
            this.emit(DiscoveryEvent.SCAN_COMPLETE, result);
            this.logger.info(`Scan complete, found ${allClients.length} clients`);
            return result;
        }
        catch (error) {
            this.logger.error('Error during scan:', error);
            this.emit(DiscoveryEvent.ERROR, error);
            throw error;
        }
        finally {
            this.isScanning = false;
        }
    }
    /**
     * Scan for socket-based clients
     */
    async scanSocketClients() {
        this.logger.debug(`Scanning for socket clients at ${this.options.socketPath}`);
        // For socket-based clients, we don't actively scan
        // Clients connect to our socket and register themselves
        // This method is a placeholder for future enhancements
        return [];
    }
    /**
     * Scan for process-based clients
     */
    async scanProcessClients() {
        this.logger.debug('Scanning for process clients');
        const clients = [];
        try {
            // Scan for Claude processes
            const claudeProcesses = await this.findProcessesByPattern(this.options.processPatterns.claude);
            for (const process of claudeProcesses) {
                const clientId = `claude-${process.pid}`;
                clients.push({
                    id: clientId,
                    type: 'claude',
                    transport: 'unix-socket',
                    connected: false,
                    lastSeen: new Date(),
                    state: ConnectionState.DISCOVERED,
                    processId: process.pid
                });
            }
            // Scan for Cline processes
            const clineProcesses = await this.findProcessesByPattern(this.options.processPatterns.cline);
            for (const process of clineProcesses) {
                const clientId = `cline-${process.pid}`;
                clients.push({
                    id: clientId,
                    type: 'cline',
                    transport: 'unix-socket',
                    connected: false,
                    lastSeen: new Date(),
                    state: ConnectionState.DISCOVERED,
                    processId: process.pid
                });
            }
            this.logger.debug(`Found ${clients.length} process clients`);
            return clients;
        }
        catch (error) {
            this.logger.error('Error scanning for process clients:', error);
            return [];
        }
    }
    /**
     * Find processes by pattern
     */
    async findProcessesByPattern(patterns = []) {
        if (!patterns || patterns.length === 0) {
            return [];
        }
        try {
            // Build grep pattern
            const grepPattern = patterns.map(p => `'${p}'`).join('|');
            // Run ps command
            const { stdout } = await execAsync(`ps -eo pid,command | grep -E ${grepPattern} | grep -v grep`);
            // Parse output
            return stdout.trim().split('\n')
                .filter(line => line.trim())
                .map(line => {
                const [pidStr, ...commandParts] = line.trim().split(/\s+/);
                const command = commandParts.join(' ');
                return {
                    pid: parseInt(pidStr, 10),
                    command
                };
            });
        }
        catch (error) {
            // If grep returns non-zero exit code (no matches), return empty array
            if (error instanceof Error && 'code' in error && error.code === 1) {
                return [];
            }
            throw error;
        }
    }
    /**
     * Update known clients
     */
    updateKnownClients(clients) {
        const currentIds = new Set(clients.map(c => c.id));
        const knownIds = new Set(this.knownClients.keys());
        // Find new clients
        for (const client of clients) {
            if (!this.knownClients.has(client.id)) {
                this.logger.info(`New client found: ${client.type} (${client.id})`);
                this.knownClients.set(client.id, client);
                this.emit(DiscoveryEvent.CLIENT_FOUND, client);
            }
            else {
                // Update existing client
                const existing = this.knownClients.get(client.id);
                this.knownClients.set(client.id, {
                    ...existing,
                    lastSeen: new Date()
                });
            }
        }
        // Find lost clients
        for (const id of knownIds) {
            if (!currentIds.has(id)) {
                const client = this.knownClients.get(id);
                this.logger.info(`Client lost: ${client.type} (${client.id})`);
                this.knownClients.delete(id);
                this.emit(DiscoveryEvent.CLIENT_LOST, client);
            }
        }
    }
    /**
     * Register a client
     */
    registerClient(client) {
        this.logger.info(`Registering client: ${client.type} (${client.id})`);
        // Update or add client
        this.knownClients.set(client.id, {
            ...client,
            lastSeen: new Date()
        });
        // Emit event if it's a new client
        if (!this.knownClients.has(client.id)) {
            this.emit(DiscoveryEvent.CLIENT_FOUND, client);
        }
    }
    /**
     * Get all known clients
     */
    getClients() {
        return Array.from(this.knownClients.values());
    }
    /**
     * Get client by ID
     */
    getClient(id) {
        return this.knownClients.get(id);
    }
    /**
     * Get clients by type
     */
    getClientsByType(type) {
        return Array.from(this.knownClients.values())
            .filter(client => client.type === type);
    }
    /**
     * Dispose discovery manager
     */
    dispose() {
        this.logger.info('Disposing discovery manager');
        this.stopAutoScan();
        this.removeAllListeners();
    }
}
//# sourceMappingURL=discoveryManager.js.map