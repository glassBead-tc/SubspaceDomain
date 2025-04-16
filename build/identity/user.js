import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { IdentityError, IdentityErrorType } from './types.js';
import { defaultProvider as machineIdProvider } from './platform/index.js';
/**
 * User identity manager
 */
export class UserManager {
    constructor(options) {
        this.initialized = false;
        this.storage = options.storage;
        this.validationRules = options.validationRules || {};
        this.userDataPath = options.userDataPath || join(this.storage.directory, 'users');
    }
    /**
     * Initialize user manager
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            // Create user data directory if it doesn't exist
            await fs.mkdir(this.userDataPath, { recursive: true });
            this.initialized = true;
        }
        catch (error) {
            throw new IdentityError(IdentityErrorType.USER_INVALID, 'Failed to initialize user manager', error);
        }
    }
    /**
     * Create new user identity
     */
    async createUser(machineId) {
        if (!this.initialized) {
            throw new IdentityError(IdentityErrorType.USER_INVALID, 'User manager not initialized');
        }
        try {
            // Get and validate machine ID
            const currentMachineId = machineId || await machineIdProvider.getId();
            if (!machineIdProvider.validate(currentMachineId)) {
                throw new IdentityError(IdentityErrorType.USER_INVALID, 'Invalid machine ID');
            }
            // Generate user ID
            const userId = await this.generateUserId(currentMachineId);
            // Create user identity
            const user = {
                id: userId,
                machineIds: [currentMachineId],
                preferences: this.getDefaultPreferences(),
                created: new Date(),
                lastSeen: new Date(),
                sessions: []
            };
            // Validate user
            if (!this.validateUser(user)) {
                throw new IdentityError(IdentityErrorType.USER_INVALID, 'Invalid user data');
            }
            // Store user
            await this.storage.write(join(this.userDataPath, `${userId}.json`), user);
            return user;
        }
        catch (error) {
            if (error instanceof IdentityError) {
                throw error;
            }
            throw new IdentityError(IdentityErrorType.USER_INVALID, 'Failed to create user', error);
        }
    }
    /**
     * Get user by ID
     */
    async getUser(userId) {
        try {
            const user = await this.storage.read(join(this.userDataPath, `${userId}.json`));
            if (!this.validateUser(user)) {
                throw new IdentityError(IdentityErrorType.USER_INVALID, 'Invalid user data');
            }
            return user;
        }
        catch (error) {
            if (error instanceof IdentityError) {
                throw error;
            }
            throw new IdentityError(IdentityErrorType.USER_NOT_FOUND, 'User not found', error);
        }
    }
    /**
     * Get user by machine ID
     */
    async getUserByMachine(machineId) {
        try {
            // List all user files
            const userFiles = await fs.readdir(this.userDataPath);
            // Find user with matching machine ID
            for (const file of userFiles) {
                if (!file.endsWith('.json'))
                    continue;
                const user = await this.storage.read(join(this.userDataPath, file));
                if (user.machineIds.includes(machineId)) {
                    return user;
                }
            }
            throw new IdentityError(IdentityErrorType.USER_NOT_FOUND, 'No user found for machine ID');
        }
        catch (error) {
            if (error instanceof IdentityError) {
                throw error;
            }
            throw new IdentityError(IdentityErrorType.USER_NOT_FOUND, 'Failed to find user', error);
        }
    }
    /**
     * Update user
     */
    async updateUser(userId, updates) {
        try {
            const user = await this.getUser(userId);
            // Apply updates
            const updated = {
                ...user,
                ...updates,
                lastSeen: new Date()
            };
            // Validate updated user
            if (!this.validateUser(updated)) {
                throw new IdentityError(IdentityErrorType.USER_INVALID, 'Invalid user data');
            }
            // Store updated user
            await this.storage.write(join(this.userDataPath, `${userId}.json`), updated);
            return updated;
        }
        catch (error) {
            if (error instanceof IdentityError) {
                throw error;
            }
            throw new IdentityError(IdentityErrorType.USER_INVALID, 'Failed to update user', error);
        }
    }
    /**
     * Delete user
     */
    async deleteUser(userId) {
        try {
            await this.storage.delete(join(this.userDataPath, `${userId}.json`));
        }
        catch (error) {
            throw new IdentityError(IdentityErrorType.USER_NOT_FOUND, 'Failed to delete user', error);
        }
    }
    /**
     * Generate user ID
     */
    async generateUserId(machineId) {
        // Create hash from machine ID and timestamp
        const hash = createHash('sha256')
            .update(`${machineId}:${Date.now()}`)
            .digest('hex');
        // Use first 16 characters as user ID
        return hash.slice(0, 16);
    }
    /**
     * Get default user preferences
     */
    getDefaultPreferences() {
        return {
            defaultClientType: 'claude',
            autoStartClients: false,
            clientSettings: {
                claude: {
                    startupTimeout: 30000,
                    healthCheckInterval: 30000,
                    maxRetries: 3
                },
                cline: {
                    startupTimeout: 30000,
                    healthCheckInterval: 30000,
                    maxRetries: 3
                }
            }
        };
    }
    /**
     * Validate user data
     */
    validateUser(user) {
        try {
            // Basic structure validation
            if (!user || typeof user !== 'object')
                return false;
            if (!user.id || typeof user.id !== 'string')
                return false;
            if (!Array.isArray(user.machineIds))
                return false;
            if (!user.preferences || typeof user.preferences !== 'object')
                return false;
            if (!(user.created instanceof Date))
                return false;
            if (!(user.lastSeen instanceof Date))
                return false;
            if (!Array.isArray(user.sessions))
                return false;
            // ID format validation
            if (this.validationRules.userId?.pattern) {
                if (!this.validationRules.userId.pattern.test(user.id)) {
                    return false;
                }
            }
            // Machine ID validation
            if (user.machineIds.length === 0)
                return false;
            for (const machineId of user.machineIds) {
                if (typeof machineId !== 'string' || !machineIdProvider.validate(machineId)) {
                    return false;
                }
            }
            // Preferences validation
            const prefs = user.preferences;
            if (!prefs.defaultClientType || !['claude', 'cline'].includes(prefs.defaultClientType)) {
                return false;
            }
            if (!prefs.clientSettings)
                return false;
            for (const [clientType, settings] of Object.entries(prefs.clientSettings)) {
                if (!['claude', 'cline'].includes(clientType))
                    return false;
                if (typeof settings !== 'object')
                    return false;
                if (typeof settings.startupTimeout !== 'number' || settings.startupTimeout <= 0)
                    return false;
                if (typeof settings.healthCheckInterval !== 'number' || settings.healthCheckInterval <= 0)
                    return false;
                if (typeof settings.maxRetries !== 'number' || settings.maxRetries <= 0)
                    return false;
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
//# sourceMappingURL=user.js.map