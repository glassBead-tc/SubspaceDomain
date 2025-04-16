import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Logger } from '../utils/logger.js';
/**
 * Client storage error types
 */
export var ClientStorageErrorType;
(function (ClientStorageErrorType) {
    ClientStorageErrorType["INITIALIZATION_FAILED"] = "initialization_failed";
    ClientStorageErrorType["SAVE_FAILED"] = "save_failed";
    ClientStorageErrorType["LOAD_FAILED"] = "load_failed";
    ClientStorageErrorType["DELETE_FAILED"] = "delete_failed";
    ClientStorageErrorType["LIST_FAILED"] = "list_failed";
})(ClientStorageErrorType || (ClientStorageErrorType = {}));
/**
 * Client storage error
 */
export class ClientStorageError extends Error {
    constructor(type, message, metadata) {
        super(message);
        this.type = type;
        this.metadata = metadata;
        this.name = 'ClientStorageError';
    }
}
/**
 * Client storage
 * Handles persistence of client information
 */
export class ClientStorage {
    constructor(options) {
        this.storageDir = options.storageDir;
        this.fileExtension = options.fileExtension || '.json';
        this.logger = new Logger({ prefix: 'ClientStorage' });
    }
    /**
     * Initialize storage
     */
    async initialize() {
        try {
            this.logger.info(`Initializing client storage at ${this.storageDir}`);
            await fs.mkdir(this.storageDir, { recursive: true });
            this.logger.info('Client storage initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize client storage:', error);
            throw new ClientStorageError(ClientStorageErrorType.INITIALIZATION_FAILED, 'Failed to initialize client storage', error);
        }
    }
    /**
     * Save client information
     */
    async saveClient(client) {
        try {
            const filePath = this.getClientFilePath(client.id);
            this.logger.debug(`Saving client ${client.id} to ${filePath}`);
            // Create directory if it doesn't exist
            await fs.mkdir(dirname(filePath), { recursive: true });
            // Save client data
            await fs.writeFile(filePath, JSON.stringify(client, null, 2), 'utf-8');
            this.logger.debug(`Client ${client.id} saved successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to save client ${client.id}:`, error);
            throw new ClientStorageError(ClientStorageErrorType.SAVE_FAILED, `Failed to save client ${client.id}`, error);
        }
    }
    /**
     * Load client information
     */
    async loadClient(clientId) {
        try {
            const filePath = this.getClientFilePath(clientId);
            this.logger.debug(`Loading client ${clientId} from ${filePath}`);
            // Read client data
            const data = await fs.readFile(filePath, 'utf-8');
            // Parse and return
            const client = JSON.parse(data);
            this.logger.debug(`Client ${clientId} loaded successfully`);
            return client;
        }
        catch (error) {
            // If file doesn't exist, return null
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                this.logger.debug(`Client ${clientId} not found`);
                return null;
            }
            this.logger.error(`Failed to load client ${clientId}:`, error);
            throw new ClientStorageError(ClientStorageErrorType.LOAD_FAILED, `Failed to load client ${clientId}`, error);
        }
    }
    /**
     * Delete client information
     */
    async deleteClient(clientId) {
        try {
            const filePath = this.getClientFilePath(clientId);
            this.logger.debug(`Deleting client ${clientId} from ${filePath}`);
            // Delete client data
            await fs.unlink(filePath);
            this.logger.debug(`Client ${clientId} deleted successfully`);
        }
        catch (error) {
            // Ignore if file doesn't exist
            if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
                this.logger.error(`Failed to delete client ${clientId}:`, error);
                throw new ClientStorageError(ClientStorageErrorType.DELETE_FAILED, `Failed to delete client ${clientId}`, error);
            }
            else if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                this.logger.debug(`Client ${clientId} already deleted or not found`);
            }
        }
    }
    /**
     * List all clients
     */
    async listClients() {
        try {
            this.logger.debug(`Listing clients in ${this.storageDir}`);
            // Read directory
            const files = await fs.readdir(this.storageDir);
            // Filter by extension
            const clientFiles = files.filter(file => file.endsWith(this.fileExtension));
            this.logger.debug(`Found ${clientFiles.length} client files`);
            // Load each client
            const clients = [];
            for (const file of clientFiles) {
                const clientId = file.slice(0, -this.fileExtension.length);
                const client = await this.loadClient(clientId);
                if (client) {
                    clients.push(client);
                }
            }
            this.logger.debug(`Successfully loaded ${clients.length} clients`);
            return clients;
        }
        catch (error) {
            // If directory doesn't exist, return empty array
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                this.logger.debug(`Storage directory ${this.storageDir} does not exist, returning empty list`);
                return [];
            }
            this.logger.error('Failed to list clients:', error);
            throw new ClientStorageError(ClientStorageErrorType.LIST_FAILED, 'Failed to list clients', error);
        }
    }
    /**
     * Get client file path
     */
    getClientFilePath(clientId) {
        return join(this.storageDir, `${clientId}${this.fileExtension}`);
    }
}
//# sourceMappingURL=clientStorage.js.map