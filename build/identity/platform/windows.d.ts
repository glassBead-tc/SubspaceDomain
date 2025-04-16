import { MachineIdProvider, MachineIdOptions } from '../types.js';
/**
 * Windows machine ID provider
 * Uses WMI to get system UUID
 */
export declare class WindowsMachineIdProvider implements MachineIdProvider {
    private cacheFile;
    private cachedId;
    private validationPattern;
    constructor(options?: MachineIdOptions);
    /**
     * Get machine ID using WMI
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
export declare const windowsProvider: WindowsMachineIdProvider;
