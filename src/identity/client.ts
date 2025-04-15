import { createHash } from 'crypto';
import { join } from 'path';
import { PersistentStorage } from '../storage/persistentStorage.js';
import {
  ClientIdentity,
  ClientIdComponents,
  IdentityError,
  IdentityErrorType,
  ValidationRules
} from './types.js';
import { defaultProvider as machineIdProvider } from './platform/index.js';
import { UserManager } from './user.js';

/**
 * Client identity manager options
 */
interface ClientManagerOptions {
  storage: PersistentStorage;
  userManager: UserManager;
  validationRules?: ValidationRules;
  clientDataPath?: string;
}

/**
 * Client identity manager
 */
export class ClientManager {
  private storage: PersistentStorage;
  private userManager: UserManager;
  private validationRules: ValidationRules;
  private clientDataPath: string;

  constructor(options: ClientManagerOptions) {
    this.storage = options.storage;
    this.userManager = options.userManager;
    this.validationRules = options.validationRules || {};
    this.clientDataPath = options.clientDataPath || 'clients';
  }

  /**
   * Create new client identity
   */
  public async createClient(
    userId: string,
    clientType: 'claude' | 'cline',
    machineId?: string
  ): Promise<ClientIdentity> {
    try {
      // Get machine ID if not provided
      const currentMachineId = machineId || await machineIdProvider.getId();

      // Verify user exists and has access to this machine
      const user = await this.userManager.getUser(userId);
      if (!user.machineIds.includes(currentMachineId)) {
        throw new IdentityError(
          IdentityErrorType.CLIENT_INVALID,
          'User does not have access to this machine'
        );
      }

      // Generate client ID components
      const components: ClientIdComponents = {
        userId,
        machineId: currentMachineId,
        clientType,
        instance: await this.getNextInstanceNumber(userId, currentMachineId, clientType)
      };

      // Generate client ID
      const id = await this.generateClientId(components);

      // Create client identity
      const client: ClientIdentity = {
        id,
        components,
        created: new Date(),
        lastSeen: new Date(),
        sessions: []
      };

      // Validate client
      if (!this.validateClient(client)) {
        throw new IdentityError(
          IdentityErrorType.CLIENT_INVALID,
          'Invalid client data'
        );
      }

      // Store client
      await this.storage.write(
        this.getClientPath(id),
        client
      );

      return client;
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.CLIENT_INVALID,
        'Failed to create client',
        error
      );
    }
  }

  /**
   * Get client by ID
   */
  public async getClient(clientId: string): Promise<ClientIdentity> {
    try {
      const client = await this.storage.read<ClientIdentity>(
        this.getClientPath(clientId)
      );

      if (!this.validateClient(client)) {
        throw new IdentityError(
          IdentityErrorType.CLIENT_INVALID,
          'Invalid client data'
        );
      }

      return client;
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.CLIENT_NOT_FOUND,
        'Client not found',
        error
      );
    }
  }

  /**
   * Get clients by user ID
   */
  public async getClientsByUser(userId: string): Promise<ClientIdentity[]> {
    try {
      // Get user to verify it exists
      await this.userManager.getUser(userId);

      // List all client files
      const files = await this.storage.read<string[]>(this.clientDataPath);

      // Load and filter clients
      const clients = await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => this.storage.read<ClientIdentity>(join(this.clientDataPath, file)))
      );

      return clients.filter(client => client.components.userId === userId);
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.CLIENT_NOT_FOUND,
        'Failed to get clients',
        error
      );
    }
  }

  /**
   * Update client
   */
  public async updateClient(
    clientId: string,
    updates: Partial<ClientIdentity>
  ): Promise<ClientIdentity> {
    try {
      const client = await this.getClient(clientId);

      // Apply updates
      const updated: ClientIdentity = {
        ...client,
        ...updates,
        lastSeen: new Date()
      };

      // Validate updated client
      if (!this.validateClient(updated)) {
        throw new IdentityError(
          IdentityErrorType.CLIENT_INVALID,
          'Invalid client data'
        );
      }

      // Store updated client
      await this.storage.write(
        this.getClientPath(clientId),
        updated
      );

      return updated;
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.CLIENT_INVALID,
        'Failed to update client',
        error
      );
    }
  }

  /**
   * Delete client
   */
  public async deleteClient(clientId: string): Promise<void> {
    try {
      await this.storage.delete(this.getClientPath(clientId));
    } catch (error) {
      throw new IdentityError(
        IdentityErrorType.CLIENT_NOT_FOUND,
        'Failed to delete client',
        error
      );
    }
  }

  /**
   * Generate client ID
   */
  private async generateClientId(components: ClientIdComponents): Promise<string> {
    const { userId, machineId, clientType, instance } = components;

    // Create hash from components
    const hash = createHash('sha256')
      .update(`${userId}:${machineId}:${clientType}:${instance || 0}`)
      .digest('hex');

    // Format: {clientType}-{userId[0:8]}-{machineId[0:8]}-{hash[0:8]}[-{instance}]
    const id = [
      clientType,
      userId.slice(0, 8),
      machineId.slice(0, 8),
      hash.slice(0, 8)
    ];

    if (instance !== undefined) {
      id.push(instance.toString());
    }

    return id.join('-');
  }

  /**
   * Get next instance number for client type on machine
   */
  private async getNextInstanceNumber(
    userId: string,
    machineId: string,
    clientType: string
  ): Promise<number> {
    try {
      const clients = await this.getClientsByUser(userId);
      const instances = clients
        .filter(client =>
          client.components.machineId === machineId &&
          client.components.clientType === clientType &&
          client.components.instance !== undefined
        )
        .map(client => client.components.instance as number);

      if (instances.length === 0) {
        return 0;
      }

      return Math.max(...instances) + 1;
    } catch {
      return 0;
    }
  }

  /**
   * Get client file path
   */
  private getClientPath(clientId: string): string {
    return join(this.clientDataPath, `${clientId}.json`);
  }

  /**
   * Validate client data
   */
  private validateClient(client: ClientIdentity): boolean {
    // Basic structure validation
    if (!client || typeof client !== 'object') return false;
    if (!client.id || typeof client.id !== 'string') return false;
    if (!client.components || typeof client.components !== 'object') return false;
    if (!(client.created instanceof Date)) return false;
    if (!(client.lastSeen instanceof Date)) return false;
    if (!Array.isArray(client.sessions)) return false;

    // Components validation
    const { components } = client;
    if (!components.userId || typeof components.userId !== 'string') return false;
    if (!components.machineId || typeof components.machineId !== 'string') return false;
    if (!components.clientType || !['claude', 'cline'].includes(components.clientType)) return false;
    if (components.instance !== undefined && typeof components.instance !== 'number') return false;

    // ID format validation
    if (this.validationRules.clientId?.pattern) {
      if (!this.validationRules.clientId.pattern.test(client.id)) {
        return false;
      }
    }

    // Machine ID validation
    if (!machineIdProvider.validate(components.machineId)) {
      return false;
    }

    return true;
  }
}
