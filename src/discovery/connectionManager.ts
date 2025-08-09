import { EventEmitter } from 'events';
import { ClientInfo, ConnectionState } from '../types.js';
import { Logger } from '../utils/logger.js';
import { DiscoveryManager } from './discoveryManager.js';
import {
  InitializeRequest,
  InitializeResult,
  PingRequest,
  JSONRPCMessage,
  JSONRPCRequest, // Added import
  JSONRPCResponse,
  JSONRPCError,
  ClientCapabilities, // This is the MCP ClientCapabilities
  ServerCapabilities, // This is the MCP ServerCapabilities
  Implementation,
  JSONRPC_VERSION,
  LATEST_PROTOCOL_VERSION,
  RequestId,
  METHOD_NOT_FOUND
} from '../protocols/mcpSchema.js'; // Corrected import path
import { randomUUID } from 'crypto'; // Added import

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
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  // Removed heartbeatInterval and heartbeatTimeout
}

/**
 * Connection manager
 * Handles client connections and reconnections
 */
export class ConnectionManager extends EventEmitter {
  private logger: Logger;
  private discoveryManager: DiscoveryManager;
  // private protocol: RegistrationProtocol; // Removed
  private options: Required<ConnectionManagerOptions>;
  private connectedClients: Map<string, ClientInfo> = new Map();
  // private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map(); // Removed
  private reconnectAttempts: Map<string, number> = new Map();
  private pendingInitialize: Map<string, RequestId> = new Map(); // Track pending initialize requests clientId -> requestId
  
  constructor(
    discoveryManager: DiscoveryManager,
    options: ConnectionManagerOptions = {}
  ) {
    super();
    
    this.discoveryManager = discoveryManager;
    // this.protocol = new RegistrationProtocol(); // Removed
    
    // Set default options
    this.options = {
      // heartbeatInterval: options.heartbeatInterval || 30000, // Removed
      // heartbeatTimeout: options.heartbeatTimeout || 10000, // Removed
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
    // Removed 'client_found' listener - connection attempts should be triggered externally
    this.discoveryManager.on('client_lost', this.handleClientLost.bind(this));
    
    this.logger.info('Connection manager initialized');
  }
  
  // Removed handleClientFound method as connection attempts are now triggered externally
  
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
  /**
   * Attempt to establish an MCP connection with a client (server).
   * This should be called *after* a transport layer connection (e.g., socket) is established.
   */
  private attemptConnection(client: ClientInfo): void {
    this.logger.info(`Attempting MCP handshake with client: ${client.type} (${client.id})`); // Removed client.address

    // Update client state to CONNECTING
    const connectingClient: ClientInfo = {
      ...client,
      connected: false, // Not fully connected until initialize succeeds
      state: ConnectionState.CONNECTING,
      lastSeen: new Date()
    };
    this.connectedClients.set(client.id, connectingClient);
    this.emit(ConnectionEvent.CLIENT_UPDATED, connectingClient); // Notify about state change

    // Define our client capabilities (example)
    const clientCapabilities: ClientCapabilities = {
      // Add capabilities this bridge server supports as a client
      roots: { listChanged: false },
      sampling: {}
    };

    // Define our client implementation info (example)
    const clientImplementation: Implementation = {
      name: 'mcp-bridge-server-client',
      version: '0.1.0' // Replace with actual version
    };

    // Create initialize request
    const requestId = randomUUID();
    // Construct the full JSONRPCRequest
    const initializeRequest: JSONRPCRequest = {
      jsonrpc: JSONRPC_VERSION,
      id: requestId,
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: clientCapabilities,
        clientInfo: clientImplementation
      }
    };

    // Store pending request ID
    this.pendingInitialize.set(client.id, requestId);

    // Send the initialize request via the transport layer
    // This part needs integration with the actual transport mechanism
    this.logger.info(`Sending initialize request (ID: ${requestId}) to client: ${client.id}`);
    // Pass the full JSONRPCRequest
    this.sendMessage(client.id, initializeRequest);
    
    // TODO: Implement a timeout for the initialize response
  }

