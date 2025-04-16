/**
 * Base migration class
 */
export class BaseMigration {
    constructor(version, description) {
        this.version = version;
        this.description = description;
    }
    /**
     * Validate data before migration
     */
    validate(data) {
        // Base validation - override for specific checks
        return (data !== null &&
            typeof data === 'object' &&
            typeof data.version === 'string' &&
            data.metadata &&
            typeof data.metadata === 'object');
    }
    /**
     * Create error with context
     */
    error(message, data) {
        return new Error(`Migration ${this.version} failed: ${message}` +
            (data ? `\nData: ${JSON.stringify(data, null, 2)}` : ''));
    }
}
/**
 * Migration registry to track available migrations
 */
export class MigrationRegistry {
    constructor() {
        this.migrations = new Map();
    }
    /**
     * Register a migration
     */
    register(migration) {
        if (this.migrations.has(migration.version)) {
            throw new Error(`Migration version ${migration.version} already registered`);
        }
        this.migrations.set(migration.version, migration);
    }
    /**
     * Get migration by version
     */
    get(version) {
        return this.migrations.get(version);
    }
    /**
     * Get all migrations
     */
    getAll() {
        return Array.from(this.migrations.values());
    }
    /**
     * Get migrations needed to upgrade from one version to another
     */
    getMigrationPath(fromVersion, toVersion) {
        const migrations = this.getAll()
            .sort((a, b) => this.compareVersions(a.version, b.version));
        const path = [];
        let current = fromVersion;
        while (current !== toVersion) {
            const next = migrations.find(m => this.compareVersions(m.version, current) > 0 &&
                this.compareVersions(m.version, toVersion) <= 0);
            if (!next) {
                throw new Error(`No migration path from ${fromVersion} to ${toVersion}`);
            }
            path.push(next);
            current = next.version;
        }
        return path;
    }
    /**
     * Compare version strings
     */
    compareVersions(a, b) {
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
    clear() {
        this.migrations.clear();
    }
}
// Export singleton instance
export const migrationRegistry = new MigrationRegistry();
//# sourceMappingURL=types.js.map