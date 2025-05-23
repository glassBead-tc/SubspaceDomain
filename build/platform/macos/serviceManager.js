import { promises as fs } from 'fs';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MacOSDirectoryManager, DEFAULT_MACOS_PATHS } from './directoryManager.js';
const execAsync = promisify(exec);
/**
 * Service status
 */
export var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["RUNNING"] = "running";
    ServiceStatus["STOPPED"] = "stopped";
    ServiceStatus["NOT_INSTALLED"] = "not_installed";
    ServiceStatus["UNKNOWN"] = "unknown";
})(ServiceStatus || (ServiceStatus = {}));
/**
 * Service error types
 */
export var ServiceErrorType;
(function (ServiceErrorType) {
    ServiceErrorType["INSTALLATION_FAILED"] = "installation_failed";
    ServiceErrorType["UNINSTALLATION_FAILED"] = "uninstallation_failed";
    ServiceErrorType["START_FAILED"] = "start_failed";
    ServiceErrorType["STOP_FAILED"] = "stop_failed";
    ServiceErrorType["STATUS_CHECK_FAILED"] = "status_check_failed";
})(ServiceErrorType || (ServiceErrorType = {}));
/**
 * Service error
 */
export class ServiceError extends Error {
    constructor(type, message, metadata) {
        super(message);
        this.type = type;
        this.metadata = metadata;
        this.name = 'ServiceError';
    }
}
/**
 * macOS Service Manager
 * Handles installation and management of macOS LaunchAgent service
 */
export class MacOSServiceManager {
    constructor(config = {}) {
        this.config = {
            ...DEFAULT_MACOS_PATHS,
            ...config,
            autoStart: config.autoStart !== false,
            keepAlive: config.keepAlive !== false,
            runAtLoad: config.runAtLoad !== false
        };
        this.directoryManager = new MacOSDirectoryManager(config);
    }
    /**
     * Initialize service manager
     */
    async initialize() {
        await this.directoryManager.initialize();
    }
    /**
     * Install service as LaunchAgent
     * @param execPath Path to the executable
     */
    async install(execPath) {
        try {
            // Create LaunchAgent plist
            const plistContent = this.generateLaunchAgentPlist(execPath);
            // Ensure LaunchAgent directory exists
            const launchAgentPath = this.directoryManager.getLaunchAgentPath();
            await fs.mkdir(dirname(launchAgentPath), { recursive: true });
            // Write plist file
            await fs.writeFile(launchAgentPath, plistContent);
            // Set permissions
            await fs.chmod(launchAgentPath, 0o644);
            console.log(`LaunchAgent installed at ${launchAgentPath}`);
            // Load service if autoStart is enabled
            if (this.config.autoStart) {
                await this.start();
            }
        }
        catch (error) {
            throw new ServiceError(ServiceErrorType.INSTALLATION_FAILED, 'Failed to install LaunchAgent', error);
        }
    }
    /**
     * Uninstall service
     */
    async uninstall() {
        try {
            // Stop service first
            await this.stop();
            // Remove plist file
            const launchAgentPath = this.directoryManager.getLaunchAgentPath();
            await fs.unlink(launchAgentPath);
            console.log(`LaunchAgent uninstalled from ${launchAgentPath}`);
        }
        catch (error) {
            throw new ServiceError(ServiceErrorType.UNINSTALLATION_FAILED, 'Failed to uninstall LaunchAgent', error);
        }
    }
    /**
     * Start service
     */
    async start() {
        try {
            const launchAgentPath = this.directoryManager.getLaunchAgentPath();
            // Check if service is already running
            const status = await this.getStatus();
            if (status === ServiceStatus.RUNNING) {
                console.log('Service is already running');
                return;
            }
            // Load service
            await execAsync(`launchctl load -w ${launchAgentPath}`);
            console.log('Service started');
        }
        catch (error) {
            throw new ServiceError(ServiceErrorType.START_FAILED, 'Failed to start service', error);
        }
    }
    /**
     * Stop service
     */
    async stop() {
        try {
            const launchAgentPath = this.directoryManager.getLaunchAgentPath();
            // Check if service is running
            const status = await this.getStatus();
            if (status !== ServiceStatus.RUNNING) {
                console.log('Service is not running');
                return;
            }
            // Unload service
            await execAsync(`launchctl unload -w ${launchAgentPath}`);
            console.log('Service stopped');
        }
        catch (error) {
            throw new ServiceError(ServiceErrorType.STOP_FAILED, 'Failed to stop service', error);
        }
    }
    /**
     * Restart service
     */
    async restart() {
        await this.stop();
        await this.start();
    }
    /**
     * Get service status
     */
    async getStatus() {
        try {
            // Get service label from plist name
            const plistName = this.config.launchAgentName || DEFAULT_MACOS_PATHS.launchAgentName;
            const serviceLabel = plistName.replace('.plist', '');
            // Check if plist file exists
            const launchAgentPath = this.directoryManager.getLaunchAgentPath();
            try {
                await fs.access(launchAgentPath);
            }
            catch {
                return ServiceStatus.NOT_INSTALLED;
            }
            // Check if service is running
            const { stdout } = await execAsync(`launchctl list | grep ${serviceLabel}`);
            return stdout.trim() ? ServiceStatus.RUNNING : ServiceStatus.STOPPED;
        }
        catch (error) {
            // If grep returns non-zero exit code, service is not running
            if (error instanceof Error && 'code' in error && error.code === 1) {
                return ServiceStatus.STOPPED;
            }
            // For other errors, return unknown
            console.error('Failed to check service status:', error);
            return ServiceStatus.UNKNOWN;
        }
    }
    /**
     * Generate LaunchAgent plist content
     * @param execPath Path to the executable
     */
    generateLaunchAgentPlist(execPath) {
        // Get service label from plist name
        const plistName = this.config.launchAgentName || DEFAULT_MACOS_PATHS.launchAgentName;
        const serviceLabel = plistName.replace('.plist', '');
        // Get socket path
        const socketPath = this.directoryManager.getSocketPath();
        // Get log file path
        const logFilePath = this.directoryManager.getLogFilePath();
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${serviceLabel}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${execPath}</string>
        <string>--transport</string>
        <string>unix-socket</string>
        <string>--socket-path</string>
        <string>${socketPath}</string>
    </array>
    <key>RunAtLoad</key>
    <${this.config.runAtLoad ? 'true' : 'false'}/>
    <key>KeepAlive</key>
    <${this.config.keepAlive ? 'true' : 'false'}/>
    <key>StandardOutPath</key>
    <string>${logFilePath}</string>
    <key>StandardErrorPath</key>
    <string>${logFilePath}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>${dirname(execPath)}</string>
</dict>
</plist>`;
    }
}
// Export singleton instance with default config
export const macOSServiceManager = new MacOSServiceManager();
//# sourceMappingURL=serviceManager.js.map