  /**
   * Handles incoming JSON-RPC messages from a connected client (server).
   * This should be called by the transport layer when a message is received.
   */
  public handleIncomingMessage(clientId: string, message: JSONRPCMessage): void {
    this.logger.debug(`Received message from ${clientId}: ${JSON.stringify(message)}`);
    const client = this.connectedClients.get(clientId);
    if (!client) {
      this.logger.warn(`Received message from unknown or disconnected client: ${clientId}`);
      return;
    }

    // Update last seen time
    this.connectedClients.set(clientId, { ...client, lastSeen: new Date() });

    if ('method' in message) {
      // Handle Requests and Notifications from the server
      switch (message.method) {
        case 'ping':
          // Pass the full JSONRPCRequest which includes the id
          this.handlePingRequest(clientId, message as JSONRPCRequest);
          break;
        case 'notifications/progress':
          // Handle progress notification
          this.logger.debug(`Progress notification from ${clientId}: ${JSON.stringify(message.params)}`);
          // Potentially emit an event
          break;
        case 'notifications/resources/updated':
        case 'notifications/resources/list_changed':
        case 'notifications/tools/list_changed':
        case 'notifications/prompts/list_changed':
          // Handle resource/tool/prompt list changes
          this.logger.info(`Received ${message.method} notification from ${clientId}`);
          // TODO: Update internal state or emit events
          break;
        case 'notifications/cancelled':
           this.logger.info(`Received cancellation notification from ${clientId} for request ${message.params?.requestId}`);
           // TODO: Handle cancellation
           break;
        // Add other server-initiated notification/request handlers here
        default:
          this.logger.warn(`Received unhandled method ${message.method} from ${clientId}`);
          // If it's a request, send a METHOD_NOT_FOUND error
          if ('id' in message) {
             const errorResponse: JSONRPCError = {
               jsonrpc: JSONRPC_VERSION,
               id: message.id,
               error: { code: METHOD_NOT_FOUND, message: `Method not found: ${message.method}` }
             };
             this.sendMessage(clientId, errorResponse);
          }
      }
    } else if ('result' in message) {
      // Handle successful Responses to our requests
      this.handleResponse(clientId, message as JSONRPCResponse);
    } else if ('error' in message) {
      // Handle Error Responses to our requests
      this.handleErrorResponse(clientId, message as JSONRPCError);
    } else {
       this.logger.error(`Received invalid JSON-RPC message from ${clientId}: ${JSON.stringify(message)}`);
       // Consider sending a PARSE_ERROR or INVALID_REQUEST if applicable, though requires request ID
    }
  }

  /**
   * Handles successful JSON-RPC responses.
   */
  private handleResponse(clientId: string, response: JSONRPCResponse): void {
    const client = this.connectedClients.get(clientId);
    if (!client) return; // Should not happen if called from handleIncomingMessage

    const pendingInitId = this.pendingInitialize.get(clientId);

    if (pendingInitId === response.id) {
      // This is the response to our initialize request
      this.pendingInitialize.delete(clientId);
      this.handleInitializeResult(clientId, response.result as InitializeResult);
    } else {
      // Handle other responses (e.g., ping response)
      this.logger.debug(`Received response for request ${response.id} from ${clientId}`);
      // TODO: Add logic for other expected responses (like ping)
    }
  }

  /**
   * Handles JSON-RPC error responses.
   */
  private handleErrorResponse(clientId: string, errorResponse: JSONRPCError): void {
     const client = this.connectedClients.get(clientId);
     if (!client) return;

     const pendingInitId = this.pendingInitialize.get(clientId);

     this.logger.error(`Received error response for request ${errorResponse.id} from ${clientId}: ${errorResponse.error.code} - ${errorResponse.error.message}`);

     if (pendingInitId === errorResponse.id) {
       // Initialization failed
       this.pendingInitialize.delete(clientId);
       this.logger.error(`Initialization failed for client ${clientId}. Disconnecting.`);
       this.handleDisconnection(clientId, `Initialization failed: ${errorResponse.error.message}`);
     } else {
       // Handle other errors
       // TODO: Add logic for other errors (e.g., ping failure)
     }
  }
  
