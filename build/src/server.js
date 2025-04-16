import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { StateManager } from './stateManager.js';
import { Router } from './router.js';
export class BridgeServer {
    server;
    stateManager;
    router;
    config;
    constructor(config, routerConfig, stateManagerConfig) {
        this.config = config;
        this.stateManager = new StateManager(stateManagerConfig);
        this.router = new Router(routerConfig, this.stateManager);
        // Initialize MCP server
        this.server = new McpServer({
            name: 'mcp-bridge-server',
            version: '0.1.0',
        }, {
            capabilities: {
                resources: {},
                tools: {
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
            if (request.params.name === 'tools/call') {
                return this.handleToolCall(request.params.arguments);
            }
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        });
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
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
    async handleToolCall(params) {
        const messageId = randomUUID();
        const message = {
            id: messageId,
            type: 'request',
            method: params.method,
            sourceClientId: 'bridge-server',
            payload: params.arguments,
            timestamp: new Date()
        };
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
    /**
     * Start the server with the specified transport
     */
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('MCP Bridge Server running on stdio');
    }
    /**
     * Stop the server and cleanup resources
     */
    async stop() {
        await this.server.close();
        this.stateManager.dispose();
    }
    /**
     * Register a new client with the bridge server
     */
    registerClient(client) {
        this.stateManager.registerClient(client);
    }
    /**
     * Get all connected clients of a specific type
     */
    getConnectedClientsByType(type) {
        return this.stateManager.getConnectedClientsByType(type);
    }
}
//# sourceMappingURL=server.js.map