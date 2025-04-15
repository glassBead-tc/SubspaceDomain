import { MigrationRegistry, MigrationResult, MigrationContext, BaseMigration } from './types.js';
import { MigrationManager } from './manager.js';
import { migration as initialMigration } from './v1_0_0.js';

// Register all migrations
const registry = new MigrationRegistry();
registry.register(initialMigration);

// Create manager instance
const manager = new MigrationManager(registry);

// Export types
export type {
  MigrationResult,
  MigrationContext
};

// Export classes
export {
  MigrationManager,
  MigrationRegistry,
  BaseMigration
};

// Export instances
export {
  registry,
  manager as migrationManager
};

// Export migrations
export {
  initialMigration
};

// Export current version
export const CURRENT_VERSION = initialMigration.version;

// Helper functions
export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

export function isLatestVersion(version: string): boolean {
  return version === CURRENT_VERSION;
}

export function needsMigration(version: string): boolean {
  return version !== CURRENT_VERSION;
}

export async function migrateToLatest(data: any): Promise<MigrationResult> {
  return manager.migrate(data, CURRENT_VERSION);
}
