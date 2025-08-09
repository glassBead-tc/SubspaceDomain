import { EventEmitter } from 'events';
import { ClientInfo } from '../types.js';
/**
 * Discovery events
 */
export declare enum DiscoveryEvent {
    CLIENT_FOUND = "client_found",
    CLIENT_LOST = "client_lost",
    SCAN_COMPLETE = "scan_complete",
    ERROR = "error"
}
/**
 * Discovery method
 */
export declare enum DiscoveryMethod {
    SOCKET = "socket",
    CONFIG = "config"
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
export declare class DiscoveryManager extends EventEmitter {
    private logger;
    private options;
    private knownClients;
    private scanInterval?;
    private isScanning;
    private directoryManager;
    constructor(options?: DiscoveryOptions);
    /**
     * Initialize discovery manager
     */
    initialize(): Promise<void>;
    /**
     * Start auto-scanning for clients
     */
    startAutoScan(): void;
    /**
     * Stop auto-scanning
     */
    stopAutoScan(): void;
    /**
     * Scan for clients
     */
    scan(): Promise<DiscoveryResult>;
    /**
     * Scan for socket-based clients
     */
    private scanSocketClients;
    /**
     * Register a client
     */
    registerClient(client: ClientInfo): void;
    /**
     * Get all known clients
     */
    getClients(): ClientInfo[];
    /**
     * Get client by ID
     */
    getClient(id: string): ClientInfo | undefined;
    /**
     * Get clients by type
     */
    getClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[];
    /**
     * Dispose discovery manager
     */
    dispose(): void;
}
