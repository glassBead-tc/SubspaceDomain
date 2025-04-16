import { EventEmitter } from 'events';
import { ClientInfo } from '../types.js';
import { DiscoveryManager } from './discoveryManager.js';
/**
 * Connection events
 */
export declare enum ConnectionEvent {
    CLIENT_CONNECTED = "client_connected",
    CLIENT_DISCONNECTED = "client_disconnected",
    CLIENT_UPDATED = "client_updated",
    ERROR = "error"
}
/**
 * Connection manager options
 */
export interface ConnectionManagerOptions {
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}
/**
 * Connection manager
 * Handles client connections and reconnections
 */
export declare class ConnectionManager extends EventEmitter {
    private logger;
    private discoveryManager;
    private protocol;
    private options;
    private connectedClients;
    private heartbeatIntervals;
    private reconnectAttempts;
    constructor(discoveryManager: DiscoveryManager, options?: ConnectionManagerOptions);
    /**
     * Initialize connection manager
     */
    initialize(): void;
    /**
     * Handle client found event
     */
    private handleClientFound;
    /**
     * Handle client lost event
     */
    private handleClientLost;
    /**
     * Attempt to connect to a client
     */
    private attemptConnection;
    /**
     * Handle client registration
     */
    handleRegistration(message: string): ClientInfo | null;
    /**
     * Start heartbeat for a client
     */
    private startHeartbeat;
    /**
     * Stop heartbeat for a client
     */
    private stopHeartbeat;
    /**
     * Send heartbeat to a client
     */
    private sendHeartbeat;
    /**
     * Handle client disconnection
     */
    private handleDisconnection;
    /**
     * Attempt to reconnect to a client
     */
    private attemptReconnection;
    /**
     * Get all connected clients
     */
    getConnectedClients(): ClientInfo[];
    /**
     * Get connected client by ID
     */
    getConnectedClient(id: string): ClientInfo | undefined;
    /**
     * Get connected clients by type
     */
    getConnectedClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[];
    /**
     * Disconnect a client
     */
    disconnectClient(clientId: string, reason?: string): void;
    /**
     * Disconnect all clients
     */
    disconnectAllClients(reason?: string): void;
    /**
     * Dispose connection manager
     */
    dispose(): void;
}
