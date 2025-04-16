import { RegistrationConfig, RegistrationRequest, RegistrationResponse, RegistrationRecord } from './types.js';
/**
 * Registration manager
 * Handles client registration workflow and persistence
 */
export declare class RegistrationManager {
    private enabled;
    private storage;
    private autoApprove;
    private expiration;
    private maxAttempts;
    private hooks;
    private cleanupInterval?;
    constructor(config: RegistrationConfig);
    /**
     * Initialize registration manager
     */
    initialize(): Promise<void>;
    /**
     * Handle registration request
     */
    handleRequest(request: RegistrationRequest): Promise<RegistrationResponse>;
    /**
     * Approve registration
     */
    approve(id: string): Promise<void>;
    /**
     * Reject registration
     */
    reject(id: string, message?: string): Promise<void>;
    /**
     * Get registration record
     */
    getRecord(id: string): Promise<RegistrationRecord>;
    /**
     * List registration records
     */
    listRecords(): Promise<RegistrationRecord[]>;
    /**
     * Close registration manager
     */
    close(): Promise<void>;
    /**
     * Create registration record
     */
    private createRecord;
    /**
     * Check if request should be auto-approved
     */
    private shouldAutoApprove;
    /**
     * Clean up expired records
     */
    private cleanupExpired;
}
