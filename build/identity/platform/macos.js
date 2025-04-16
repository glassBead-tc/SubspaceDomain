import { promisify } from 'util';
import { exec } from 'child_process';
import { promises as fsPromises, readFileSync, unlinkSync } from 'fs';
import { IdentityError, IdentityErrorType } from '../types.js';
const execAsync = promisify(exec);
/**
 * macOS machine ID provider
 * Uses IOPlatformUUID from IOKit registry
 */
export class MacOSMachineIdProvider {
    constructor(options = {}) {
        this.cachedId = null;
        this.cacheFile = options.cacheFile || '.machine-id';
        this.validationPattern = options.validationRules?.pattern ||
            /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
    }
    /**
     * Get machine ID from IOKit registry
     */
    async getId() {
        try {
            // Check cache first
            const cached = this.getCached();
            if (cached) {
                return cached;
            }
            // Get IOPlatformUUID using ioreg command
            const { stdout } = await execAsync('ioreg -d2 -c IOPlatformExpertDevice | awk -F\\" \'/IOPlatformUUID/{print $(NF-1)}\'');
            // Clean up output
            const id = stdout.trim();
            // Validate ID
            if (!this.validate(id)) {
                throw new IdentityError(IdentityErrorType.MACHINE_ID_INVALID, 'Invalid machine ID format');
            }
            // Cache ID
            await this.cacheId(id);
            return id;
        }
        catch (error) {
            if (error instanceof IdentityError) {
                throw error;
            }
            // Try fallback methods if command fails
            const fallbackId = await this.getFallbackId();
            if (fallbackId) {
                return fallbackId;
            }
            throw new IdentityError(IdentityErrorType.MACHINE_ID_NOT_FOUND, 'Failed to get machine ID', error);
        }
    }
    /**
     * Validate machine ID format
     */
    validate(id) {
        if (!id)
            return false;
        return this.validationPattern.test(id);
    }
    /**
     * Get cached machine ID
     */
    getCached() {
        if (this.cachedId) {
            return this.cachedId;
        }
        try {
            const cached = readFileSync(this.cacheFile, 'utf8').trim();
            if (this.validate(cached)) {
                this.cachedId = cached;
                return cached;
            }
        }
        catch {
            // Ignore cache read errors
        }
        return null;
    }
    /**
     * Clear cached machine ID
     */
    clearCache() {
        this.cachedId = null;
        try {
            unlinkSync(this.cacheFile);
        }
        catch {
            // Ignore cache delete errors
        }
    }
    /**
     * Cache machine ID to file
     */
    async cacheId(id) {
        try {
            await fsPromises.writeFile(this.cacheFile, id, {
                mode: 0o600 // User read/write only
            });
            this.cachedId = id;
        }
        catch {
            // Ignore cache write errors
        }
    }
    /**
     * Get machine ID using fallback methods
     */
    async getFallbackId() {
        try {
            // Try system_profiler
            const { stdout } = await execAsync('system_profiler SPHardwareDataType | awk \'/Hardware UUID/{print $3}\'');
            const id = stdout.trim();
            if (this.validate(id)) {
                return id;
            }
        }
        catch {
            // Ignore fallback errors
        }
        return null;
    }
}
// Export singleton instance
export const macOSProvider = new MacOSMachineIdProvider();
//# sourceMappingURL=macos.js.map