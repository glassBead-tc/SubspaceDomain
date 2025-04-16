import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { UnixSocketServerTransport } from './transport/unixSocketTransport.js';
import { McpTransportAdapter } from './transport/mcpTransportAdapter.js';
import { DiscoveryManager } from './discovery/discoveryManager.js';
import { ConnectionManager } from './discovery/connectionManager.js';
import { RegistrationProtocol } from './discovery/registrationProtocol.js';
import { Logger } from './utils/logger.js';
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { StateManager } from './stateManager.js';
import { Router } from './router.js';
import { ConnectionState } from './types.js';
export class BridgeServer {
    constructor(config, routerConfig, stateManagerConfig) {
        this.config = config;
        this.logger = new Logger({ prefix: 'BridgeServer' });
        this.stateManager = new StateManager(stateManagerConfig);
        this.router = new Router(routerConfig, this.stateManager);
        // Initialize discovery and connection components
        this.discoveryManager = new DiscoveryManager({
            socketPath: config.transport?.socketPath,
            autoScan: true
        });
        this.connectionManager = new ConnectionManager(this.discoveryManager);
        this.registrationProtocol = new RegistrationProtocol();
        // Initialize MCP server
        this.server = new McpServer({
            name: 'mcp-bridge-server',
            version: '0.1.0',
        }, {
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
        });
        this.setupEventHandlers();
        this.setupRequestHandlers();
    }
    setupEventHandlers() {
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
    setupRequestHandlers() {
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
    async handleClientDiscovery(params) {
        const { clientType, autoStart = false, timeout = this.config.clientStartupTimeoutMs || 30000 } = params;
        this.logger.info(`Discovering client of type: ${clientType}, autoStart: ${autoStart}`);
        // Check if client is already connected
        const connectedClients = this.connectionManager.getConnectedClientsByType(clientType);
        if (connectedClients.length > 0) {
            this.logger.info(`Found connected client: ${connectedClients[0].id}`);
            return {
                found: true,
                client: connectedClients[0]
            };
        }
        // Try to find a discovered but not connected client
        const discoveredClients = this.discoveryManager.getClientsByType(clientType);
        if (discoveredClients.length > 0) {
            this.logger.info(`Found discovered client: ${discoveredClients[0].id}`);
            // Attempt to connect to the client
            this.connectionManager.handleRegistration(JSON.stringify(this.registrationProtocol.createRegisterMessage(clientType, {
                supportedMethods: ['tools/call'],
                supportedTransports: ['unix-socket'],
                targetType: clientType
            }, 'unix-socket', discoveredClients[0].id)));
            return {
                found: true,
                client: discoveredClients[0]
            };
        }
        // If autoStart is true, attempt to start the client
        if (autoStart) {
            try {
                const startupOptions = this.getClientStartupOptions(clientType);
                if (!startupOptions) {
                    this.logger.warn(`No startup configuration available for client type: ${clientType}`);
                    return {
                        found: false,
                        error: `No startup configuration available for client type: ${clientType}`
                    };
                }
                const client = await this.startClient(clientType, startupOptions, timeout);
                this.logger.info(`Started client: ${client.id}`);
                return {
                    found: true,
                    client,
                    startupAttempted: true,
                    startupSuccessful: true
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to start client: ${errorMessage}`);
                return {
                    found: false,
                    error: `Failed to start client: ${errorMessage}`,
                    startupAttempted: true,
                    startupSuccessful: false
                };
            }
        }
        this.logger.warn(`No ${clientType} clients available`);
        return {
            found: false,
            error: `No ${clientType} clients available`
        };
    }
    getClientStartupOptions(clientType) {
        // This would be configured based on the client type
        // For now, return null as we don't have actual client executables
        return null;
    }
    async startClient(clientType, options, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Client startup timed out after ${timeout}ms`));
            }, timeout);
            try {
                const childProcess = spawn(options.command, options.args || [], {
                    env: { ...process.env, ...options.env },
                    cwd: options.cwd
                });
                const client = {
                    id: randomUUID(),
                    type: clientType,
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
                childProcess.on('error', (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
                childProcess.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Client process exited with code ${code}`));
                    }
                });
            }
            catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
    async handleToolCall(params) {
        console.error('Handling tool call:', JSON.stringify(params, null, 2));
        const messageId = randomUUID();
        const message = {
            id: messageId,
            type: 'request',
            method: params.method,
            sourceClientId: 'bridge-server',
            payload: params.arguments,
            timestamp: new Date()
        };
        console.error('Created message:', JSON.stringify(message, null, 2));
        // Create task state
        const task = this.stateManager.createTask(messageId, 'bridge-server', this.config.maxTaskAttempts);
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
    async handleRoutedMessage(clientId, message) {
        // Update client last seen
        this.stateManager.updateClientLastSeen(clientId);
        // Handle different message types
        switch (message.type) {
            case 'handshake':
                await this.handleHandshakeMessage(clientId, message);
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
    async handleHandshakeMessage(clientId, message) {
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
                    const handshakeRequest = {
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
                    const established = {
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
    findTargetClient(message) {
        // For now, just get first available client of the requested type
        // TODO: Implement more sophisticated client selection
        const targetType = message.payload.capabilities.targetType;
        if (!targetType)
            return null;
        const availableClients = this.stateManager.getConnectedClientsByType(targetType);
        return availableClients.length > 0 ? availableClients[0] : null;
    }
    /**
     * Start the server with the specified transport
     */
    async start() {
        // Determine which transport to use based on config
        if (this.config.transport?.type === 'unix-socket') {
            const socketPath = this.config.transport.socketPath || '/tmp/mcp-bridge.sock';
            const unixTransport = new UnixSocketServerTransport(socketPath);
            // Create adapter to make it compatible with MCP SDK
            const transport = new McpTransportAdapter(unixTransport);
            // Set up error handling
            transport.onerror = (error) => {
                this.logger.error('Transport error:', error.message);
            };
            transport.onclose = () => {
                this.logger.info('Transport closed');
            };
            // Start the transport first
            await transport.start();
            // Then connect the server to the transport
            await this.server.connect(transport);
            this.logger.info(`MCP Bridge Server running on Unix socket at ${socketPath}`);
        }
        else {
            // Default to stdio transport
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            this.logger.info('MCP Bridge Server running on stdio');
        }
    }
    /**
     * Stop the server and cleanup resources
     */
    async stop() {
        this.logger.info('Stopping server...');
        // Disconnect all clients
        this.connectionManager.disconnectAllClients('Server shutting down');
        // Dispose managers
        this.connectionManager.dispose();
        this.discoveryManager.dispose();
        // Close server and dispose state manager
        await this.server.close();
        this.stateManager.dispose();
        this.logger.info('Server stopped');
    }
    /**
     * Initialize the server
     * Loads persisted state and prepares for startup
     */
    async initialize() {
        this.logger.info('Initializing server...');
        // Initialize state manager
        await this.stateManager.initialize();
        // Initialize discovery manager
        await this.discoveryManager.initialize();
        // Initialize connection manager
        this.connectionManager.initialize();
        // Set up connection event handlers
        this.connectionManager.on('client_connected', (client) => {
            this.logger.info(`Client connected: ${client.type} (${client.id})`);
            this.stateManager.registerClient(client);
        });
        this.connectionManager.on('client_disconnected', (client) => {
            this.logger.info(`Client disconnected: ${client.type} (${client.id})`);
            this.stateManager.disconnectClient(client.id);
        });
        // Attempt to recover client connections
        const recoveredClients = await this.stateManager.recoverConnections();
        if (recoveredClients.length > 0) {
            this.logger.info(`Recovered ${recoveredClients.length} client connections`);
        }
        this.logger.info('Server initialization complete');
    }
    /**
     * Register a new client with the bridge server
     */
    async registerClient(client) {
        await this.stateManager.registerClient(client);
        this.logger.info(`Registered client: ${client.type} (${client.id})`);
        // Register with discovery and connection managers
        this.discoveryManager.registerClient(client);
        // Handle registration message
        if (client.connected) {
            this.connectionManager.handleRegistration(JSON.stringify(this.registrationProtocol.createRegisterMessage(client.type, client.capabilities || {
                supportedMethods: ['tools/call'],
                supportedTransports: [client.transport]
            }, client.transport, client.id, client.socketPath)));
        }
        const clients = this.stateManager.getConnectedClientsByType(client.type);
        this.logger.info(`Active ${client.type} clients: ${clients.length}`);
    }
    /**
     * Get all connected clients of a specific type
     */
    getConnectedClientsByType(type) {
        return this.stateManager.getConnectedClientsByType(type);
    }
}
//# sourceMappingURL=server.js.map