import { Message, RouterConfig, ClientInfo } from './types.js';
import { StateManager } from './stateManager.js';
import { EventEmitter } from 'events';
export declare class Router extends EventEmitter {
    private config;
    private stateManager;
    constructor(config: RouterConfig, stateManager: StateManager);
    /**
     * Determine the target client type based on routing rules
     */
    private determineTargetType;
    /**
     * Route a message to its target client
     */
    routeMessage(message: Message): Promise<boolean>;
    /**
     * Register a message handler for a specific client
     */
    onMessage(handler: (clientId: string, message: Message) => void): void;
    /**
     * Register an error handler
     */
    onError(handler: (error: Error) => void): void;
    /**
     * Check if a client is available to handle a message
     */
    isClientAvailable(clientId: string): boolean;
    /**
     * Get all available clients
     */
    getAvailableClients(): ClientInfo[];
    /**
     * Update routing rules
     */
    updateRoutingRules(rules: RouterConfig['routingRules']): void;
    /**
     * Set default target type
     */
    setDefaultTargetType(type: 'claude' | 'cline'): void;
}
