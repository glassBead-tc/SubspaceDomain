import { MachineIdProvider, MachineIdOptions } from '../types.js';
import { MacOSMachineIdProvider, macOSProvider } from './macos.js';
import { LinuxMachineIdProvider, linuxProvider } from './linux.js';
import { WindowsMachineIdProvider, windowsProvider } from './windows.js';
/**
 * Get platform-specific machine ID provider
 */
export declare function getMachineIdProvider(options?: MachineIdOptions): MachineIdProvider;
/**
 * Default provider instance for current platform
 */
export declare const defaultProvider: MachineIdProvider;
export { MacOSMachineIdProvider, LinuxMachineIdProvider, WindowsMachineIdProvider, macOSProvider, linuxProvider, windowsProvider };
export declare function isMacOS(): boolean;
export declare function isLinux(): boolean;
export declare function isWindows(): boolean;
/**
 * Get current platform name
 */
export declare function getPlatformName(): string;
/**
 * Get platform-specific paths
 */
export declare function getPlatformPaths(): {
    cacheDir: string;
    configDir: string;
    dataDir: string;
};
/**
 * Get platform-specific validation rules
 */
export declare function getPlatformValidationRules(): MachineIdOptions['validationRules'];
