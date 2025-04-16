import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { ClientInfo, ConnectionState } from '../types.js';
import { Logger } from '../utils/logger.js';
import { MacOSDirectoryManager } from '../platform/macos/directoryManager.js';

/**
 * Discovery events
 */
export enum DiscoveryEvent {
  CLIENT_FOUND = 'client_found',
  CLIENT_LOST = 'client_lost',
  SCAN_COMPLETE = 'scan_complete',
  ERROR = 'error'
}

/**
 * Discovery method
 */
export enum DiscoveryMethod {
  SOCKET = 'socket',
  CONFIG = 'config'
}

/**
 * Discovery result
 */
export interface DiscoveryResult {
  clients: ClientInfo[];
  method: DiscoveryMethod;
  timestamp: Date;
}

/**
 * Discovery options
 */
export interface DiscoveryOptions {
  socketPath?: string;
  scanInterval?: number;
  autoScan?: boolean;
}

/**
 * Discovery manager
 * Handles client discovery and tracking
 */
export class DiscoveryManager extends EventEmitter {
  private logger: Logger;
  private options: Required<DiscoveryOptions>;
  private knownClients: Map<string, ClientInfo> = new Map();
  private scanInterval?: NodeJS.Timeout;
  private isScanning: boolean = false;
  private directoryManager: MacOSDirectoryManager;

  constructor(options: DiscoveryOptions = {}) {
    super();

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
  public async initialize(): Promise<void> {
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
  public startAutoScan(): void {
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
  public stopAutoScan(): void {
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
  public async scan(): Promise<DiscoveryResult> {
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

      const result: DiscoveryResult = {
        clients: currentClients,
        method: DiscoveryMethod.SOCKET, // Primary method is via socket registration
        timestamp: new Date()
      };

      this.emit(DiscoveryEvent.SCAN_COMPLETE, result);
      this.logger.info(`Scan complete, reported ${currentClients.length} known clients`);

      return result;
    } catch (error) {
      this.logger.error('Error during scan:', error);
      this.emit(DiscoveryEvent.ERROR, error);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Scan for socket-based clients
   */
  private async scanSocketClients(): Promise<ClientInfo[]> {
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
  public registerClient(client: ClientInfo): void {
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
  public getClients(): ClientInfo[] {
    return Array.from(this.knownClients.values());
  }

  /**
   * Get client by ID
   */
  public getClient(id: string): ClientInfo | undefined {
    return this.knownClients.get(id);
  }

  /**
   * Get clients by type
   */
  public getClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[] {
    return Array.from(this.knownClients.values())
      .filter(client => client.type === type);
  }

  /**
   * Dispose discovery manager
   */
  public dispose(): void {
    this.logger.info('Disposing discovery manager');
    this.stopAutoScan();
    this.removeAllListeners();
  }
}
