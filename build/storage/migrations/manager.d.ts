import { StorageData, StorageRoot } from '../types.js';
import { MigrationRegistry, MigrationResult } from './types.js';
export declare class MigrationManager {
    private registry;
    constructor(registry: MigrationRegistry);
    /**
     * Migrate data from one version to another
     */
    migrate(data: StorageData | StorageRoot, toVersion: string, options?: {
        dryRun?: boolean;
        validateOnly?: boolean;
    }): Promise<MigrationResult>;
    /**
     * Roll back a migration
     */
    rollback(data: StorageData | StorageRoot, toVersion: string, options?: {
        dryRun?: boolean;
        validateOnly?: boolean;
    }): Promise<MigrationResult>;
    /**
     * Validate migration result
     */
    private validateMigrationResult;
    /**
     * Get available migrations
     */
    getAvailableMigrations(): import("../types.js").Migration[];
    /**
     * Check if migration is needed
     */
    needsMigration(currentVersion: string, targetVersion: string): boolean;
    /**
     * Get latest available version
     */
    getLatestVersion(): string;
    /**
     * Create error with context
     */
    private error;
}
