import { StorageData, StorageRoot, Migration } from '../types.js';

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  error?: string;
}

/**
 * Migration context passed to migrations
 */
export interface MigrationContext {
  fromVersion: string;
  toVersion: string;
  dryRun?: boolean;
}

/**
 * Base migration class
 */
export abstract class BaseMigration implements Migration {
  constructor(
    public readonly version: string,
    public readonly description: string
  ) {}

  /**
   * Upgrade data to this version
   */
  abstract up(data: StorageData | StorageRoot): Promise<StorageData | StorageRoot>;

  /**
   * Downgrade data from this version
   */
  abstract down(data: StorageData | StorageRoot): Promise<StorageData | StorageRoot>;

  /**
   * Validate data before migration
   */
  protected validate(data: StorageData | StorageRoot): boolean {
    // Base validation - override for specific checks
    return (
      data !== null &&
      typeof data === 'object' &&
      typeof data.version === 'string' &&
      data.metadata &&
      typeof data.metadata === 'object'
    );
  }

  /**
   * Create error with context
   */
  protected error(message: string, data?: any): Error {
    return new Error(
      `Migration ${this.version} failed: ${message}` +
      (data ? `\nData: ${JSON.stringify(data, null, 2)}` : '')
    );
  }
}

/**
 * Migration registry to track available migrations
 */
export class MigrationRegistry {
  private migrations: Map<string, Migration> = new Map();

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration version ${migration.version} already registered`);
    }
    this.migrations.set(migration.version, migration);
  }

  /**
   * Get migration by version
   */
  get(version: string): Migration | undefined {
    return this.migrations.get(version);
  }

  /**
   * Get all migrations
   */
  getAll(): Migration[] {
    return Array.from(this.migrations.values());
  }

  /**
   * Get migrations needed to upgrade from one version to another
   */
  getMigrationPath(fromVersion: string, toVersion: string): Migration[] {
    const migrations = this.getAll()
      .sort((a, b) => this.compareVersions(a.version, b.version));

    const path: Migration[] = [];
    let current = fromVersion;

    while (current !== toVersion) {
      const next = migrations.find(m => 
        this.compareVersions(m.version, current) > 0 &&
        this.compareVersions(m.version, toVersion) <= 0
      );

      if (!next) {
        throw new Error(
          `No migration path from ${fromVersion} to ${toVersion}`
        );
      }

      path.push(next);
      current = next.version;
    }

    return path;
  }

  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) {
        return aVal - bVal;
      }
    }

    return 0;
  }

  /**
   * Clear all registered migrations
   */
  clear(): void {
    this.migrations.clear();
  }
}

// Export singleton instance
export const migrationRegistry = new MigrationRegistry();
