import { ClientInfo } from '../types.js';
/**
 * Client storage options
 */
export interface ClientStorageOptions {
    storageDir: string;
    fileExtension?: string;
}
/**
 * Client storage error types
 */
export declare enum ClientStorageErrorType {
    INITIALIZATION_FAILED = "initialization_failed",
    SAVE_FAILED = "save_failed",
    LOAD_FAILED = "load_failed",
    DELETE_FAILED = "delete_failed",
    LIST_FAILED = "list_failed"
}
/**
 * Client storage error
 */
export declare class ClientStorageError extends Error {
    type: ClientStorageErrorType;
    metadata?: any | undefined;
    constructor(type: ClientStorageErrorType, message: string, metadata?: any | undefined);
}
/**
 * Client storage
 * Handles persistence of client information
 */
export declare class ClientStorage {
    private storageDir;
    private fileExtension;
    private logger;
    constructor(options: ClientStorageOptions);
    /**
     * Initialize storage
     */
    initialize(): Promise<void>;
    /**
     * Save client information
     */
    saveClient(client: ClientInfo): Promise<void>;
    /**
     * Load client information
     */
    loadClient(clientId: string): Promise<ClientInfo | null>;
    /**
     * Delete client information
     */
    deleteClient(clientId: string): Promise<void>;
    /**
     * List all clients
     */
    listClients(): Promise<ClientInfo[]>;
    /**
     * Get client file path
     */
    private getClientFilePath;
}
