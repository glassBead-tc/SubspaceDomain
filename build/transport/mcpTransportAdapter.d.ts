import { UnixSocketServerTransport } from './unixSocketTransport.js';
/**
 * MCP Transport Adapter
 * Adapts our transport implementation to be compatible with MCP SDK
 *
 * This class implements the expected interface for MCP SDK transports
 * which includes methods like start(), close(), send(), onMessage(), and onClose()
 */
export declare class McpTransportAdapter {
    private transport;
    private logger;
    onerror?: (error: Error) => void;
    onclose?: () => void;
    constructor(transport: UnixSocketServerTransport);
    /**
     * Connect to the transport
     * This is called by the MCP SDK's connect method
     */
    connect(): Promise<void>;
    /**
     * Start the transport (required by MCP SDK)
     * This is called directly by Cline before connect
     */
    start(): Promise<void>;
    /**
     * Close the transport (required by MCP SDK)
     */
    close(): Promise<void>;
    /**
     * Send a message
     * Converts JSON-RPC message to string
     */
    send(message: any): Promise<void>;
    /**
     * Register message handler
     * Parses string messages to JSON-RPC
     */
    onMessage(handler: (message: any) => void): void;
    /**
     * Register close handler
     */
    onClose(handler: () => void): void;
    /**
     * Get the stderr stream (required by Cline)
     * This is a no-op for Unix socket transport but needed for compatibility
     */
    get stderr(): any;
}
