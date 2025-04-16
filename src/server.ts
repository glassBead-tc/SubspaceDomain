import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { UnixSocketServerTransport } from './transport/unixSocketTransport.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { StateManager } from './stateManager.js';
import { Router } from './router.js';
import {
  BridgeServerConfig,
  Message,
  RouterConfig,
  StateManagerConfig,
  ClientInfo,
  ConnectionState,
  ClientStartupOptions,
  ClientDiscoveryResult,
  HandshakeMessage
} from './types.js';

export class BridgeServer {
  private server: McpServer;
  private stateManager: StateManager;
  private router: Router;
  private config: BridgeServerConfig;

  constructor(
    config: BridgeServerConfig,
    routerConfig: RouterConfig,
    stateManagerConfig: StateManagerConfig
  ) {
    this.config = config;
    this.stateManager = new StateManager(stateManagerConfig);
    this.router = new Router(routerConfig, this.stateManager);

    // Initialize MCP server
    this.server = new McpServer(
      {
        name: 'mcp-bridge-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {
            'discover_client': {
              description: 'Find and optionally start an MCP client',
              inputSchema: {
                type: 'object',
                properties: {
                  clientType: { type: 'string', enum: ['claude', 'cline'] },
                  autoStart: { type: 'boolean' },
                  timeout: { type: 'number' }
                },
                required: ['clientType']
              }
            },
            'tools/call': {
              description: 'Execute a tool on a remote MCP client',
              inputSchema: {
                type: 'object',
                properties: {
                  method: { type: 'string' },
                  arguments: { type: 'object' },
                  targetType: {
                    type: 'string',
                    enum: ['claude', 'cline']
                  }
                },
                required: ['method', 'arguments']
              }
            }
          }
        }
      }
    );

    this.setupEventHandlers();
    this.setupRequestHandlers();
  }

  private setupEventHandlers(): void {
    // Handle router events
    this.router.onMessage((clientId, message) => {
      this.handleRoutedMessage(clientId, message);
    });

    this.router.onError((error) => {
      console.error('Router error:', error);
    });

    // Handle server errors
    this.server.onerror = (error) => {
      console.error('Server error:', error);
    };
  }

  private setupRequestHandlers(): void {
    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'discover_client') {
        return this.handleClientDiscovery(request.params.arguments);
      }
      if (request.params.name === 'tools/call') {
        return this.handleToolCall(request.params.arguments);
      }
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'discover_client',
          description: 'Find and optionally start an MCP client',
          inputSchema: {
            type: 'object',
            properties: {
              clientType: { type: 'string', enum: ['claude', 'cline'] },
              autoStart: { type: 'boolean' },
              timeout: { type: 'number' }
            },
            required: ['clientType']
          }
        },
        {
          name: 'tools/call',
          description: 'Execute a tool on a remote MCP client',
          inputSchema: {
            type: 'object',
            properties: {
              method: { type: 'string' },
              arguments: { type: 'object' },
              targetType: {
                type: 'string',
                enum: ['claude', 'cline']
              }
            },
            required: ['method', 'arguments']
          }
        }
      ]
    }));

    // List available resources (none for now)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: []
    }));
  }

  private async handleClientDiscovery(params: any): Promise<ClientDiscoveryResult> {
    const { clientType, autoStart = false, timeout = this.config.clientStartupTimeoutMs || 30000 } = params;

    // Check if client is already connected
    const connectedClients = this.stateManager.getConnectedClientsByType(clientType);
    if (connectedClients.length > 0) {
      return {
        found: true,
        client: connectedClients[0]
      };
    }

    // If autoStart is true, attempt to start the client
    if (autoStart) {
      try {
        const startupOptions = this.getClientStartupOptions(clientType);
        if (!startupOptions) {
          return {
            found: false,
            error: `No startup configuration available for client type: ${clientType}`
          };
        }

        const client = await this.startClient(clientType, startupOptions, timeout);
        return {
          found: true,
          client,
          startupAttempted: true,
          startupSuccessful: true
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          found: false,
          error: `Failed to start client: ${errorMessage}`,
          startupAttempted: true,
          startupSuccessful: false
        };
      }
    }

    return {
      found: false,
      error: `No ${clientType} clients available`
    };
  }

  private getClientStartupOptions(clientType: string): ClientStartupOptions | null {
    // This would be configured based on the client type
    // For now, return null as we don't have actual client executables
    return null;
  }

  private async startClient(
    clientType: string,
    options: ClientStartupOptions,
    timeout: number
  ): Promise<ClientInfo> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Client startup timed out after ${timeout}ms`));
      }, timeout);

      try {
        const childProcess = spawn(options.command!, options.args || [], {
          env: { ...process.env, ...options.env },
          cwd: options.cwd
        });

        const client: ClientInfo = {
          id: randomUUID(),
          type: clientType as 'claude' | 'cline',
          transport: 'stdio',
          connected: true,
          lastSeen: new Date(),
          state: ConnectionState.CONNECTING,
          processId: childProcess.pid
        };

        this.stateManager.registerClient(client);

        // Wait for initial connection
        childProcess.once('spawn', () => {
          clearTimeout(timeoutId);
          client.state = ConnectionState.CONNECTED;
          this.stateManager.updateClientState(client.id, ConnectionState.CONNECTED);
          resolve(client);
        });

        childProcess.on('error', (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        });

        childProcess.on('exit', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Client process exited with code ${code}`));
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private async handleToolCall(params: any): Promise<any> {
    console.error('Handling tool call:', JSON.stringify(params, null, 2));
    const messageId = randomUUID();
    const message: Message = {
      id: messageId,
      type: 'request',
      method: params.method,
      sourceClientId: 'bridge-server',
      payload: params.arguments,
      timestamp: new Date()
    };
    console.error('Created message:', JSON.stringify(message, null, 2));

    // Create task state
    const task = this.stateManager.createTask(
      messageId,
      'bridge-server',
      this.config.maxTaskAttempts
    );

    // Route message
    const success = await this.router.routeMessage(message);
    if (!success) {
      this.stateManager.updateTask(messageId, {
        status: 'failed',
        error: 'Failed to route message'
      });
      throw new McpError(ErrorCode.InternalError, 'Failed to route message');
    }

    // Update task state
    this.stateManager.updateTask(messageId, { status: 'processing' });

    // TODO: Implement response waiting and timeout handling
    // For now, just return a mock response
    return {
      content: [
        {
          type: 'text',
          text: 'Message routed successfully'
        }
      ]
    };
  }

  private async handleRoutedMessage(clientId: string, message: Message): Promise<void> {
    // Update client last seen
    this.stateManager.updateClientLastSeen(clientId);

    // Handle different message types
    switch (message.type) {
      case 'handshake':
        await this.handleHandshakeMessage(clientId, message as HandshakeMessage);
        break;
      case 'response':
        // TODO: Implement response handling
        break;
      case 'error':
        // TODO: Implement error handling and task retry logic
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async handleHandshakeMessage(clientId: string, message: HandshakeMessage): Promise<void> {
    const client = this.stateManager.getClient(clientId);
    if (!client) {
      console.error(`Received handshake message for unknown client: ${clientId}`);
      return;
    }

    switch (message.method) {
      case 'initiate':
        // Client wants to establish connection
        client.state = ConnectionState.HANDSHAKING;
        client.capabilities = message.payload.capabilities;
        this.stateManager.updateClient(client);

        // Send connection request to target client
        const targetClient = this.findTargetClient(message);
        if (targetClient) {
          const handshakeRequest: HandshakeMessage = {
            id: randomUUID(),
            type: 'handshake',
            method: 'request',
            sourceClientId: clientId,
            targetClientId: targetClient.id,
            payload: {
              capabilities: message.payload.capabilities,
              connectionId: message.id
            },
            timestamp: new Date()
          };
          await this.router.routeMessage(handshakeRequest);
        }
        break;

      case 'accept':
        // Target client accepted connection
        const sourceClient = this.stateManager.getClient(message.sourceClientId);
        if (sourceClient) {
          sourceClient.state = ConnectionState.CONNECTED;
          this.stateManager.updateClient(sourceClient);

          // Notify source client
          const established: HandshakeMessage = {
            id: randomUUID(),
            type: 'handshake',
            method: 'established',
            sourceClientId: clientId,
            targetClientId: message.sourceClientId,
            payload: {
              capabilities: message.payload.capabilities,
              connectionId: message.payload.connectionId
            },
            timestamp: new Date()
          };
          await this.router.routeMessage(established);
        }
        break;
    }
  }

  private findTargetClient(message: HandshakeMessage): ClientInfo | null {
    // For now, just get first available client of the requested type
    // TODO: Implement more sophisticated client selection
    const targetType = message.payload.capabilities.targetType;
    if (!targetType) return null;

    const availableClients = this.stateManager.getConnectedClientsByType(targetType);
    return availableClients.length > 0 ? availableClients[0] : null;
  }

  /**
   * Start the server with the specified transport
   */
  public async start(): Promise<void> {
    // Determine which transport to use based on config
    if (this.config.transport?.type === 'unix-socket') {
      const socketPath = this.config.transport.socketPath || '/tmp/mcp-bridge.sock';
      const transport = new UnixSocketServerTransport(socketPath);
      await this.server.connect(transport);
      console.error(`MCP Bridge Server running on Unix socket at ${socketPath}`);
    } else {
      // Default to stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('MCP Bridge Server running on stdio');
    }
  }

  /**
   * Stop the server and cleanup resources
   */
  public async stop(): Promise<void> {
    await this.server.close();
    this.stateManager.dispose();
  }

  /**
   * Initialize the server
   * Loads persisted state and prepares for startup
   */
  public async initialize(): Promise<void> {
    // Initialize state manager
    await this.stateManager.initialize();

    // Attempt to recover client connections
    const recoveredClients = await this.stateManager.recoverConnections();
    if (recoveredClients.length > 0) {
      console.log(`Recovered ${recoveredClients.length} client connections`);
    }
  }

  /**
   * Register a new client with the bridge server
   */
  public async registerClient(client: ClientInfo): Promise<void> {
    await this.stateManager.registerClient(client);
    console.error(`Registered client: ${client.type} (${client.id})`);
    const clients = this.stateManager.getConnectedClientsByType(client.type);
    console.error(`Active ${client.type} clients: ${clients.length}`);
  }

  /**
   * Get all connected clients of a specific type
   */
  public getConnectedClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[] {
    return this.stateManager.getConnectedClientsByType(type);
  }
}
