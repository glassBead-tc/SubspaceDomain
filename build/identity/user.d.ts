import { PersistentStorage } from '../storage/persistentStorage.js';
import { UserIdentity, ValidationRules } from './types.js';
/**
 * User identity manager options
 */
interface UserManagerOptions {
    storage: PersistentStorage;
    validationRules?: ValidationRules;
    userDataPath?: string;
}
/**
 * User identity manager
 */
export declare class UserManager {
    private storage;
    private validationRules;
    private userDataPath;
    private initialized;
    constructor(options: UserManagerOptions);
    /**
     * Initialize user manager
     */
    initialize(): Promise<void>;
    /**
     * Create new user identity
     */
    createUser(machineId?: string): Promise<UserIdentity>;
    /**
     * Get user by ID
     */
    getUser(userId: string): Promise<UserIdentity>;
    /**
     * Get user by machine ID
     */
    getUserByMachine(machineId: string): Promise<UserIdentity>;
    /**
     * Update user
     */
    updateUser(userId: string, updates: Partial<UserIdentity>): Promise<UserIdentity>;
    /**
     * Delete user
     */
    deleteUser(userId: string): Promise<void>;
    /**
     * Generate user ID
     */
    private generateUserId;
    /**
     * Get default user preferences
     */
    private getDefaultPreferences;
    /**
     * Validate user data
     */
    private validateUser;
}
export {};
