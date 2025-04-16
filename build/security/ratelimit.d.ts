import { RateLimitRule } from './types.js';
/**
 * Rate limiter options
 */
interface RateLimiterOptions {
    enabled: boolean;
    rules: RateLimitRule[];
    storage: {
        type: 'memory' | 'redis';
        options?: any;
    };
}
/**
 * Rate limiter
 * Handles request rate limiting based on configured rules
 */
export declare class RateLimiter {
    private enabled;
    private rules;
    private storage;
    private cleanupInterval?;
    constructor(options: RateLimiterOptions);
    /**
     * Initialize rate limiter
     */
    initialize(): Promise<void>;
    /**
     * Check if request is allowed
     */
    checkLimit(resource: string, context: {
        userId?: string;
        clientId?: string;
        machineId?: string;
    }): Promise<{
        allowed: boolean;
        remaining: number;
        resetAt: Date;
    }>;
    /**
     * Record request
     */
    recordRequest(resource: string, context: {
        userId?: string;
        clientId?: string;
        machineId?: string;
    }): Promise<void>;
    /**
     * Close rate limiter
     */
    close(): Promise<void>;
    /**
     * Create storage backend
     */
    private createStorage;
    /**
     * Get applicable rules for resource and context
     */
    private getApplicableRules;
    /**
     * Check if request is allowed by rule
     */
    private checkRule;
    /**
     * Update rule state for request
     */
    private updateRuleState;
    /**
     * Get storage key for rule state
     */
    private getStateKey;
    /**
     * Match resource against pattern
     */
    private matchResource;
}
export {};
