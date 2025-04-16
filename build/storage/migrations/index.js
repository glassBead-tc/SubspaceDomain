import { MigrationRegistry, BaseMigration } from './types.js';
import { MigrationManager } from './manager.js';
import { migration as initialMigration } from './v1_0_0.js';
// Register all migrations
const registry = new MigrationRegistry();
registry.register(initialMigration);
// Create manager instance
const manager = new MigrationManager(registry);
// Export classes
export { MigrationManager, MigrationRegistry, BaseMigration };
// Export instances
export { registry, manager as migrationManager };
// Export migrations
export { initialMigration };
// Export current version
export const CURRENT_VERSION = initialMigration.version;
// Helper functions
export function getCurrentVersion() {
    return CURRENT_VERSION;
}
export function isLatestVersion(version) {
    return version === CURRENT_VERSION;
}
export function needsMigration(version) {
    return version !== CURRENT_VERSION;
}
export async function migrateToLatest(data) {
    return manager.migrate(data, CURRENT_VERSION);
}
//# sourceMappingURL=index.js.map