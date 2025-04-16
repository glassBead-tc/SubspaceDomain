import { EventEmitter } from 'events';
export class Router extends EventEmitter {
    config;
    stateManager;
    constructor(config, stateManager) {
        super();
        this.config = config;
        this.stateManager = stateManager;
    }
    /**
     * Route a message to its target client
     */
    async routeMessage(message) {
        try {
            // If target is specified, use it directly
            if (message.targetClientId) {
                this.emit('message', message.targetClientId, message);
                return true;
            }
            // Otherwise, determine target based on routing rules
            const targetType = this.determineTargetType(message);
            if (!targetType) {
                throw new Error(`Unable to determine target type for method: ${message.method}`);
            }
            // Get available clients of the target type
            const availableClients = this.stateManager.getConnectedClientsByType(targetType);
            if (availableClients.length === 0) {
                throw new Error(`No available clients of type: ${targetType}`);
            }
            // For now, just use the first available client
            // TODO: Implement more sophisticated client selection (load balancing, etc.)
            const targetClient = availableClients[0];
            // Update message with target client
            const routedMessage = {
                ...message,
                targetClientId: targetClient.id
            };
            this.emit('message', targetClient.id, routedMessage);
            return true;
        }
        catch (error) {
            this.emit('error', error);
            return false;
        }
    }
    /**
     * Determine the target client type based on routing rules
     */
    determineTargetType(message) {
        // Check specific routing rules first
        const rule = this.config.routingRules?.[message.method];
        if (rule) {
            return rule.targetType;
        }
        // Fall back to default target type
        return this.config.defaultTargetType;
    }
    /**
     * Register a message handler for a specific client
     */
    onMessage(handler) {
        this.on('message', handler);
    }
    /**
     * Register an error handler
     */
    onError(handler) {
        this.on('error', handler);
    }
    /**
     * Check if a client is available to handle a message
     */
    isClientAvailable(clientId) {
        const clients = this.stateManager.getConnectedClientsByType('claude')
            .concat(this.stateManager.getConnectedClientsByType('cline'));
        return clients.some(client => client.id === clientId);
    }
    /**
     * Get all available clients
     */
    getAvailableClients() {
        return [
            ...this.stateManager.getConnectedClientsByType('claude'),
            ...this.stateManager.getConnectedClientsByType('cline'),
            ...this.stateManager.getConnectedClientsByType('other')
        ];
    }
    /**
     * Update routing rules
     */
    updateRoutingRules(rules) {
        this.config = {
            ...this.config,
            routingRules: rules
        };
    }
    /**
     * Set default target type
     */
    setDefaultTargetType(type) {
        this.config = {
            ...this.config,
            defaultTargetType: type
        };
    }
}
//# sourceMappingURL=router.js.map