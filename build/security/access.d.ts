import { AccessRule, AccessLevel } from './types.js';
/**
 * Access control manager options
 */
interface AccessControlManagerOptions {
    rules: AccessRule[];
    defaultLevel: AccessLevel;
}
/**
 * Access control manager
 * Handles access control rules and permissions
 */
export declare class AccessControlManager {
    private rules;
    private defaultLevel;
    constructor(options: AccessControlManagerOptions);
    /**
     * Check access permission
     */
    checkAccess(resource: string, level: AccessLevel, context: {
        userId?: string;
        clientId?: string;
        machineId?: string;
        timestamp?: Date;
        ip?: string;
        location?: string;
    }): boolean;
    /**
     * Add access rule
     */
    addRule(rule: AccessRule): void;
    /**
     * Remove access rule
     */
    removeRule(rule: AccessRule): void;
    /**
     * Get applicable rules for resource and context
     */
    private getApplicableRules;
    /**
     * Match resource against patterns
     */
    private matchResource;
    /**
     * Match IP address against patterns
     */
    private matchIpAddress;
    /**
     * Match IP address against CIDR pattern
     */
    private matchCidr;
    /**
     * Convert IP address to number
     */
    private ipToNumber;
    /**
     * Validate access rules
     */
    private validateRules;
    /**
     * Validate single access rule
     */
    private validateRule;
}
export {};