   /**
   * Processes the InitializeResult received from a client (server).
   */
  private handleInitializeResult(clientId: string, result: InitializeResult): void {
    const client = this.connectedClients.get(clientId);
    if (!client || client.state !== ConnectionState.CONNECTING) {
      this.logger.warn(`Received InitializeResult for non-connecting client: ${clientId}`);
      return;
    }

    // TODO: Validate protocol version compatibility
    if (result.protocolVersion !== LATEST_PROTOCOL_VERSION) {
       this.logger.warn(`Client ${clientId} uses protocol version ${result.protocolVersion}, expected ${LATEST_PROTOCOL_VERSION}. Proceeding anyway.`);
       // Decide if disconnection is needed based on version compatibility rules
    }

    // Update client info with server details and capabilities
    const updatedClient: ClientInfo = {
      ...client,
      connected: true,
      state: ConnectionState.CONNECTED,
      serverInfo: result.serverInfo,
      serverCapabilities: result.capabilities, // Corrected property name
      lastSeen: new Date()
    };
    this.connectedClients.set(clientId, updatedClient);

    this.logger.info(`MCP Handshake successful with client: ${client.type} (${clientId})`);
    this.logger.debug(`Server Info: ${JSON.stringify(result.serverInfo)}`);
    this.logger.debug(`Server Capabilities: ${JSON.stringify(result.capabilities)}`);

    // Reset reconnect attempts on successful connection
    this.reconnectAttempts.delete(clientId);
    
    // Register the fully connected client with DiscoveryManager
    this.discoveryManager.registerClient(updatedClient);
    
    // Emit connected event
    this.emit(ConnectionEvent.CLIENT_CONNECTED, updatedClient);
    
    // TODO: Start periodic ping checks if desired
    // this.startPingChecks(clientId);
  }

  /**
   * Handles an incoming PingRequest (wrapped in JSONRPCRequest) from a server.
   */
  // Update parameter to accept the full JSONRPCRequest
  private handlePingRequest(clientId: string, request: JSONRPCRequest): void {
     // Access id from the JSONRPCRequest wrapper
     this.logger.debug(`Received ping request (ID: ${request.id}) from ${clientId}. Sending response.`);
     const response: JSONRPCResponse = {
       jsonrpc: JSONRPC_VERSION,
       // Use the id from the incoming request
       id: request.id,
       result: {} // Empty result for ping
     };
     this.sendMessage(clientId, response);
  }

  /**
   * Placeholder for sending a message via the transport layer.
   * Needs to be implemented based on the actual transport mechanism.
   */
  private sendMessage(clientId: string, message: JSONRPCMessage): void {
    // TODO: Implement actual message sending logic using the transport for the given clientId
    this.logger.debug(`SEND> ${clientId}: ${JSON.stringify(message)}`);
    // Example: transportLayer.send(clientId, JSON.stringify(message));
    
    // Simulate sending for now
    // Simulate sending for now - Check the type of the message *being sent*
    if ('method' in message && message.method === 'initialize' && 'id' in message) {
        const initializeRequestId = message.id; // Capture the ID of the request being sent
        // Simulate receiving InitializeResult after a short delay
        setTimeout(() => {
            const client = this.connectedClients.get(clientId);
            if (client && client.state === ConnectionState.CONNECTING) {
                const simulatedResult: InitializeResult = {
                    protocolVersion: LATEST_PROTOCOL_VERSION,
                    capabilities: { /* Example server capabilities */ tools: { listChanged: false } },
                    serverInfo: { name: client.type, version: 'unknown' }
                };
                const simulatedResponse: JSONRPCResponse = {
                    jsonrpc: JSONRPC_VERSION,
                    id: initializeRequestId, // Use the captured ID
                    result: simulatedResult
                };
                this.handleIncomingMessage(clientId, simulatedResponse);
            }
        }, 50); // 50ms delay
    } else if ('method' in message && message.method === 'ping' && 'id' in message) {
         const pingRequestId = message.id; // Capture the ID of the request being sent
         // Simulate receiving ping response
         setTimeout(() => {
             const client = this.connectedClients.get(clientId);
             if (client && client.connected) {
                 const simulatedResponse: JSONRPCResponse = {
                     jsonrpc: JSONRPC_VERSION,
                     id: pingRequestId, // Use the captured ID
                     result: {}
                 };
                 this.handleIncomingMessage(clientId, simulatedResponse);
             }
         }, 20); // 20ms delay
    }
  }

