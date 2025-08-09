import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { MacOSDirectoryManager } from '../platform/macos/directoryManager.js';
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
            // Process scanning removed. Discovery relies on client registration.
            // The scan method now just reports currently known clients.
            const currentClients = Array.from(this.knownClients.values());
            // Future enhancement: Check for timed-out clients here.
            // For now, just report what's known.
            const result = {
                clients: currentClients,
                method: DiscoveryMethod.SOCKET, // Primary method is via socket registration
                timestamp: new Date()
            };
            this.emit(DiscoveryEvent.SCAN_COMPLETE, result);
            this.logger.info(`Scan complete, reported ${currentClients.length} known clients`);
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
    // NOTE: Process scanning methods (scanProcessClients, findProcessesByPattern) removed.
    // Discovery relies on clients connecting to the known socket and registering.
    // NOTE: This method is less relevant now as discovery isn't scan-based.
    // Client additions are handled by registerClient.
    // Client loss should be handled by connection manager or timeouts.
    // Keeping a simplified version for potential future use or complete removal later.
    /*
    private updateKnownClients(clients: ClientInfo[]): void {
      // ... (Original logic removed) ...
    }
    */
    /**
     * Register a client
     */
    registerClient(client) {
        this.logger.info(`Registering client: ${client.type} (${client.id})`);
        const isNew = !this.knownClients.has(client.id);
        // Update or add client
        this.knownClients.set(client.id, {
            ...client,
            lastSeen: new Date()
        });
        // Emit event if it's a new client
        if (isNew) {
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