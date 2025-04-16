import { StorageData, StorageRoot } from '../types.js';
import { BaseMigration } from './types.js';
/**
 * Initial migration to set up storage structure
 */
export declare class InitialMigration extends BaseMigration {
    constructor();
    /**
     * Create initial storage structure
     */
    up(data: StorageData | StorageRoot): Promise<StorageRoot>;
    /**
     * No downgrade possible from initial version
     */
    down(data: StorageData | StorageRoot): Promise<StorageRoot>;
    /**
     * Additional validation for this version
     */
    protected validate(data: StorageData | StorageRoot): boolean;
}
export declare const migration: InitialMigration;