  public handleRegistration(message: string): void {
    try {
      const parsed = JSON.parse(message);
      if (parsed && parsed.type === 'REGISTER') {
        const clientId: string = parsed.clientId;
        const clientType: 'claude' | 'cline' | 'other' = parsed.clientType;
        const transport: 'stdio' | 'http' | 'unix-socket' = parsed.transport;
        const existing = this.connectedClients.get(clientId);
        const updated = {
          id: clientId,
          type: clientType,
          transport,
          connected: true,
          lastSeen: new Date(),
          state: ConnectionState.CONNECTED,
          registrationCapabilities: parsed.capabilities,
          socketPath: parsed.socketPath ?? existing?.socketPath
        };
        this.connectedClients.set(clientId, updated);
        this.emit(ConnectionEvent.CLIENT_CONNECTED, updated);
      }
    } catch (error) {
      this.logger.error('Failed to handle registration message', error as Error);
    }
  }

  // Removed handleRegistration method
  // Removed startHeartbeat, stopHeartbeat, sendHeartbeat methods
  
  
  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, reason?: string): void {
    const client = this.connectedClients.get(clientId);
    if (!client) {
      return;
    }
    
    const wasConnected = client.connected; // Check if it was fully connected before
    this.logger.info(`Client disconnected: ${client.type} (${clientId}), reason: ${reason || 'none'}`);
    
    // Stop any related timers or pending requests for this client
    // this.stopPingChecks(clientId); // TODO: Implement if ping checks are added
    this.pendingInitialize.delete(clientId);
    
    // Update client state
    const updatedClient: ClientInfo = {
      ...client,
      connected: false,
      state: ConnectionState.DISCONNECTED,
      lastSeen: new Date()
    };
    
    // Update map or remove if just attempting connection
    this.connectedClients.set(clientId, updatedClient); // Keep info for potential reconnect
    
    // Emit event only if it was previously fully connected
    if (wasConnected) {
        this.emit(ConnectionEvent.CLIENT_DISCONNECTED, updatedClient);
    } else {
        // If it was just in CONNECTING state, emit an update instead
        this.emit(ConnectionEvent.CLIENT_UPDATED, updatedClient);
    }
    
    // Attempt reconnection if appropriate (using the old capabilities structure for now)
    const shouldReconnect = client.registrationCapabilities?.features?.reconnect ?? false; // Use registrationCapabilities
    if (shouldReconnect) {
      this.attemptReconnection(updatedClient);
    } else {
       // If no reconnect, fully remove from map
       this.connectedClients.delete(clientId);
       this.reconnectAttempts.delete(clientId);
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
    
    // Clear any pending timers or intervals (e.g., for ping checks)
    // for (const timer of this.pingCheckTimers.values()) { // TODO: Implement ping checks
    //   clearTimeout(timer);
    // }
    // this.pingCheckTimers.clear();
    
    // Clear reconnect attempts and pending initializations
    this.reconnectAttempts.clear();
    this.pendingInitialize.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }
}
