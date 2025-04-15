import { StorageData, StorageRoot, StorageError, StorageErrorType } from '../types.js';
import { MigrationRegistry, MigrationResult, MigrationContext } from './types.js';

export class MigrationManager {
  constructor(private registry: MigrationRegistry) {}

  /**
   * Migrate data from one version to another
   */
  public async migrate(
    data: StorageData | StorageRoot,
    toVersion: string,
    options: {
      dryRun?: boolean;
      validateOnly?: boolean;
    } = {}
  ): Promise<MigrationResult> {
    try {
      // Get current version
      const fromVersion = data.version;

      // Check if migration is needed
      if (fromVersion === toVersion) {
        return {
          success: true,
          fromVersion,
          toVersion
        };
      }

      // Get migration path
      const migrations = this.registry.getMigrationPath(fromVersion, toVersion);

      // Validate only if requested
      if (options.validateOnly) {
        return {
          success: true,
          fromVersion,
          toVersion
        };
      }

      // Create migration context
      const context: MigrationContext = {
        fromVersion,
        toVersion,
        dryRun: options.dryRun
      };

      // Apply migrations
      let current = data;
      for (const migration of migrations) {
        // Apply migration
        current = await migration.up(current);

        // Validate result
        if (!this.validateMigrationResult(current)) {
          throw new Error(
            `Invalid migration result from version ${migration.version}`
          );
        }

        // Update version
        current.version = migration.version;
      }

      return {
        success: true,
        fromVersion,
        toVersion
      };
    } catch (error) {
      return {
        success: false,
        fromVersion: data.version,
        toVersion,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Roll back a migration
   */
  public async rollback(
    data: StorageData | StorageRoot,
    toVersion: string,
    options: {
      dryRun?: boolean;
      validateOnly?: boolean;
    } = {}
  ): Promise<MigrationResult> {
    try {
      // Get current version
      const fromVersion = data.version;

      // Check if rollback is needed
      if (fromVersion === toVersion) {
        return {
          success: true,
          fromVersion,
          toVersion
        };
      }

      // Get migration path in reverse
      const migrations = this.registry
        .getMigrationPath(toVersion, fromVersion)
        .reverse();

      // Validate only if requested
      if (options.validateOnly) {
        return {
          success: true,
          fromVersion,
          toVersion
        };
      }

      // Create migration context
      const context: MigrationContext = {
        fromVersion,
        toVersion,
        dryRun: options.dryRun
      };

      // Apply migrations
      let current = data;
      for (const migration of migrations) {
        // Apply migration
        current = await migration.down(current);

        // Validate result
        if (!this.validateMigrationResult(current)) {
          throw new Error(
            `Invalid migration result from version ${migration.version}`
          );
        }

        // Update version
        current.version = migration.version;
      }

      return {
        success: true,
        fromVersion,
        toVersion
      };
    } catch (error) {
      return {
        success: false,
        fromVersion: data.version,
        toVersion,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate migration result
   */
  private validateMigrationResult(data: StorageData | StorageRoot): boolean {
    return (
      data !== null &&
      typeof data === 'object' &&
      typeof data.version === 'string' &&
      data.metadata &&
      typeof data.metadata === 'object'
    );
  }

  /**
   * Get available migrations
   */
  public getAvailableMigrations() {
    return this.registry.getAll();
  }

  /**
   * Check if migration is needed
   */
  public needsMigration(
    currentVersion: string,
    targetVersion: string
  ): boolean {
    try {
      const migrations = this.registry.getMigrationPath(
        currentVersion,
        targetVersion
      );
      return migrations.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get latest available version
   */
  public getLatestVersion(): string {
    const migrations = this.registry
      .getAll()
      .sort((a, b) => -a.version.localeCompare(b.version));
    return migrations[0]?.version || '1.0.0';
  }

  /**
   * Create error with context
   */
  private error(message: string, data?: any): StorageError {
    return new StorageError(
      StorageErrorType.MIGRATION_ERROR,
      message,
      undefined,
      data
    );
  }
}
