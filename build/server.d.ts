import { BridgeServerConfig, RouterConfig, StateManagerConfig, ClientInfo } from './types.js';
export declare class BridgeServer {
    private server;
    private stateManager;
    private router;
    private config;
    private discoveryManager;
    private connectionManager;
    private registrationProtocol;
    private logger;
    constructor(config: BridgeServerConfig, routerConfig: RouterConfig, stateManagerConfig: StateManagerConfig);
    private setupEventHandlers;
    private setupRequestHandlers;
    private handleClientDiscovery;
    private getClientStartupOptions;
    private startClient;
    private handleToolCall;
    private handleRoutedMessage;
    private handleHandshakeMessage;
    private findTargetClient;
    /**
     * Start the server with the specified transport
     */
    start(): Promise<void>;
    /**
     * Stop the server and cleanup resources
     */
    stop(): Promise<void>;
    /**
     * Initialize the server
     * Loads persisted state and prepares for startup
     */
    initialize(): Promise<void>;
    /**
     * Register a new client with the bridge server
     */
    registerClient(client: ClientInfo): Promise<void>;
    /**
     * Get all connected clients of a specific type
     */
    getConnectedClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[];
}
