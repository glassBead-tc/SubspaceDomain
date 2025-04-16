import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ClientInfo, ConnectionState } from '../types.js';
import { Logger } from '../utils/logger.js';
import { MacOSDirectoryManager } from '../platform/macos/directoryManager.js';

const execAsync = promisify(exec);

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
  PROCESS = 'process',
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
  processPatterns?: {
    claude?: string[];
    cline?: string[];
  };
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
      // Scan using all methods
      const socketClients = await this.scanSocketClients();
      const processClients = await this.scanProcessClients();

      // Combine results
      const allClients = [...socketClients, ...processClients];

      // Update known clients
      this.updateKnownClients(allClients);

      const result: DiscoveryResult = {
        clients: allClients,
        method: DiscoveryMethod.SOCKET, // Primary method
        timestamp: new Date()
      };

      this.emit(DiscoveryEvent.SCAN_COMPLETE, result);
      this.logger.info(`Scan complete, found ${allClients.length} clients`);

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

  /**
   * Scan for process-based clients
   */
  private async scanProcessClients(): Promise<ClientInfo[]> {
    this.logger.debug('Scanning for process clients');

    const clients: ClientInfo[] = [];

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
    } catch (error) {
      this.logger.error('Error scanning for process clients:', error);
      return [];
    }
  }

  /**
   * Find processes by pattern
   */
  private async findProcessesByPattern(patterns: string[] = []): Promise<{ pid: number; command: string }[]> {
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
    } catch (error) {
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
  private updateKnownClients(clients: ClientInfo[]): void {
    const currentIds = new Set(clients.map(c => c.id));
    const knownIds = new Set(this.knownClients.keys());

    // Find new clients
    for (const client of clients) {
      if (!this.knownClients.has(client.id)) {
        this.logger.info(`New client found: ${client.type} (${client.id})`);
        this.knownClients.set(client.id, client);
        this.emit(DiscoveryEvent.CLIENT_FOUND, client);
      } else {
        // Update existing client
        const existing = this.knownClients.get(client.id)!;
        this.knownClients.set(client.id, {
          ...existing,
          lastSeen: new Date()
        });
      }
    }

    // Find lost clients
    for (const id of knownIds) {
      if (!currentIds.has(id)) {
        const client = this.knownClients.get(id)!;
        this.logger.info(`Client lost: ${client.type} (${client.id})`);
        this.knownClients.delete(id);
        this.emit(DiscoveryEvent.CLIENT_LOST, client);
      }
    }
  }

  /**
   * Register a client
   */
  public registerClient(client: ClientInfo): void {
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
