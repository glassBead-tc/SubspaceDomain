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
export declare abstract class BaseMigration implements Migration {
    readonly version: string;
    readonly description: string;
    constructor(version: string, description: string);
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
    protected validate(data: StorageData | StorageRoot): boolean;
    /**
     * Create error with context
     */
    protected error(message: string, data?: any): Error;
}
/**
 * Migration registry to track available migrations
 */
export declare class MigrationRegistry {
    private migrations;
    /**
     * Register a migration
     */
    register(migration: Migration): void;
    /**
     * Get migration by version
     */
    get(version: string): Migration | undefined;
    /**
     * Get all migrations
     */
    getAll(): Migration[];
    /**
     * Get migrations needed to upgrade from one version to another
     */
    getMigrationPath(fromVersion: string, toVersion: string): Migration[];
    /**
     * Compare version strings
     */
    private compareVersions;
    /**
     * Clear all registered migrations
     */
    clear(): void;
}
export declare const migrationRegistry: MigrationRegistry;
