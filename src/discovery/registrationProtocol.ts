import { randomUUID } from 'crypto';
import { ClientInfo, ConnectionState, ClientCapabilities } from '../types.js';
import { Logger } from '../utils/logger.js';

/**
 * Registration message types
 */
export enum RegistrationMessageType {
  REGISTER = 'register',
  REGISTER_RESPONSE = 'register_response',
  HEARTBEAT = 'heartbeat',
  HEARTBEAT_RESPONSE = 'heartbeat_response',
  DISCONNECT = 'disconnect'
}

/**
 * Registration status
 */
export enum RegistrationStatus {
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * Base registration message
 */
export interface RegistrationMessage {
  type: RegistrationMessageType;
  timestamp: string;
}

/**
 * Register message
 */
export interface RegisterMessage extends RegistrationMessage {
  type: RegistrationMessageType.REGISTER;
  clientId?: string;
  clientType: 'claude' | 'cline' | 'other';
  capabilities: ClientCapabilities;
  transport: 'stdio' | 'http' | 'unix-socket';
  socketPath?: string;
}

/**
 * Register response message
 */
export interface RegisterResponseMessage extends RegistrationMessage {
  type: RegistrationMessageType.REGISTER_RESPONSE;
  status: RegistrationStatus;
  clientId: string;
  error?: string;
  serverCapabilities?: {
    supportedMethods: string[];
    supportedTransports: ('stdio' | 'http' | 'unix-socket')[];
  };
}

/**
 * Heartbeat message
 */
export interface HeartbeatMessage extends RegistrationMessage {
  type: RegistrationMessageType.HEARTBEAT;
  clientId: string;
}

/**
 * Heartbeat response message
 */
export interface HeartbeatResponseMessage extends RegistrationMessage {
  type: RegistrationMessageType.HEARTBEAT_RESPONSE;
  status: RegistrationStatus;
  error?: string;
}

/**
 * Disconnect message
 */
export interface DisconnectMessage extends RegistrationMessage {
  type: RegistrationMessageType.DISCONNECT;
  clientId: string;
  reason?: string;
}

/**
 * Registration protocol handler
 */
export class RegistrationProtocol {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger({ prefix: 'RegistrationProtocol' });
  }
  
  /**
   * Parse registration message
   */
  public parseMessage(message: string): RegistrationMessage | null {
    try {
      const parsed = JSON.parse(message);
      
      // Validate message
      if (!parsed.type || !parsed.timestamp) {
        this.logger.error('Invalid registration message:', message);
        return null;
      }
      
      return parsed as RegistrationMessage;
    } catch (error) {
      this.logger.error('Failed to parse registration message:', error);
      return null;
    }
  }
  
  /**
   * Create register message
   */
  public createRegisterMessage(
    clientType: 'claude' | 'cline' | 'other',
    capabilities: ClientCapabilities,
    transport: 'stdio' | 'http' | 'unix-socket',
    clientId?: string,
    socketPath?: string
  ): RegisterMessage {
    return {
      type: RegistrationMessageType.REGISTER,
      timestamp: new Date().toISOString(),
      clientId,
      clientType,
      capabilities,
      transport,
      socketPath
    };
  }
  
  /**
   * Create register response message
   */
  public createRegisterResponseMessage(
    status: RegistrationStatus,
    clientId: string,
    error?: string,
    serverCapabilities?: {
      supportedMethods: string[];
      supportedTransports: ('stdio' | 'http' | 'unix-socket')[];
    }
  ): RegisterResponseMessage {
    return {
      type: RegistrationMessageType.REGISTER_RESPONSE,
      timestamp: new Date().toISOString(),
      status,
      clientId,
      error,
      serverCapabilities
    };
  }
  
  /**
   * Create heartbeat message
   */
  public createHeartbeatMessage(clientId: string): HeartbeatMessage {
    return {
      type: RegistrationMessageType.HEARTBEAT,
      timestamp: new Date().toISOString(),
      clientId
    };
  }
  
  /**
   * Create heartbeat response message
   */
  public createHeartbeatResponseMessage(
    status: RegistrationStatus,
    error?: string
  ): HeartbeatResponseMessage {
    return {
      type: RegistrationMessageType.HEARTBEAT_RESPONSE,
      timestamp: new Date().toISOString(),
      status,
      error
    };
  }
  
  /**
   * Create disconnect message
   */
  public createDisconnectMessage(
    clientId: string,
    reason?: string
  ): DisconnectMessage {
    return {
      type: RegistrationMessageType.DISCONNECT,
      timestamp: new Date().toISOString(),
      clientId,
      reason
    };
  }
  
  /**
   * Handle register message
   */
  public handleRegisterMessage(message: RegisterMessage): ClientInfo {
    this.logger.info(`Handling register message for client type: ${message.clientType}`);
    
    // Generate client ID if not provided
    const clientId = message.clientId || `${message.clientType}-${randomUUID()}`;
    
    // Create client info
    const clientInfo: ClientInfo = {
      id: clientId,
      type: message.clientType,
      transport: message.transport,
      connected: true,
      lastSeen: new Date(),
      state: ConnectionState.CONNECTED,
      capabilities: message.capabilities,
      socketPath: message.socketPath
    };
    
    return clientInfo;
  }
  
  /**
   * Handle heartbeat message
   */
  public handleHeartbeatMessage(message: HeartbeatMessage, client: ClientInfo): ClientInfo {
    this.logger.debug(`Handling heartbeat message for client: ${message.clientId}`);
    
    // Update last seen
    return {
      ...client,
      lastSeen: new Date()
    };
  }
  
  /**
   * Handle disconnect message
   */
  public handleDisconnectMessage(message: DisconnectMessage, client: ClientInfo): ClientInfo {
    this.logger.info(`Handling disconnect message for client: ${message.clientId}, reason: ${message.reason || 'none'}`);
    
    // Update client state
    return {
      ...client,
      connected: false,
      state: ConnectionState.DISCONNECTED,
      lastSeen: new Date()
    };
  }
  
  /**
   * Serialize message to string
   */
  public serializeMessage(message: RegistrationMessage): string {
    return JSON.stringify(message);
  }
}
