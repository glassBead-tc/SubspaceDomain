import { EventEmitter } from 'events';
import { ClientInfo } from '../types.js';
import { DiscoveryManager } from './discoveryManager.js';
import { JSONRPCMessage } from '../protocols/mcpSchema.js';
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
    private options;
    private connectedClients;
    private reconnectAttempts;
    private pendingInitialize;
    constructor(discoveryManager: DiscoveryManager, options?: ConnectionManagerOptions);
    /**
     * Initialize connection manager
     */
    initialize(): void;
    /**
     * Handle client lost event
     */
    private handleClientLost;
    /**
     * Attempt to connect to a client
     */
    /**
     * Attempt to establish an MCP connection with a client (server).
     * This should be called *after* a transport layer connection (e.g., socket) is established.
     */
    private attemptConnection;
    /**
     * Handles incoming JSON-RPC messages from a connected client (server).
     * This should be called by the transport layer when a message is received.
     */
    handleIncomingMessage(clientId: string, message: JSONRPCMessage): void;
    /**
     * Handles successful JSON-RPC responses.
     */
    private handleResponse;
    /**
     * Handles JSON-RPC error responses.
     */
    private handleErrorResponse;
    /**
    * Processes the InitializeResult received from a client (server).
    */
    private handleInitializeResult;
    /**
     * Handles an incoming PingRequest (wrapped in JSONRPCRequest) from a server.
     */
    private handlePingRequest;
    /**
     * Placeholder for sending a message via the transport layer.
     * Needs to be implemented based on the actual transport mechanism.
     */
    private sendMessage;
    handleRegistration(message: string): void;
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
