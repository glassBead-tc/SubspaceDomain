import { EventEmitter } from 'events';
import { ClientInfo, ConnectionState } from '../types.js';
import { Logger } from '../utils/logger.js';
import { DiscoveryManager } from './discoveryManager.js';
import { 
  RegistrationProtocol, 
  RegistrationMessageType, 
  RegistrationStatus,
  RegisterMessage,
  HeartbeatMessage,
  DisconnectMessage
} from './registrationProtocol.js';

/**
 * Connection events
 */
export enum ConnectionEvent {
  CLIENT_CONNECTED = 'client_connected',
  CLIENT_DISCONNECTED = 'client_disconnected',
  CLIENT_UPDATED = 'client_updated',
  ERROR = 'error'
}

/**
 * Connection manager options
 */
export interface ConnectionManagerOptions {
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Connection manager
 * Handles client connections and reconnections
 */
export class ConnectionManager extends EventEmitter {
  private logger: Logger;
  private discoveryManager: DiscoveryManager;
  private protocol: RegistrationProtocol;
  private options: Required<ConnectionManagerOptions>;
  private connectedClients: Map<string, ClientInfo> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  
  constructor(
    discoveryManager: DiscoveryManager,
    options: ConnectionManagerOptions = {}
  ) {
    super();
    
    this.discoveryManager = discoveryManager;
    this.protocol = new RegistrationProtocol();
    
    // Set default options
    this.options = {
      heartbeatInterval: options.heartbeatInterval || 30000, // 30 seconds
      heartbeatTimeout: options.heartbeatTimeout || 10000, // 10 seconds
      reconnectInterval: options.reconnectInterval || 5000, // 5 seconds
      maxReconnectAttempts: options.maxReconnectAttempts || 5
    };
    
    this.logger = new Logger({ prefix: 'ConnectionManager' });
  }
  
  /**
   * Initialize connection manager
   */
  public initialize(): void {
    this.logger.info('Initializing connection manager');
    
    // Set up discovery manager event handlers
    this.discoveryManager.on('client_found', this.handleClientFound.bind(this));
    this.discoveryManager.on('client_lost', this.handleClientLost.bind(this));
    
    this.logger.info('Connection manager initialized');
  }
  
  /**
   * Handle client found event
   */
  private handleClientFound(client: ClientInfo): void {
    this.logger.info(`Client found: ${client.type} (${client.id})`);
    
    // If client is not connected, try to connect
    if (!client.connected) {
      this.attemptConnection(client);
    }
  }
  
  /**
   * Handle client lost event
   */
  private handleClientLost(client: ClientInfo): void {
    this.logger.info(`Client lost: ${client.type} (${client.id})`);
    
    // If client is connected, mark as disconnected
    if (client.connected) {
      this.handleDisconnection(client.id, 'Client lost');
    }
  }
  
  /**
   * Attempt to connect to a client
   */
  private attemptConnection(client: ClientInfo): void {
    this.logger.info(`Attempting to connect to client: ${client.type} (${client.id})`);
    
    // For now, we just mark the client as connected
    // In a real implementation, we would send a connection request
    // and wait for a response
    
    // Update client state
    const updatedClient: ClientInfo = {
      ...client,
      connected: true,
      state: ConnectionState.CONNECTED,
      lastSeen: new Date()
    };
    
    // Store connected client
    this.connectedClients.set(client.id, updatedClient);
    
    // Start heartbeat
    this.startHeartbeat(client.id);
    
    // Emit event
    this.emit(ConnectionEvent.CLIENT_CONNECTED, updatedClient);
  }
  
  /**
   * Handle client registration
   */
  public handleRegistration(message: string): ClientInfo | null {
    try {
      // Parse message
      const parsedMessage = this.protocol.parseMessage(message);
      if (!parsedMessage) {
        return null;
      }
      
      // Handle register message
      if (parsedMessage.type === RegistrationMessageType.REGISTER) {
        const registerMessage = parsedMessage as RegisterMessage;
        const clientInfo = this.protocol.handleRegisterMessage(registerMessage);
        
        // Store connected client
        this.connectedClients.set(clientInfo.id, clientInfo);
        
        // Register with discovery manager
        this.discoveryManager.registerClient(clientInfo);
        
        // Start heartbeat
        this.startHeartbeat(clientInfo.id);
        
        // Emit event
        this.emit(ConnectionEvent.CLIENT_CONNECTED, clientInfo);
        
        // Create response
        const response = this.protocol.createRegisterResponseMessage(
          RegistrationStatus.SUCCESS,
          clientInfo.id,
          undefined,
          {
            supportedMethods: ['tools/call', 'tools/discover_client'],
            supportedTransports: ['stdio', 'unix-socket']
          }
        );
        
        // Log response
        this.logger.info(`Sending registration response to client: ${clientInfo.id}`);
        
        return clientInfo;
      }
      
      // Handle heartbeat message
      if (parsedMessage.type === RegistrationMessageType.HEARTBEAT) {
        const heartbeatMessage = parsedMessage as HeartbeatMessage;
        const clientId = heartbeatMessage.clientId;
        
        // Get client
        const client = this.connectedClients.get(clientId);
        if (!client) {
          this.logger.warn(`Received heartbeat from unknown client: ${clientId}`);
          return null;
        }
        
        // Update client
        const updatedClient = this.protocol.handleHeartbeatMessage(heartbeatMessage, client);
        this.connectedClients.set(clientId, updatedClient);
        
        // Emit event
        this.emit(ConnectionEvent.CLIENT_UPDATED, updatedClient);
        
        // Create response
        const response = this.protocol.createHeartbeatResponseMessage(
          RegistrationStatus.SUCCESS
        );
        
        // Log response
        this.logger.debug(`Sending heartbeat response to client: ${clientId}`);
        
        return updatedClient;
      }
      
      // Handle disconnect message
      if (parsedMessage.type === RegistrationMessageType.DISCONNECT) {
        const disconnectMessage = parsedMessage as DisconnectMessage;
        const clientId = disconnectMessage.clientId;
        
        // Get client
        const client = this.connectedClients.get(clientId);
        if (!client) {
          this.logger.warn(`Received disconnect from unknown client: ${clientId}`);
          return null;
        }
        
        // Handle disconnection
        this.handleDisconnection(clientId, disconnectMessage.reason);
        
        return client;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error handling registration message:', error);
      this.emit(ConnectionEvent.ERROR, error);
      return null;
    }
  }
  
  /**
   * Start heartbeat for a client
   */
  private startHeartbeat(clientId: string): void {
    // Clear existing heartbeat
    this.stopHeartbeat(clientId);
    
    // Start new heartbeat
    const interval = setInterval(() => {
      this.sendHeartbeat(clientId);
    }, this.options.heartbeatInterval);
    
    this.heartbeatIntervals.set(clientId, interval);
  }
  
  /**
   * Stop heartbeat for a client
   */
  private stopHeartbeat(clientId: string): void {
    const interval = this.heartbeatIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(clientId);
    }
  }
  
