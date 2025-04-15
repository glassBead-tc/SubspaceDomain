import { Message, RouterConfig, ClientInfo } from './types.js';
import { StateManager } from './stateManager.js';
import { EventEmitter } from 'events';

export class Router extends EventEmitter {
  private config: RouterConfig;
  private stateManager: StateManager;

  constructor(config: RouterConfig, stateManager: StateManager) {
    super();
    this.config = config;
    this.stateManager = stateManager;
  }

  /**
   * Determine the target client type based on routing rules
   */
  private determineTargetType(message: Message): 'claude' | 'cline' | undefined {
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
  public async routeMessage(message: Message): Promise<boolean> {
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
      console.error(`Found ${availableClients.length} available clients of type ${targetType}:`, 
        availableClients.map(c => `${c.id} (${c.connected ? 'connected' : 'disconnected'})`));
      
      if (availableClients.length === 0) {
        throw new Error(`No available clients of type: ${targetType}`);
      }

      // For now, just use the first available client
      // TODO: Implement more sophisticated client selection (load balancing, etc.)
      const targetClient = availableClients[0];
      console.error('Selected target client:', targetClient.id);
      
      // Update message with target client
      const routedMessage: Message = {
        ...message,
        targetClientId: targetClient.id
      };

      this.emit('message', targetClient.id, routedMessage);
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Register a message handler for a specific client
   */
  public onMessage(
    handler: (clientId: string, message: Message) => void
  ): void {
    this.on('message', handler);
  }

  /**
   * Register an error handler
   */
  public onError(
    handler: (error: Error) => void
  ): void {
    this.on('error', handler);
  }

  /**
   * Check if a client is available to handle a message
   */
  public isClientAvailable(clientId: string): boolean {
    const clients = this.stateManager.getConnectedClientsByType('claude')
      .concat(this.stateManager.getConnectedClientsByType('cline'));
    
    return clients.some(client => client.id === clientId);
  }

  /**
   * Get all available clients
   */
  public getAvailableClients(): ClientInfo[] {
    return [
      ...this.stateManager.getConnectedClientsByType('claude'),
      ...this.stateManager.getConnectedClientsByType('cline'),
      ...this.stateManager.getConnectedClientsByType('other')
    ];
  }

  /**
   * Update routing rules
   */
  public updateRoutingRules(rules: RouterConfig['routingRules']): void {
    this.config = {
      ...this.config,
      routingRules: rules
    };
  }

  /**
   * Set default target type
   */
  public setDefaultTargetType(type: 'claude' | 'cline'): void {
    this.config = {
      ...this.config,
      defaultTargetType: type
    };
  }
}
