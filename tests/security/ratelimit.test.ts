import { RateLimiter } from '../../src/security/ratelimit.js';
import { SecurityErrorType } from '../../src/security/types.js';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(async () => {
    rateLimiter = new RateLimiter({
      enabled: true,
      rules: [
        {
          resource: 'test/*',
          window: 1000, // 1 second for testing
          limit: 3
        }
      ],
      storage: {
        type: 'memory'
      }
    });

    await rateLimiter.initialize();
  });

  afterEach(async () => {
    await rateLimiter.close();
  });

  describe('initialization', () => {
    it('should initialize with valid config', async () => {
      const limiter = new RateLimiter({
        enabled: true,
        rules: [],
        storage: {
          type: 'memory'
        }
      });

      await expect(limiter.initialize()).resolves.not.toThrow();
    });

    it('should fail with invalid storage type', () => {
      expect(() => new RateLimiter({
        enabled: true,
        rules: [],
        storage: {
          type: 'invalid' as any
        }
      })).toThrow(SecurityErrorType.INVALID_CONFIG);
    });
  });

  describe('rate limiting', () => {
    it('should allow requests within limit', async () => {
      // First request
      let result = await rateLimiter.checkLimit('test/resource', {});
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
      await rateLimiter.recordRequest('test/resource', {});

      // Second request
      result = await rateLimiter.checkLimit('test/resource', {});
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
      await rateLimiter.recordRequest('test/resource', {});

      // Third request
      result = await rateLimiter.checkLimit('test/resource', {});
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should block requests over limit', async () => {
      // Use up limit
      for (let i = 0; i < 3; i++) {
        await rateLimiter.recordRequest('test/resource', {});
      }

      // Check next request
      const result = await rateLimiter.checkLimit('test/resource', {});
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window', async () => {
      // Use up limit
      for (let i = 0; i < 3; i++) {
        await rateLimiter.recordRequest('test/resource', {});
      }

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Check new request
      const result = await rateLimiter.checkLimit('test/resource', {});
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });
  });

  describe('rule matching', () => {
    beforeEach(async () => {
      rateLimiter = new RateLimiter({
        enabled: true,
        rules: [
          {
            resource: 'test/*',
            window: 1000,
            limit: 3,
            userId: 'user1'
          },
          {
            resource: 'api/*',
            window: 1000,
            limit: 5,
            clientId: 'client1'
          }
        ],
        storage: {
          type: 'memory'
        }
      });

      await rateLimiter.initialize();
    });

    it('should match resource patterns', async () => {
      const result = await rateLimiter.checkLimit('test/resource', {
        userId: 'user1'
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it('should match user identity', async () => {
      // Should match rule
      let result = await rateLimiter.checkLimit('test/resource', {
        userId: 'user1'
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);

      // Should not match rule
      result = await rateLimiter.checkLimit('test/resource', {
        userId: 'user2'
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('should match client identity', async () => {
      // Should match rule
      let result = await rateLimiter.checkLimit('api/endpoint', {
        clientId: 'client1'
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);

      // Should not match rule
      result = await rateLimiter.checkLimit('api/endpoint', {
        clientId: 'client2'
      });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('multiple rules', () => {
    beforeEach(async () => {
      rateLimiter = new RateLimiter({
        enabled: true,
        rules: [
          {
            resource: 'test/*',
            window: 1000,
            limit: 3
          },
          {
            resource: 'test/special',
            window: 1000,
            limit: 1
          }
        ],
        storage: {
          type: 'memory'
        }
      });

      await rateLimiter.initialize();
    });

    it('should use most restrictive limit', async () => {
      // First request to special endpoint
      let result = await rateLimiter.checkLimit('test/special', {});
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
      await rateLimiter.recordRequest('test/special', {});

      // Second request should be blocked by special rule
      result = await rateLimiter.checkLimit('test/special', {});
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track limits independently', async () => {
      // Use special endpoint
      await rateLimiter.recordRequest('test/special', {});

      // Should still allow regular endpoint
      const result = await rateLimiter.checkLimit('test/other', {});
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });
  });

  describe('disabled state', () => {
    beforeEach(async () => {
      rateLimiter = new RateLimiter({
        enabled: false,
        rules: [
          {
            resource: 'test/*',
            window: 1000,
            limit: 3
          }
        ],
        storage: {
          type: 'memory'
        }
      });

      await rateLimiter.initialize();
    });

    it('should allow all requests when disabled', async () => {
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkLimit('test/resource', {});
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
        await rateLimiter.recordRequest('test/resource', {});
      }
    });

    it('should not track requests when disabled', async () => {
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordRequest('test/resource', {});
      }

      // Enable limiter
      rateLimiter = new RateLimiter({
        enabled: true,
        rules: [
          {
            resource: 'test/*',
            window: 1000,
            limit: 3
          }
        ],
        storage: {
          type: 'memory'
        }
      });

      await rateLimiter.initialize();

      // Should start fresh
      const result = await rateLimiter.checkLimit('test/resource', {});
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });
  });
});
