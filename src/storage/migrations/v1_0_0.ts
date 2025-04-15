import { StorageData, StorageRoot, StorageMetadata } from '../types.js';
import { BaseMigration } from './types.js';

/**
 * Initial migration to set up storage structure
 */
export class InitialMigration extends BaseMigration {
  constructor() {
    super('1.0.0', 'Initial storage structure');
  }

  /**
   * Create initial storage structure
   */
  async up(data: StorageData | StorageRoot): Promise<StorageRoot> {
    // Validate input
    if (!this.validate(data)) {
      throw this.error('Invalid data structure');
    }

    // Create initial structure
    return {
      version: this.version,
      metadata: {
        version: this.version,
        lastModified: new Date(),
        checksum: '' // Will be calculated by storage layer
      },
      users: {}
    };
  }

  /**
   * No downgrade possible from initial version
   */
  async down(data: StorageData | StorageRoot): Promise<StorageRoot> {
    throw this.error('Cannot downgrade from initial version');
  }

  /**
   * Additional validation for this version
   */
  protected validate(data: StorageData | StorageRoot): boolean {
    if (!super.validate(data)) return false;

    // For initial migration, we accept empty data
    if (Object.keys(data).length === 0) return true;

    // If data exists, validate structure
    const root = data as StorageRoot;
    return (
      typeof root.users === 'object' &&
      Object.values(root.users).every(user => 
        typeof user === 'object' &&
        typeof user.id === 'string' &&
        typeof user.machineIds === 'object' &&
        Object.values(user.machineIds).every(machine =>
          typeof machine === 'object' &&
          machine.registeredAt instanceof Date &&
          typeof machine.clients === 'object' &&
          Object.values(machine.clients).every(client =>
            typeof client === 'object' &&
            typeof client.id === 'string' &&
            typeof client.userId === 'string' &&
            typeof client.machineId === 'string' &&
            typeof client.type === 'string' &&
            client.registeredAt instanceof Date &&
            client.lastSeen instanceof Date &&
            typeof client.capabilities === 'object' &&
            Array.isArray(client.capabilities.supportedMethods) &&
            Array.isArray(client.capabilities.supportedTransports) &&
            typeof client.settings === 'object' &&
            typeof client.settings.preferredTransport === 'string' &&
            typeof client.settings.startupTimeout === 'number' &&
            typeof client.settings.healthCheckInterval === 'number'
          )
        )
      )
    );
  }
}

// Export migration instance
export const migration = new InitialMigration();
