/**
 * Transport interface
 * Compatible with MCP SDK Transport interface
 */
export interface Transport {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(message: string): Promise<void>;
    onMessage(handler: (message: string) => void): void;
    onClose(handler: () => void): void;
    start?: () => Promise<void>;
    close?: () => Promise<void>;
}
/**
 * Unix Socket Server Transport for MCP
 * Implements the Transport interface from MCP SDK
 */
export declare class UnixSocketServerTransport implements Transport {
    private socketServer;
    private eventEmitter;
    private isConnected;
    private logger;
    constructor(socketPath: string);
    /**
     * Connect to the transport
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the transport
     */
    disconnect(): Promise<void>;
    /**
     * Send a message to all connected clients
     */
    send(message: string): Promise<void>;
    /**
     * Register a message handler
     */
    onMessage(handler: (message: string) => void): void;
    /**
     * Register a close handler
     */
    onClose(handler: () => void): void;
    /**
     * Start the transport (required by MCP SDK)
     */
    start(): Promise<void>;
    /**
     * Close the transport (required by MCP SDK)
     */
    close(): Promise<void>;
    /**
     * Set up event handlers
     */
    private setupEventHandlers;
}
/**
 * Unix Socket Client Transport for MCP
 * Used by clients to connect to the server
 */
export declare class UnixSocketClientTransport implements Transport {
    private client;
    private socketPath;
    private eventEmitter;
    private isConnected;
    private logger;
    constructor(socketPath: string);
    /**
     * Connect to the server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the server
     */
    disconnect(): Promise<void>;
    /**
     * Send a message to the server
     */
    send(message: string): Promise<void>;
    /**
     * Register a message handler
     */
    onMessage(handler: (message: string) => void): void;
    /**
     * Register a close handler
     */
    onClose(handler: () => void): void;
    /**
     * Start the transport (required by MCP SDK)
     */
    start(): Promise<void>;
    /**
     * Close the transport (required by MCP SDK)
     */
    close(): Promise<void>;
}
