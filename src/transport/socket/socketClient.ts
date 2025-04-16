import { Socket } from 'net';
import { EventEmitter } from 'events';
import { SocketMessage } from './socketMessage.js';
import { Logger } from '../../utils/logger.js';

/**
 * Socket client events
 */
export enum SocketClientEvent {
  MESSAGE = 'message',
  DISCONNECT = 'disconnect',
  ERROR = 'error'
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
export class SocketClient extends EventEmitter {
  private socket: Socket;
  private id: string;
  private buffer: string = '';
  private options: SocketClientOptions;
  private isConnected: boolean = true;
  private lastActivity: Date = new Date();
  private logger: Logger;

  constructor(socket: Socket, options?: SocketClientOptions) {
    super();
    this.socket = socket;
    this.id = `${socket.remoteAddress || 'local'}:${socket.remotePort || 'unknown'}-${Date.now()}`;
    this.options = {
      bufferSize: 64 * 1024, // 64KB
      delimiter: '\n',
      encoding: 'utf8',
      ...options
    };

    // Create logger
    this.logger = new Logger({ prefix: `SocketClient:${this.id.substring(0, 8)}` });

    this.setupSocketHandlers();
    this.logger.debug('Client created');
  }

  /**
   * Get client ID
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get client address
   */
  public getAddress(): string {
    return `${this.socket.remoteAddress || 'local'}:${this.socket.remotePort || 'unknown'}`;
  }

  /**
   * Check if client is connected
   */
  public isActive(): boolean {
    return this.isConnected && !this.socket.destroyed;
  }

  /**
   * Get last activity time
   */
  public getLastActivity(): Date {
    return this.lastActivity;
  }

  /**
   * Send a message to the client
   */
  public async send(message: string): Promise<void> {
    if (!this.isActive()) {
      throw new Error('Client is not connected');
    }

    return new Promise<void>((resolve, reject) => {
      // Ensure message ends with delimiter
      const formattedMessage = message.endsWith(this.options.delimiter!)
        ? message
        : message + this.options.delimiter;

      this.socket.write(formattedMessage, this.options.encoding, (error) => {
        if (error) {
          reject(error);
        } else {
          this.lastActivity = new Date();
          resolve();
        }
      });
    });
  }

  /**
   * Disconnect the client
   */
  public disconnect(): void {
    if (!this.isActive()) {
      return;
    }

    this.logger.debug('Disconnecting client');
    this.isConnected = false;
    this.socket.end();
    this.socket.destroy();
    this.emit(SocketClientEvent.DISCONNECT, this.id);
  }

  /**
   * Set up socket event handlers
   */
  private setupSocketHandlers(): void {
    // Handle data
    this.socket.on('data', (data) => {
      this.handleData(data.toString(this.options.encoding));
    });

    // Handle close
    this.socket.on('close', () => {
      this.logger.debug('Socket closed');
      this.isConnected = false;
      this.emit(SocketClientEvent.DISCONNECT, this.id);
    });

    // Handle errors
    this.socket.on('error', (error) => {
      this.logger.error('Socket error:', error);
      this.emit(SocketClientEvent.ERROR, error, this.id);
      this.disconnect();
    });
  }

  /**
   * Handle incoming data
   */
  private handleData(data: string): void {
    this.lastActivity = new Date();

    // Add to buffer
    this.buffer += data;

    // Check if buffer is too large
    if (this.buffer.length > this.options.bufferSize!) {
      const error = new Error('Buffer overflow');
      this.logger.error(error);
      this.emit(SocketClientEvent.ERROR, error, this.id);
      this.buffer = '';
      return;
    }

    // Process complete messages
    const messages = this.buffer.split(this.options.delimiter!);

    // Keep the last incomplete message in the buffer
    this.buffer = messages.pop() || '';

    // Process complete messages
    for (const message of messages) {
      if (message.trim()) {
        try {
          const socketMessage = SocketMessage.fromString(message);
          this.logger.debug('Received message', socketMessage.toString().substring(0, 50) + '...');
          this.emit(SocketClientEvent.MESSAGE, socketMessage);
        } catch (error) {
          // If parsing fails, emit the raw message
          this.logger.debug('Received raw message', message.substring(0, 50) + '...');
          this.emit(SocketClientEvent.MESSAGE, message);
        }
      }
    }
  }
}
