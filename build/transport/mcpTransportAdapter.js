import { Logger } from '../utils/logger.js';
/**
 * MCP Transport Adapter
 * Adapts our transport implementation to be compatible with MCP SDK
 *
 * This class implements the expected interface for MCP SDK transports
 * which includes methods like start(), close(), send(), onMessage(), and onClose()
 */
export class McpTransportAdapter {
    constructor(transport) {
        this.transport = transport;
        this.logger = new Logger({ prefix: 'McpTransportAdapter' });
        // Set up error and close handlers
        this.transport.onClose(() => {
            this.logger.debug('Transport closed');
            if (this.onclose)
                this.onclose();
        });
    }
    /**
     * Connect to the transport
     * This is called by the MCP SDK's connect method
     */
    async connect() {
        try {
            this.logger.debug('Connecting transport');
            await this.transport.connect();
        }
        catch (error) {
            this.logger.error('Transport connection error:', error);
            if (this.onerror && error instanceof Error) {
                this.onerror(error);
            }
            throw error;
        }
    }
    /**
     * Start the transport (required by MCP SDK)
     * This is called directly by Cline before connect
     */
    async start() {
        try {
            this.logger.debug('Starting transport');
            await this.transport.start();
        }
        catch (error) {
            this.logger.error('Transport start error:', error);
            if (this.onerror && error instanceof Error) {
                this.onerror(error);
            }
            throw error;
        }
    }
    /**
     * Close the transport (required by MCP SDK)
     */
    async close() {
        try {
            this.logger.debug('Closing transport');
            await this.transport.close();
        }
        catch (error) {
            this.logger.error('Transport close error:', error);
            if (this.onerror && error instanceof Error) {
                this.onerror(error);
            }
        }
    }
    /**
     * Send a message
     * Converts JSON-RPC message to string
     */
    async send(message) {
        try {
            this.logger.debug('Sending message to transport');
            await this.transport.send(JSON.stringify(message));
        }
        catch (error) {
            this.logger.error('Transport send error:', error);
            if (this.onerror && error instanceof Error) {
                this.onerror(error);
            }
            throw error;
        }
    }
    /**
     * Register message handler
     * Parses string messages to JSON-RPC
     */
    onMessage(handler) {
        this.transport.onMessage((messageStr) => {
            try {
                const message = JSON.parse(messageStr);
                handler(message);
            }
            catch (error) {
                this.logger.error('Failed to parse message:', error);
                if (this.onerror && error instanceof Error) {
                    this.onerror(error);
                }
            }
        });
    }
    /**
     * Register close handler
     */
    onClose(handler) {
        this.transport.onClose(handler);
    }
    /**
     * Get the stderr stream (required by Cline)
     * This is a no-op for Unix socket transport but needed for compatibility
     */
    get stderr() {
        return null;
    }
}
//# sourceMappingURL=mcpTransportAdapter.js.map