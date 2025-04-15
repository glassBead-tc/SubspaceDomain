import { randomUUID } from 'crypto';
import {
  RegistrationConfig,
  RegistrationRequest,
  RegistrationResponse,
  RegistrationRecord,
  RegistrationState,
  RegistrationError,
  RegistrationErrorType,
  RegistrationEventType,
  RegistrationEvent,
  RegistrationStorage
} from './types.js';
import { FileStorage } from './storage.js';
import { PersistentStorage } from '../storage/persistentStorage.js';

/**
 * Storage with initialization capability
 */
interface InitializableStorage extends RegistrationStorage {
  initialize(): Promise<void>;
}

/**
 * Type guard for initializable storage
 */
function isInitializableStorage(storage: RegistrationStorage): storage is InitializableStorage {
  return 'initialize' in storage && typeof (storage as any).initialize === 'function';
}

/**
 * Registration manager
 * Handles client registration workflow and persistence
 */
export class RegistrationManager {
  private enabled: boolean;
  private storage: RegistrationStorage;
  private autoApprove: {
    enabled: boolean;
    rules?: {
      clientTypes?: string[];
      machineIds?: string[];
      capabilities?: {
        required?: string[];
        excluded?: string[];
      };
    };
  };
  private expiration: {
    pendingTimeout: number;
    approvedTimeout: number;
  };
  private maxAttempts: number;
  private hooks: {
    onRequest?: (request: RegistrationRequest) => Promise<void>;
    onApprove?: (record: RegistrationRecord) => Promise<void>;
    onReject?: (record: RegistrationRecord) => Promise<void>;
    onExpire?: (record: RegistrationRecord) => Promise<void>;
  };
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: RegistrationConfig) {
    this.enabled = config.enabled;
    this.autoApprove = config.autoApprove || { enabled: false };
    this.expiration = config.expiration || {
      pendingTimeout: 24 * 60 * 60 * 1000, // 24 hours
      approvedTimeout: 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    this.maxAttempts = config.maxAttempts || 3;
    this.hooks = (config.hooks && !Array.isArray(config.hooks)) ? config.hooks : {};

    // Set up storage
    if (config.persistence?.enabled) {
      if (config.persistence.storage.type === 'file') {
        const persistentStorage = new PersistentStorage({
          directory: config.persistence.storage.options?.directory || './data/registrations',
          encryption: {
            enabled: false
          }
        });

        this.storage = new FileStorage({
          storage: persistentStorage,
          directory: config.persistence.storage.options?.directory || './data/registrations',
          retention: {
            days: 30,
            maxRecords: 1000
          }
        });
      } else {
        throw new RegistrationError(
          RegistrationErrorType.INVALID_CONFIG,
          'Unsupported storage type'
        );
      }
    } else {
      // In-memory storage
      const records = new Map<string, RegistrationRecord>();
      this.storage = {
        async save(record: RegistrationRecord) {
          records.set(record.id, record);
        },
        async get(id: string) {
          return records.get(id) || null;
        },
        async list() {
          return Array.from(records.values());
        },
        async delete(id: string) {
          records.delete(id);
        },
        async cleanup() {
          // No-op for in-memory
        }
      };
    }
  }

  /**
   * Initialize registration manager
   */
  public async initialize(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Initialize storage
    if (isInitializableStorage(this.storage)) {
      await this.storage.initialize();
    }

    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupExpired(),
      60 * 60 * 1000 // Every hour
    );
  }

  /**
   * Handle registration request
   */
  public async handleRequest(request: RegistrationRequest): Promise<RegistrationResponse> {
    if (!this.enabled) {
      throw new RegistrationError(
        RegistrationErrorType.REQUEST_INVALID,
        'Registration is disabled'
      );
    }

    try {
      // Call request hook
      if (this.hooks.onRequest) {
        await this.hooks.onRequest(request);
      }

      // Create registration record
      const record = await this.createRecord(request);

      // Check auto-approve rules
      if (this.shouldAutoApprove(request)) {
        await this.approve(record.id);
        return (await this.getRecord(record.id)).response;
      }

      return record.response;
    } catch (error: any) {
      throw new RegistrationError(
        RegistrationErrorType.REQUEST_INVALID,
        'Failed to process registration request',
        error
      );
    }
  }

  /**
   * Approve registration
   */
  public async approve(id: string): Promise<void> {
    const record = await this.getRecord(id);

    // Update state
    record.response.state = RegistrationState.APPROVED;
    record.response.expiresAt = new Date(Date.now() + this.expiration.approvedTimeout);
    record.lastUpdated = new Date();
    record.history.push({
      timestamp: new Date(),
      state: RegistrationState.APPROVED
    });

    // Save record
    await this.storage.save(record);

    // Call approve hook
    if (this.hooks.onApprove) {
      await this.hooks.onApprove(record);
    }
  }

  /**
   * Reject registration
   */
  public async reject(id: string, message?: string): Promise<void> {
    const record = await this.getRecord(id);

    // Update state
    record.response.state = RegistrationState.REJECTED;
    record.response.message = message;
    record.lastUpdated = new Date();
    record.history.push({
      timestamp: new Date(),
      state: RegistrationState.REJECTED,
      message
    });

    // Save record
    await this.storage.save(record);

    // Call reject hook
    if (this.hooks.onReject) {
      await this.hooks.onReject(record);
    }
  }

  /**
   * Get registration record
   */
  public async getRecord(id: string): Promise<RegistrationRecord> {
    const record = await this.storage.get(id);
    if (!record) {
      throw new RegistrationError(
        RegistrationErrorType.REQUEST_NOT_FOUND,
        'Registration record not found'
      );
    }
    return record;
  }

  /**
   * List registration records
   */
  public async listRecords(): Promise<RegistrationRecord[]> {
    return this.storage.list();
  }

  /**
   * Close registration manager
   */
  public async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Create registration record
   */
  private async createRecord(request: RegistrationRequest): Promise<RegistrationRecord> {
    const id = randomUUID();
    const record: RegistrationRecord = {
      id,
      request,
      response: {
        registrationId: id,
        state: RegistrationState.PENDING,
        expiresAt: new Date(Date.now() + this.expiration.pendingTimeout)
      },
      created: new Date(),
      lastUpdated: new Date(),
      attempts: 0,
      history: [
        {
          timestamp: new Date(),
          state: RegistrationState.PENDING
        }
      ]
    };

    await this.storage.save(record);
    return record;
  }

  /**
   * Check if request should be auto-approved
   */
  private shouldAutoApprove(request: RegistrationRequest): boolean {
    if (!this.autoApprove.enabled) {
      return false;
    }

    const rules = this.autoApprove.rules;
    if (!rules) {
      return true;
    }

    // Check client type
    if (rules.clientTypes && !rules.clientTypes.includes(request.clientType)) {
      return false;
    }

    // Check machine ID
    if (rules.machineIds && !rules.machineIds.includes(request.machineId)) {
      return false;
    }

    // Check capabilities
    if (rules.capabilities) {
      const requestedCapabilities = new Set([
        ...(request.capabilities.tools || []),
        ...(request.capabilities.resources || [])
      ]);

      // Check required capabilities
      if (rules.capabilities.required) {
        for (const required of rules.capabilities.required) {
          if (!requestedCapabilities.has(required)) {
            return false;
          }
        }
      }

      // Check excluded capabilities
      if (rules.capabilities.excluded) {
        for (const excluded of rules.capabilities.excluded) {
          if (requestedCapabilities.has(excluded)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Clean up expired records
   */
  private async cleanupExpired(): Promise<void> {
    try {
      const records = await this.storage.list();
      const now = new Date();

      for (const record of records) {
        if (now > record.response.expiresAt) {
          // Update state
          record.response.state = RegistrationState.EXPIRED;
          record.lastUpdated = now;
          record.history.push({
            timestamp: now,
            state: RegistrationState.EXPIRED
          });

          // Save record
          await this.storage.save(record);

          // Call expire hook
          if (this.hooks.onExpire) {
            await this.hooks.onExpire(record);
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to clean up expired records:', error);
    }
  }
}
