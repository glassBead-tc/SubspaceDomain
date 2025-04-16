import { SecurityError, SecurityErrorType } from './types.js';
/**
 * Memory-based rate limit storage
 */
class MemoryStorage {
    constructor() {
        this.storage = new Map();
    }
    async get(key) {
        return this.storage.get(key) || null;
    }
    async set(key, state) {
        this.storage.set(key, state);
    }
    async delete(key) {
        this.storage.delete(key);
    }
    async cleanup() {
        const now = new Date();
        for (const [key, state] of this.storage.entries()) {
            if (now > state.resetAt) {
                this.storage.delete(key);
            }
        }
    }
}
/**
 * Rate limiter
 * Handles request rate limiting based on configured rules
 */
export class RateLimiter {
    constructor(options) {
        this.enabled = options.enabled;
        this.rules = options.rules;
        this.storage = this.createStorage(options.storage);
    }
    /**
     * Initialize rate limiter
     */
    async initialize() {
        if (!this.enabled) {
            return;
        }
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.storage.cleanup(), 60 * 1000 // Every minute
        );
    }
    /**
     * Check if request is allowed
     */
    async checkLimit(resource, context) {
        try {
            if (!this.enabled) {
                return {
                    allowed: true,
                    remaining: Infinity,
                    resetAt: new Date(Date.now() + 3600000)
                };
            }
            // Get applicable rules
            const rules = this.getApplicableRules(resource, context);
            if (rules.length === 0) {
                return {
                    allowed: true,
                    remaining: Infinity,
                    resetAt: new Date(Date.now() + 3600000)
                };
            }
            // Check each rule
            const results = await Promise.all(rules.map(rule => this.checkRule(rule, context)));
            // Find most restrictive result
            const result = results.reduce((prev, curr) => {
                if (!prev)
                    return curr;
                if (!curr)
                    return prev;
                return curr.remaining < prev.remaining ? curr : prev;
            });
            return {
                allowed: result.allowed,
                remaining: result.remaining,
                resetAt: result.resetAt
            };
        }
        catch (error) {
            throw new SecurityError(SecurityErrorType.RATE_LIMIT_FAILED, 'Failed to check rate limit', error);
        }
    }
    /**
     * Record request
     */
    async recordRequest(resource, context) {
        try {
            if (!this.enabled) {
                return;
            }
            // Get applicable rules
            const rules = this.getApplicableRules(resource, context);
            if (rules.length === 0) {
                return;
            }
            // Update state for each rule
            await Promise.all(rules.map(rule => this.updateRuleState(rule, context)));
        }
        catch (error) {
            throw new SecurityError(SecurityErrorType.RATE_LIMIT_FAILED, 'Failed to record request', error);
        }
    }
    /**
     * Close rate limiter
     */
    async close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    /**
     * Create storage backend
     */
    createStorage(config) {
        switch (config.type) {
            case 'memory':
                return new MemoryStorage();
            case 'redis':
                throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Redis storage not yet implemented');
            default:
                throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid storage type');
        }
    }
    /**
     * Get applicable rules for resource and context
     */
    getApplicableRules(resource, context) {
        return this.rules.filter(rule => {
            // Check resource match
            if (!this.matchResource(resource, rule.resource)) {
                return false;
            }
            // Check identity match
            if (rule.userId && rule.userId !== context.userId) {
                return false;
            }
            if (rule.clientId && rule.clientId !== context.clientId) {
                return false;
            }
            if (rule.machineId && rule.machineId !== context.machineId) {
                return false;
            }
            return true;
        });
    }
    /**
     * Check if request is allowed by rule
     */
    async checkRule(rule, context) {
        // Get current state
        const key = this.getStateKey(rule, context);
        const state = await this.storage.get(key);
        // If no state exists, request is allowed
        if (!state) {
            return {
                allowed: true,
                remaining: rule.limit,
                resetAt: new Date(Date.now() + rule.window)
            };
        }
        // Check if window has expired
        if (new Date() > state.resetAt) {
            await this.storage.delete(key);
            return {
                allowed: true,
                remaining: rule.limit,
                resetAt: new Date(Date.now() + rule.window)
            };
        }
        // Check remaining limit
        return {
            allowed: state.count < rule.limit,
            remaining: Math.max(0, rule.limit - state.count),
            resetAt: state.resetAt
        };
    }
    /**
     * Update rule state for request
     */
    async updateRuleState(rule, context) {
        const key = this.getStateKey(rule, context);
        const state = await this.storage.get(key);
        if (!state || new Date() > state.resetAt) {
            // Create new state
            await this.storage.set(key, {
                resource: rule.resource,
                userId: context.userId,
                clientId: context.clientId,
                machineId: context.machineId,
                count: 1,
                window: rule.window,
                resetAt: new Date(Date.now() + rule.window)
            });
        }
        else {
            // Update existing state
            await this.storage.set(key, {
                ...state,
                count: state.count + 1
            });
        }
    }
    /**
     * Get storage key for rule state
     */
    getStateKey(rule, context) {
        return [
            rule.resource,
            context.userId || '*',
            context.clientId || '*',
            context.machineId || '*'
        ].join(':');
    }
    /**
     * Match resource against pattern
     */
    matchResource(resource, pattern) {
        // Convert glob pattern to regex
        const regex = new RegExp('^' +
            pattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.')
                .replace(/\[!/g, '[^')
                .replace(/\[/g, '[')
                .replace(/\]/g, ']')
                .replace(/\./g, '\\.') +
            '$');
        return regex.test(resource);
    }
}
//# sourceMappingURL=ratelimit.js.map