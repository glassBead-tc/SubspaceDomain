import { MachineIdProvider, MachineIdOptions } from '../types.js';
/**
 * macOS machine ID provider
 * Uses IOPlatformUUID from IOKit registry
 */
export declare class MacOSMachineIdProvider implements MachineIdProvider {
    private cacheFile;
    private cachedId;
    private validationPattern;
    constructor(options?: MachineIdOptions);
    /**
     * Get machine ID from IOKit registry
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
export declare const macOSProvider: MacOSMachineIdProvider;
