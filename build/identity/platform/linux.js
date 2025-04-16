import { readFileSync, unlinkSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { IdentityError, IdentityErrorType } from '../types.js';
/**
 * Linux machine ID provider
 * Uses /etc/machine-id or /var/lib/dbus/machine-id
 */
export class LinuxMachineIdProvider {
    constructor(options = {}) {
        this.cachedId = null;
        this.machineIdPaths = [
            '/etc/machine-id',
            '/var/lib/dbus/machine-id'
        ];
        this.cacheFile = options.cacheFile || '.machine-id';
        this.validationPattern = options.validationRules?.pattern ||
            /^[0-9a-f]{32}$/i;
    }
    /**
     * Get machine ID from system files
     */
    async getId() {
        try {
            // Check cache first
            const cached = this.getCached();
            if (cached) {
                return cached;
            }
            // Try each machine ID path
            for (const path of this.machineIdPaths) {
                try {
                    const id = readFileSync(path, 'utf8').trim();
                    if (this.validate(id)) {
                        // Cache valid ID
                        await this.cacheId(id);
                        return id;
                    }
                }
                catch {
                    // Try next path
                    continue;
                }
            }
            // Try fallback methods if no valid ID found
            const fallbackId = await this.getFallbackId();
            if (fallbackId) {
                return fallbackId;
            }
            throw new IdentityError(IdentityErrorType.MACHINE_ID_NOT_FOUND, 'No valid machine ID found');
        }
        catch (error) {
            if (error instanceof IdentityError) {
                throw error;
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
            // Try reading DMI system UUID
            const sysUuid = readFileSync('/sys/class/dmi/id/product_uuid', 'utf8')
                .trim()
                .toLowerCase()
                .replace(/-/g, '');
            if (this.validate(sysUuid)) {
                return sysUuid;
            }
        }
        catch {
            // Ignore fallback errors
        }
        try {
            // Try reading motherboard serial
            const mbSerial = readFileSync('/sys/class/dmi/id/board_serial', 'utf8')
                .trim()
                .toLowerCase()
                .replace(/[^0-9a-f]/g, '')
                .padEnd(32, '0')
                .slice(0, 32);
            if (this.validate(mbSerial)) {
                return mbSerial;
            }
        }
        catch {
            // Ignore fallback errors
        }
        return null;
    }
}
// Export singleton instance
export const linuxProvider = new LinuxMachineIdProvider();
//# sourceMappingURL=linux.js.map