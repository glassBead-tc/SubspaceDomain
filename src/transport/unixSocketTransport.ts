import { Socket } from 'net';
import { Transport } from '@modelcontextprotocol/sdk/server/index.js';
import { EventEmitter } from 'events';
import { SocketServer, SocketServerEvent } from './socket/socketServer.js';
import { SocketMessage } from './socket/socketMessage.js';
import { SocketClient, SocketClientEvent } from './socket/socketClient.js';
import { Logger } from '../utils/logger.js';

/**
 * Unix Socket Server Transport for MCP
 * Implements the Transport interface from MCP SDK
 */
export class UnixSocketServerTransport implements Transport {
  private socketServer: SocketServer;
  private eventEmitter = new EventEmitter();
  private isConnected = false;
  private logger: Logger;

  constructor(socketPath: string) {
    // Create logger
    this.logger = new Logger({ prefix: 'UnixSocketTransport' });

    // Create socket server
    this.socketServer = new SocketServer({
      socketPath,
      autoCleanup: true
    });

    // Set up event handlers
    this.setupEventHandlers();

    this.logger.info('Transport created with socket path:', socketPath);
  }

  /**
   * Connect to the transport
   */
  public async connect(): Promise<void> {
    try {
      this.logger.info('Connecting transport...');

      // Start socket server
      await this.socketServer.start();
      this.isConnected = true;

      this.logger.info(`Unix socket server listening on ${this.socketServer['options'].socketPath}`);
    } catch (error) {
      this.logger.error('Failed to start Unix socket server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the transport
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      this.logger.info('Disconnecting transport...');

      // Stop socket server
      await this.socketServer.stop();
      this.isConnected = false;

      this.logger.info('Transport disconnected');
    } catch (error) {
      this.logger.error('Failed to stop Unix socket server:', error);
      throw error;
    }
  }

  /**
   * Send a message to all connected clients
   */
  public async send(message: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Transport not connected');
    }

    if (this.socketServer.getClientCount() === 0) {
      throw new Error('No clients connected');
    }

    try {
      this.logger.debug('Sending message:', message.substring(0, 100) + '...');

      // Create socket message
      const socketMessage = SocketMessage.text(message);

      // Broadcast to all clients
      await this.socketServer.broadcast(socketMessage);

      this.logger.debug('Message sent to all clients');
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Register a message handler
   */
  public onMessage(handler: (message: string) => void): void {
    this.eventEmitter.on('message', handler);
  }

  /**
   * Register a close handler
   */
  public onClose(handler: () => void): void {
    this.eventEmitter.on('close', handler);
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Handle messages
    this.socketServer.on(SocketServerEvent.MESSAGE_RECEIVED, (clientId, message) => {
      // Convert message to string if it's a SocketMessage
      const messageStr = message instanceof SocketMessage ? message.toString() : message;

      this.logger.debug(`Received message from client ${clientId}:`, messageStr.substring(0, 100) + '...');

      // Emit message event
      this.eventEmitter.emit('message', messageStr);
    });

    // Handle client connections
    this.socketServer.on(SocketServerEvent.CLIENT_CONNECTED, (clientId) => {
      this.logger.info(`Client connected: ${clientId}`);
    });

    // Handle client disconnections
    this.socketServer.on(SocketServerEvent.CLIENT_DISCONNECTED, (clientId) => {
      this.logger.info(`Client disconnected: ${clientId}`);
    });

    // Handle errors
    this.socketServer.on(SocketServerEvent.ERROR, (error) => {
      this.logger.error('Socket server error:', error);
    });

    // Handle server close
    this.socketServer.on(SocketServerEvent.CLOSE, () => {
      this.logger.info('Socket server closed');
      this.isConnected = false;
      this.eventEmitter.emit('close');
    });
  }
}

/**
 * Unix Socket Client Transport for MCP
 * Used by clients to connect to the server
 */
export class UnixSocketClientTransport implements Transport {
  private client: SocketClient | null = null;
  private socketPath: string;
  private eventEmitter = new EventEmitter();
  private isConnected = false;
  private logger: Logger;

  constructor(socketPath: string) {
    this.socketPath = socketPath;
    this.logger = new Logger({ prefix: 'UnixSocketClient' });
    this.logger.info('Client transport created with socket path:', socketPath);
  }

  /**
   * Connect to the server
   */
  public async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to server...');

      // Dynamically import the net module
      const net = await import('net');

      // Create socket
      const socket = new net.Socket();

      // Connect to server
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
          socket.removeListener('connect', onConnect);
          this.logger.error('Connection error:', error);
          reject(error);
        };

        const onConnect = () => {
          socket.removeListener('error', onError);
          this.logger.debug('Socket connected');
          resolve();
        };

        socket.once('error', onError);
        socket.once('connect', onConnect);

        this.logger.debug(`Attempting to connect to ${this.socketPath}`);
        socket.connect(this.socketPath);
      });

      // Create client
      this.client = new SocketClient(socket);
      this.isConnected = true;

      // Set up event handlers
      this.client.on(SocketClientEvent.MESSAGE, (message) => {
        const messageStr = message instanceof SocketMessage ? message.toString() : message;
        this.logger.debug('Received message:', messageStr.substring(0, 100) + '...');
        this.eventEmitter.emit('message', messageStr);
      });

      this.client.on(SocketClientEvent.DISCONNECT, () => {
        this.logger.info('Disconnected from server');
        this.isConnected = false;
        this.eventEmitter.emit('close');
      });

      this.client.on(SocketClientEvent.ERROR, (error) => {
        this.logger.error('Socket client error:', error);
      });

      this.logger.info(`Connected to Unix socket at ${this.socketPath}`);
    } catch (error) {
      this.logger.error('Failed to connect to Unix socket:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      this.logger.info('Disconnecting from server...');
      this.client.disconnect();
      this.isConnected = false;
      this.client = null;
      this.logger.info('Disconnected from server');
    } catch (error) {
      this.logger.error('Failed to disconnect from Unix socket:', error);
      throw error;
    }
  }

  /**
   * Send a message to the server
   */
  public async send(message: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to server');
    }

    try {
      this.logger.debug('Sending message:', message.substring(0, 100) + '...');

      // Create socket message
      const socketMessage = SocketMessage.text(message);

      // Send message
      await this.client.send(socketMessage.toString());

      this.logger.debug('Message sent');
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Register a message handler
   */
  public onMessage(handler: (message: string) => void): void {
    this.eventEmitter.on('message', handler);
  }

  /**
   * Register a close handler
   */
  public onClose(handler: () => void): void {
    this.eventEmitter.on('close', handler);
  }
}
