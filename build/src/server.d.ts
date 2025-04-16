import { BridgeServerConfig, RouterConfig, StateManagerConfig, ClientInfo } from './types.js';
export declare class BridgeServer {
    private server;
    private stateManager;
    private router;
    private config;
    constructor(config: BridgeServerConfig, routerConfig: RouterConfig, stateManagerConfig: StateManagerConfig);
    private setupEventHandlers;
    private setupRequestHandlers;
    private handleToolCall;
    private handleRoutedMessage;
    /**
     * Start the server with the specified transport
     */
    start(): Promise<void>;
    /**
     * Stop the server and cleanup resources
     */
    stop(): Promise<void>;
    /**
     * Register a new client with the bridge server
     */
    registerClient(client: ClientInfo): void;
    /**
     * Get all connected clients of a specific type
     */
    getConnectedClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[];
}
