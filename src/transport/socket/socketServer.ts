import { createServer, Socket } from 'net';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { SocketClient } from './socketClient.js';
import { SocketMessage } from './socketMessage.js';
import { Logger } from '../../utils/logger.js';

/**
 * Socket server events
 */
export enum SocketServerEvent {
  CLIENT_CONNECTED = 'client_connected',
  CLIENT_DISCONNECTED = 'client_disconnected',
  MESSAGE_RECEIVED = 'message_received',
  ERROR = 'error',
  CLOSE = 'close'
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
export class SocketServer extends EventEmitter {
  private server: ReturnType<typeof createServer>;
  private clients: Map<string, SocketClient> = new Map();
  private options: SocketServerOptions;
  private isRunning = false;
  private logger: Logger;

  constructor(options: SocketServerOptions) {
    super();
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
  public async start(): Promise<void> {
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
      await new Promise<void>((resolve, reject) => {
        this.server.once('error', reject);
        this.server.listen(this.options.socketPath, () => {
          this.server.removeListener('error', reject);
          this.isRunning = true;
          this.logger.info(`Server listening on ${this.options.socketPath}`);
          resolve();
        });
      });
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      this.emit(SocketServerEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * Stop the socket server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.disconnect();
    }
    this.clients.clear();

    // Close server
    await new Promise<void>((resolve) => {
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
  private async cleanup(): Promise<void> {
    try {
      await fs.unlink(this.options.socketPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        this.emit(SocketServerEvent.ERROR, error);
      }
    }
  }

  /**
   * Send a message to a specific client
   */
  public async sendToClient(clientId: string, message: string | SocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    await client.send(typeof message === 'string' ? message : message.toString());
  }

  /**
   * Send a message to all connected clients
   */
  public async broadcast(message: string | SocketMessage): Promise<void> {
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
  public getClients(): SocketClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get a specific client
   */
  public getClient(clientId: string): SocketClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Check if the server is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get the number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Handle a new client connection
   */
  private handleConnection(socket: Socket): void {
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
      this.logger.debug(`Message from ${client.getId()}:`,
        message instanceof SocketMessage ? message.toString().substring(0, 100) + '...' : message);
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
  private handleError(error: Error): void {
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
