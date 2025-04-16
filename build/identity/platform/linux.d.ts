import { MachineIdProvider, MachineIdOptions } from '../types.js';
/**
 * Linux machine ID provider
 * Uses /etc/machine-id or /var/lib/dbus/machine-id
 */
export declare class LinuxMachineIdProvider implements MachineIdProvider {
    private cacheFile;
    private cachedId;
    private validationPattern;
    private readonly machineIdPaths;
    constructor(options?: MachineIdOptions);
    /**
     * Get machine ID from system files
     */
    getId(): Promise<string>;
    /**
     * Validate machine ID format
     */
    validate(id: string): boolean;
    /**
     * Get cached machine ID
     */
    getCached(): string | null;
    /**
     * Clear cached machine ID
     */
    clearCache(): void;
    /**
     * Cache machine ID to file
     */
    private cacheId;
    /**
     * Get machine ID using fallback methods
     */
    private getFallbackId;
}
export declare const linuxProvider: LinuxMachineIdProvider;
