import { createServer } from 'net';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { SocketClient } from './socketClient.js';
import { SocketMessage } from './socketMessage.js';
import { Logger } from '../../utils/logger.js';
/**
 * Socket server events
 */
export var SocketServerEvent;
(function (SocketServerEvent) {
    SocketServerEvent["CLIENT_CONNECTED"] = "client_connected";
    SocketServerEvent["CLIENT_DISCONNECTED"] = "client_disconnected";
    SocketServerEvent["MESSAGE_RECEIVED"] = "message_received";
    SocketServerEvent["ERROR"] = "error";
    SocketServerEvent["CLOSE"] = "close";
})(SocketServerEvent || (SocketServerEvent = {}));
/**
 * Unix Socket Server
 * Manages Unix domain socket connections
 */
export class SocketServer extends EventEmitter {
    constructor(options) {
        super();
        this.clients = new Map();
        this.isRunning = false;
        this.options = {
            maxClients: 50,
            autoCleanup: true,
            ...options
        };
        // Create logger
        this.logger = new Logger({ prefix: 'SocketServer' });
        this.server = createServer();
        // Set up server event handlers
        this.server.on('connection', this.handleConnection.bind(this));
        this.server.on('error', this.handleError.bind(this));
        this.server.on('close', () => {
            this.isRunning = false;
            this.logger.info('Server closed');
            this.emit(SocketServerEvent.CLOSE);
        });
    }
    /**
     * Start the socket server
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        try {
            // Create directory if it doesn't exist
            await fs.mkdir(dirname(this.options.socketPath), { recursive: true });
            // Clean up existing socket file if it exists
            if (this.options.autoCleanup) {
                await this.cleanup();
            }
            // Start listening on socket
            await new Promise((resolve, reject) => {
                this.server.once('error', reject);
                this.server.listen(this.options.socketPath, () => {
                    this.server.removeListener('error', reject);
                    this.isRunning = true;
                    this.logger.info(`Server listening on ${this.options.socketPath}`);
                    resolve();
                });
            });
        }
        catch (error) {
            this.logger.error('Failed to start server:', error);
            this.emit(SocketServerEvent.ERROR, error);
            throw error;
        }
    }
    /**
     * Stop the socket server
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        // Close all client connections
        for (const client of this.clients.values()) {
            client.disconnect();
        }
        this.clients.clear();
        // Close server
        await new Promise((resolve) => {
            this.server.close(() => {
                this.isRunning = false;
                resolve();
            });
        });
        // Clean up socket file
        if (this.options.autoCleanup) {
            await this.cleanup();
        }
    }
    /**
     * Clean up socket file
     */
    async cleanup() {
        try {
            await fs.unlink(this.options.socketPath);
        }
        catch (error) {
            // Ignore if file doesn't exist
            if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
                this.emit(SocketServerEvent.ERROR, error);
            }
        }
    }
    /**
     * Send a message to a specific client
     */
    async sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error(`Client not found: ${clientId}`);
        }
        await client.send(typeof message === 'string' ? message : message.toString());
    }
    /**
     * Send a message to all connected clients
     */
    async broadcast(message) {
        if (this.clients.size === 0) {
            return;
        }
        const messageStr = typeof message === 'string' ? message : message.toString();
        const promises = Array.from(this.clients.values()).map(client => client.send(messageStr));
        await Promise.all(promises);
    }
    /**
     * Get all connected clients
     */
    getClients() {
        return Array.from(this.clients.values());
    }
    /**
     * Get a specific client
     */
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    /**
     * Check if the server is running
     */
    isActive() {
        return this.isRunning;
    }
    /**
     * Get the number of connected clients
     */
    getClientCount() {
        return this.clients.size;
    }
    /**
     * Handle a new client connection
     */
    handleConnection(socket) {
        // Check if we've reached the maximum number of clients
        if (this.options.maxClients && this.clients.size >= this.options.maxClients) {
            socket.end('Server is at maximum capacity\n');
            socket.destroy();
            return;
        }
        // Create a new client
        const client = new SocketClient(socket);
        this.clients.set(client.getId(), client);
        this.logger.info(`Client connected: ${client.getId()} (${client.getAddress()})`);
        // Set up client event handlers
        client.on('message', (message) => {
            this.logger.debug(`Message from ${client.getId()}:`, message instanceof SocketMessage ? message.toString().substring(0, 100) + '...' : message);
            this.emit(SocketServerEvent.MESSAGE_RECEIVED, client.getId(), message);
        });
        client.on('disconnect', () => {
            this.logger.info(`Client disconnected: ${client.getId()}`);
            this.clients.delete(client.getId());
            this.emit(SocketServerEvent.CLIENT_DISCONNECTED, client.getId());
        });
        client.on('error', (error) => {
            this.logger.error(`Client error (${client.getId()}):`, error);
            this.emit(SocketServerEvent.ERROR, error, client.getId());
        });
        // Emit client connected event
        this.emit(SocketServerEvent.CLIENT_CONNECTED, client.getId(), client);
    }
    /**
     * Handle server errors
     */
    handleError(error) {
        this.logger.error('Server error:', error);
        this.emit(SocketServerEvent.ERROR, error);
        // If the server is running, try to recover
        if (this.isRunning) {
            this.logger.info('Attempting to recover from error...');
            this.stop().catch((stopError) => {
                this.logger.error('Failed to stop server during recovery:', stopError);
                this.emit(SocketServerEvent.ERROR, stopError);
            });
        }
    }
}
//# sourceMappingURL=socketServer.js.map