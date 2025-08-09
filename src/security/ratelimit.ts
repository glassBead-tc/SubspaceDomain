import {
  RateLimitRule,
  RateLimitState,
  SecurityError,
  SecurityErrorType
} from './types.js';

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
 * Rate limiter state storage interface
 */
interface RateLimitStorage {
  get(key: string): Promise<RateLimitState | null>;
  set(key: string, state: RateLimitState): Promise<void>;
  delete(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Memory-based rate limit storage
 */
class MemoryStorage implements RateLimitStorage {
  private storage: Map<string, RateLimitState>;

  constructor() {
    this.storage = new Map();
  }

  public async get(key: string): Promise<RateLimitState | null> {
    return this.storage.get(key) || null;
  }

  public async set(key: string, state: RateLimitState): Promise<void> {
    this.storage.set(key, state);
  }

  public async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  public async cleanup(): Promise<void> {
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
  private enabled: boolean;
  private rules: RateLimitRule[];
  private storage: RateLimitStorage;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: RateLimiterOptions) {
    this.enabled = options.enabled;
    this.rules = options.rules;
    this.storage = this.createStorage(options.storage);
  }

  /**
   * Initialize rate limiter
   */
  public async initialize(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.storage.cleanup(),
      60 * 1000 // Every minute
    );
  }

  /**
   * Check if request is allowed
   */
  public async checkLimit(
    resource: string,
    context: {
      userId?: string;
      clientId?: string;
      machineId?: string;
    }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    try {
      // Even if disabled, report limit info if rules would match
      const rules = this.getApplicableRules(resource, context);
      if (!this.enabled) {
        if (rules.length === 0) {
          return {
            allowed: true,
            remaining: Infinity,
            resetAt: new Date(Date.now() + 3600000)
          };
        }
        // When disabled but rules exist, treat as full remaining
        const maxLimit = Math.max(...rules.map(r => r.limit));
        return {
          allowed: true,
          remaining: maxLimit,
          resetAt: new Date(Date.now() + (rules[0]?.window ?? 3600000))
        };
      }

      if (rules.length === 0) {
        return {
          allowed: true,
          remaining: Infinity,
          resetAt: new Date(Date.now() + 3600000)
        };
      }

      const results = await Promise.all(
        rules.map(rule => this.checkRule(rule, context))
      );
      const result = results.reduce((prev, curr) => {
        if (!prev) return curr;
        if (!curr) return prev;
        return curr.remaining < prev.remaining ? curr : prev;
      });

      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: result.resetAt
      };
    } catch (error) {
      throw new SecurityError(
        SecurityErrorType.RATE_LIMIT_FAILED,
        'Failed to check rate limit',
        error
      );
    }
  }

  /**
   * Record request
   */
  public async recordRequest(
    resource: string,
    context: {
      userId?: string;
      clientId?: string;
      machineId?: string;
    }
  ): Promise<void> {
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
      await Promise.all(
        rules.map(rule => this.updateRuleState(rule, context))
      );
    } catch (error) {
      throw new SecurityError(
        SecurityErrorType.RATE_LIMIT_FAILED,
        'Failed to record request',
        error
      );
    }
  }

  /**
   * Close rate limiter
   */
  public async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Create storage backend
   */
  private createStorage(config: { type: string; options?: any }): RateLimitStorage {
    switch (config.type) {
      case 'memory':
        return new MemoryStorage();
      case 'redis':
        throw new SecurityError(
          SecurityErrorType.INVALID_CONFIG,
          'Redis storage not yet implemented'
        );
      default:
        throw new SecurityError(
          SecurityErrorType.INVALID_CONFIG,
          'Invalid storage type'
        );
    }
  }

  /**
   * Get applicable rules for resource and context
   */
  private getApplicableRules(
    resource: string,
    context: {
      userId?: string;
      clientId?: string;
      machineId?: string;
    }
  ): RateLimitRule[] {
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
  private async checkRule(
    rule: RateLimitRule,
    context: {
      userId?: string;
      clientId?: string;
      machineId?: string;
    }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
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
  private async updateRuleState(
    rule: RateLimitRule,
    context: {
      userId?: string;
      clientId?: string;
      machineId?: string;
    }
  ): Promise<void> {
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
    } else {
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
  private getStateKey(
    rule: RateLimitRule,
    context: {
      userId?: string;
      clientId?: string;
      machineId?: string;
    }
  ): string {
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
  private matchResource(resource: string, pattern: string): boolean {
    // Escape regex special chars, then restore glob wildcards
    let escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
    escaped = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    const regex = new RegExp('^' + escaped + '$');
    return regex.test(resource);
  }
}
