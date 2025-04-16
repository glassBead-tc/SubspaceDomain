import { EventEmitter } from 'events';
import { SocketClient } from './socketClient.js';
import { SocketMessage } from './socketMessage.js';
/**
 * Socket server events
 */
export declare enum SocketServerEvent {
    CLIENT_CONNECTED = "client_connected",
    CLIENT_DISCONNECTED = "client_disconnected",
    MESSAGE_RECEIVED = "message_received",
    ERROR = "error",
    CLOSE = "close"
}
/**
 * Socket server options
 */
export interface SocketServerOptions {
    socketPath: string;
    maxClients?: number;
    autoCleanup?: boolean;
}
/**
 * Unix Socket Server
 * Manages Unix domain socket connections
 */
export declare class SocketServer extends EventEmitter {
    private server;
    private clients;
    private options;
    private isRunning;
    private logger;
    constructor(options: SocketServerOptions);
    /**
     * Start the socket server
     */
    start(): Promise<void>;
    /**
     * Stop the socket server
     */
    stop(): Promise<void>;
    /**
     * Clean up socket file
     */
    private cleanup;
    /**
     * Send a message to a specific client
     */
    sendToClient(clientId: string, message: string | SocketMessage): Promise<void>;
    /**
     * Send a message to all connected clients
     */
    broadcast(message: string | SocketMessage): Promise<void>;
    /**
     * Get all connected clients
     */
    getClients(): SocketClient[];
    /**
     * Get a specific client
     */
    getClient(clientId: string): SocketClient | undefined;
    /**
     * Check if the server is running
     */
    isActive(): boolean;
    /**
     * Get the number of connected clients
     */
    getClientCount(): number;
    /**
     * Handle a new client connection
     */
    private handleConnection;
    /**
     * Handle server errors
     */
    private handleError;
}
