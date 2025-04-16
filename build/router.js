import { EventEmitter } from 'events';
export class Router extends EventEmitter {
    constructor(config, stateManager) {
        super();
        this.config = config;
        this.stateManager = stateManager;
    }
    /**
     * Determine the target client type based on routing rules
     */
    determineTargetType(message) {
        console.error('Determining target type for message:', message.method);
        // Check specific routing rules first
        const rule = this.config.routingRules?.[message.method];
        if (rule) {
            console.error('Found routing rule:', rule);
            return rule.targetType;
        }
        // Fall back to default target type
        console.error('Using default target type:', this.config.defaultTargetType);
        return this.config.defaultTargetType;
    }
    /**
     * Route a message to its target client
     */
    async routeMessage(message) {
        try {
            // If target is specified, use it directly
            if (message.targetClientId) {
                console.error('Using specified target client:', message.targetClientId);
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
            console.error(`Found ${availableClients.length} available clients of type ${targetType}:`, availableClients.map(c => `${c.id} (${c.connected ? 'connected' : 'disconnected'})`));
            if (availableClients.length === 0) {
                throw new Error(`No available clients of type: ${targetType}`);
            }
            // For now, just use the first available client
            // TODO: Implement more sophisticated client selection (load balancing, etc.)
            const targetClient = availableClients[0];
            console.error('Selected target client:', targetClient.id);
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