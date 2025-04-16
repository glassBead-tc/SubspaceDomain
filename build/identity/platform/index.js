import { platform } from 'os';
import { IdentityError, IdentityErrorType } from '../types.js';
import { MacOSMachineIdProvider, macOSProvider } from './macos.js';
import { LinuxMachineIdProvider, linuxProvider } from './linux.js';
import { WindowsMachineIdProvider, windowsProvider } from './windows.js';
/**
 * Get platform-specific machine ID provider
 */
export function getMachineIdProvider(options) {
    const os = platform();
    switch (os) {
        case 'darwin':
            return new MacOSMachineIdProvider(options);
        case 'linux':
            return new LinuxMachineIdProvider(options);
        case 'win32':
            return new WindowsMachineIdProvider(options);
        default:
            throw new IdentityError(IdentityErrorType.MACHINE_ID_NOT_FOUND, `Unsupported platform: ${os}`);
    }
}
/**
 * Default provider instance for current platform
 */
export const defaultProvider = getMachineIdProvider();
// Export platform-specific providers
export { MacOSMachineIdProvider, LinuxMachineIdProvider, WindowsMachineIdProvider, macOSProvider, linuxProvider, windowsProvider };
// Export platform detection utilities
export function isMacOS() {
    return platform() === 'darwin';
}
export function isLinux() {
    return platform() === 'linux';
}
export function isWindows() {
    return platform() === 'win32';
}
/**
 * Get current platform name
 */
export function getPlatformName() {
    const os = platform();
    switch (os) {
        case 'darwin':
            return 'macOS';
        case 'linux':
            return 'Linux';
        case 'win32':
            return 'Windows';
        default:
            return os;
    }
}
/**
 * Get platform-specific paths
 */
export function getPlatformPaths() {
    const os = platform();
    switch (os) {
        case 'darwin':
            return {
                cacheDir: '~/Library/Caches/mcp-bridge',
                configDir: '~/Library/Application Support/mcp-bridge',
                dataDir: '~/Library/Application Support/mcp-bridge/data'
            };
        case 'linux':
            return {
                cacheDir: '~/.cache/mcp-bridge',
                configDir: '~/.config/mcp-bridge',
                dataDir: '~/.local/share/mcp-bridge'
            };
        case 'win32':
            return {
                cacheDir: '%LOCALAPPDATA%\\mcp-bridge\\cache',
                configDir: '%APPDATA%\\mcp-bridge',
                dataDir: '%LOCALAPPDATA%\\mcp-bridge\\data'
            };
        default:
            throw new IdentityError(IdentityErrorType.MACHINE_ID_NOT_FOUND, `Unsupported platform: ${os}`);
    }
}
/**
 * Get platform-specific validation rules
 */
export function getPlatformValidationRules() {
    const os = platform();
    switch (os) {
        case 'darwin':
            return {
                pattern: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
            };
        case 'linux':
            return {
                pattern: /^[0-9a-f]{32}$/i
            };
        case 'win32':
            return {
                pattern: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
            };
        default:
            throw new IdentityError(IdentityErrorType.MACHINE_ID_NOT_FOUND, `Unsupported platform: ${os}`);
    }
}
//# sourceMappingURL=index.js.map