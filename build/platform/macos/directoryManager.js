import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
/**
 * Default macOS directory paths
 */
export const DEFAULT_MACOS_PATHS = {
    baseDir: join(homedir(), 'Library', 'Application Support', 'mcp-bridge'),
    cacheDir: join(homedir(), 'Library', 'Caches', 'mcp-bridge'),
    logsDir: join(homedir(), 'Library', 'Logs', 'mcp-bridge'),
    socketPath: '/tmp/mcp-bridge.sock',
    launchAgentDir: join(homedir(), 'Library', 'LaunchAgents'),
    launchAgentName: 'com.mcp-bridge.plist'
};
/**
 * macOS Directory Manager
 * Handles creation and management of macOS-specific directories
 */
export class MacOSDirectoryManager {
    constructor(config = {}) {
        this.config = {
            ...DEFAULT_MACOS_PATHS,
            ...config
        };
    }
    /**
     * Initialize directory structure
     * Creates all required directories for macOS service
     */
    async initialize() {
        await this.createDirectories();
    }
    /**
     * Create all required directories
     */
    async createDirectories() {
        const dirs = [
            this.getBaseDir(),
            this.getCacheDir(),
            this.getLogsDir(),
            join(this.getBaseDir(), 'data'),
            join(this.getBaseDir(), 'config')
        ];
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }
    /**
     * Get base directory path
     */
    getBaseDir() {
        return this.config.baseDir || DEFAULT_MACOS_PATHS.baseDir;
    }
    /**
     * Get cache directory path
     */
    getCacheDir() {
        return this.config.cacheDir || DEFAULT_MACOS_PATHS.cacheDir;
    }
    /**
     * Get logs directory path
     */
    getLogsDir() {
        return this.config.logsDir || DEFAULT_MACOS_PATHS.logsDir;
    }
    /**
     * Get socket path
     */
    getSocketPath() {
        return this.config.socketPath || DEFAULT_MACOS_PATHS.socketPath;
    }
    /**
     * Get LaunchAgent directory path
     */
    getLaunchAgentDir() {
        return this.config.launchAgentDir || DEFAULT_MACOS_PATHS.launchAgentDir;
    }
    /**
     * Get LaunchAgent file path
     */
    getLaunchAgentPath() {
        const dir = this.getLaunchAgentDir();
        const name = this.config.launchAgentName || DEFAULT_MACOS_PATHS.launchAgentName;
        return join(dir, name);
    }
    /**
     * Get config file path
     */
    getConfigPath() {
        return join(this.getBaseDir(), 'config', 'config.json');
    }
    /**
     * Get client registration storage path
     */
    getClientStoragePath() {
        return join(this.getBaseDir(), 'data', 'clients');
    }
    /**
     * Get log file path
     */
    getLogFilePath() {
        return join(this.getLogsDir(), 'mcp-bridge.log');
    }
    /**
     * Check if directories exist
     */
    async checkDirectories() {
        try {
            await fs.access(this.getBaseDir());
            await fs.access(this.getCacheDir());
            await fs.access(this.getLogsDir());
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Clean up directories
     * @param removeData Whether to remove data directory
     */
    async cleanup(removeData = false) {
        // Always clean cache
        try {
            await fs.rm(this.getCacheDir(), { recursive: true, force: true });
        }
        catch {
            // Ignore errors
        }
        // Optionally clean data
        if (removeData) {
            try {
                await fs.rm(join(this.getBaseDir(), 'data'), { recursive: true, force: true });
            }
            catch {
                // Ignore errors
            }
        }
    }
}
// Export singleton instance with default config
export const macOSDirectoryManager = new MacOSDirectoryManager();
//# sourceMappingURL=directoryManager.js.map