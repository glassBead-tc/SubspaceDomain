import { PersistentStorage } from '../storage/persistentStorage.js';
import { ClientIdentity, ValidationRules } from './types.js';
import { UserManager } from './user.js';
/**
 * Client identity manager options
 */
interface ClientManagerOptions {
    storage: PersistentStorage;
    userManager: UserManager;
    validationRules?: ValidationRules;
    clientDataPath?: string;
}
/**
 * Client identity manager
 */
export declare class ClientManager {
    private storage;
    private userManager;
    private validationRules;
    private clientDataPath;
    constructor(options: ClientManagerOptions);
    /**
     * Create new client identity
     */
    createClient(userId: string, clientType: 'claude' | 'cline', machineId?: string): Promise<ClientIdentity>;
    /**
     * Get client by ID
     */
    getClient(clientId: string): Promise<ClientIdentity>;
    /**
     * Get clients by user ID
     */
    getClientsByUser(userId: string): Promise<ClientIdentity[]>;
    /**
     * Update client
     */
    updateClient(clientId: string, updates: Partial<ClientIdentity>): Promise<ClientIdentity>;
    /**
     * Delete client
     */
    deleteClient(clientId: string): Promise<void>;
    /**
     * Generate client ID
     */
    private generateClientId;
    /**
     * Get next instance number for client type on machine
     */
    private getNextInstanceNumber;
    /**
     * Get client file path
     */
    private getClientPath;
    /**
     * Validate client data
     */
    private validateClient;
}
export {};
