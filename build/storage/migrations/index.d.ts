import { MigrationRegistry, MigrationResult, MigrationContext, BaseMigration } from './types.js';
import { MigrationManager } from './manager.js';
import { migration as initialMigration } from './v1_0_0.js';
declare const registry: MigrationRegistry;
declare const manager: MigrationManager;
export type { MigrationResult, MigrationContext };
export { MigrationManager, MigrationRegistry, BaseMigration };
export { registry, manager as migrationManager };
export { initialMigration };
export declare const CURRENT_VERSION: string;
export declare function getCurrentVersion(): string;
export declare function isLatestVersion(version: string): boolean;
export declare function needsMigration(version: string): boolean;
export declare function migrateToLatest(data: any): Promise<MigrationResult>;
