import { Socket } from 'net';
import { EventEmitter } from 'events';
/**
 * Socket client events
 */
export declare enum SocketClientEvent {
    MESSAGE = "message",
    DISCONNECT = "disconnect",
    ERROR = "error"
}
/**
 * Socket client options
 */
export interface SocketClientOptions {
    bufferSize?: number;
    delimiter?: string;
    encoding?: BufferEncoding;
}
/**
 * Socket client
 * Represents a connected client to the socket server
 */
export declare class SocketClient extends EventEmitter {
    private socket;
    private id;
    private buffer;
    private options;
    private isConnected;
    private lastActivity;
    private logger;
    constructor(socket: Socket, options?: SocketClientOptions);
    /**
     * Get client ID
     */
    getId(): string;
    /**
     * Get client address
     */
    getAddress(): string;
    /**
     * Check if client is connected
     */
    isActive(): boolean;
    /**
     * Get last activity time
     */
    getLastActivity(): Date;
    /**
     * Send a message to the client
     */
    send(message: string): Promise<void>;
    /**
     * Disconnect the client
     */
    disconnect(): void;
    /**
     * Set up socket event handlers
     */
    private setupSocketHandlers;
    /**
     * Handle incoming data
     */
    private handleData;
}