  /**
   * Send heartbeat to a client
   */
  private sendHeartbeat(clientId: string): void {
    const client = this.connectedClients.get(clientId);
    if (!client) {
      this.stopHeartbeat(clientId);
      return;
    }
    
    this.logger.debug(`Sending heartbeat to client: ${clientId}`);
    
    // In a real implementation, we would send a heartbeat message
    // and wait for a response
    
    // For now, we just update the client's last seen time
    this.connectedClients.set(clientId, {
      ...client,
      lastSeen: new Date()
    });
  }
  
  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, reason?: string): void {
    const client = this.connectedClients.get(clientId);
    if (!client) {
      return;
    }
    
    this.logger.info(`Client disconnected: ${client.type} (${clientId}), reason: ${reason || 'none'}`);
    
    // Stop heartbeat
    this.stopHeartbeat(clientId);
    
    // Update client state
    const updatedClient: ClientInfo = {
      ...client,
      connected: false,
      state: ConnectionState.DISCONNECTED,
      lastSeen: new Date()
    };
    
    // Remove from connected clients
    this.connectedClients.delete(clientId);
    
    // Emit event
    this.emit(ConnectionEvent.CLIENT_DISCONNECTED, updatedClient);
    
    // Attempt reconnection if appropriate
    if (client.capabilities?.features?.reconnect) {
      this.attemptReconnection(updatedClient);
    }
  }
  
  /**
   * Attempt to reconnect to a client
   */
  private attemptReconnection(client: ClientInfo): void {
    // Get current attempt count
    const attempts = this.reconnectAttempts.get(client.id) || 0;
    
    // Check if we've reached the maximum number of attempts
    if (attempts >= this.options.maxReconnectAttempts) {
      this.logger.warn(`Maximum reconnect attempts reached for client: ${client.id}`);
      this.reconnectAttempts.delete(client.id);
      return;
    }
    
    // Increment attempt count
    this.reconnectAttempts.set(client.id, attempts + 1);
    
    this.logger.info(`Attempting to reconnect to client: ${client.type} (${client.id}), attempt ${attempts + 1}/${this.options.maxReconnectAttempts}`);
    
    // Schedule reconnection attempt
    setTimeout(() => {
      // Check if client is still disconnected
      if (!this.connectedClients.has(client.id)) {
        this.attemptConnection(client);
      }
    }, this.options.reconnectInterval);
  }
  
  /**
   * Get all connected clients
   */
  public getConnectedClients(): ClientInfo[] {
    return Array.from(this.connectedClients.values());
  }
  
  /**
   * Get connected client by ID
   */
  public getConnectedClient(id: string): ClientInfo | undefined {
    return this.connectedClients.get(id);
  }
  
  /**
   * Get connected clients by type
   */
  public getConnectedClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[] {
    return Array.from(this.connectedClients.values())
      .filter(client => client.type === type);
  }
  
  /**
   * Disconnect a client
   */
  public disconnectClient(clientId: string, reason?: string): void {
    const client = this.connectedClients.get(clientId);
    if (!client) {
      return;
    }
    
    this.handleDisconnection(clientId, reason);
  }
  
  /**
   * Disconnect all clients
   */
  public disconnectAllClients(reason?: string): void {
    for (const clientId of this.connectedClients.keys()) {
      this.disconnectClient(clientId, reason);
    }
  }
  
  /**
   * Dispose connection manager
   */
  public dispose(): void {
    this.logger.info('Disposing connection manager');
    
    // Disconnect all clients
    this.disconnectAllClients('Connection manager disposed');
    
    // Clear all intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();
    
    // Clear reconnect attempts
    this.reconnectAttempts.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}
