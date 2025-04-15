import { AccessControlManager } from '../../src/security/access.js';
import {
  AccessLevel,
  SecurityError,
  SecurityErrorType
} from '../../src/security/types.js';

describe('AccessControlManager', () => {
  let accessManager: AccessControlManager;

  beforeEach(() => {
    accessManager = new AccessControlManager({
      rules: [],
      defaultLevel: AccessLevel.READ
    });
  });

  describe('initialization', () => {
    it('should initialize with valid config', () => {
      expect(() => new AccessControlManager({
        rules: [],
        defaultLevel: AccessLevel.READ
      })).not.toThrow();
    });

    it('should fail with invalid rules', () => {
      expect(() => new AccessControlManager({
        rules: 'invalid' as any,
        defaultLevel: AccessLevel.READ
      })).toThrow(SecurityErrorType.INVALID_CONFIG);
    });
  });

  describe('access control', () => {
    it('should use default level when no rules match', () => {
      expect(accessManager.checkAccess('test', AccessLevel.READ, {}))
        .toBe(true);
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, {}))
        .toBe(false);
    });

    it('should match resource patterns', () => {
      accessManager.addRule({
        level: AccessLevel.WRITE,
        resources: ['test/*', '*.config']
      });

      expect(accessManager.checkAccess('test/file', AccessLevel.WRITE, {}))
        .toBe(true);
      expect(accessManager.checkAccess('app.config', AccessLevel.WRITE, {}))
        .toBe(true);
      expect(accessManager.checkAccess('other/file', AccessLevel.WRITE, {}))
        .toBe(false);
    });

    it('should match user identity', () => {
      accessManager.addRule({
        userId: 'user1',
        level: AccessLevel.ADMIN
      });

      expect(accessManager.checkAccess('test', AccessLevel.ADMIN, { userId: 'user1' }))
        .toBe(true);
      expect(accessManager.checkAccess('test', AccessLevel.ADMIN, { userId: 'user2' }))
        .toBe(false);
    });

    it('should match client identity', () => {
      accessManager.addRule({
        clientId: 'client1',
        level: AccessLevel.WRITE
      });

      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { clientId: 'client1' }))
        .toBe(true);
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { clientId: 'client2' }))
        .toBe(false);
    });

    it('should match machine identity', () => {
      accessManager.addRule({
        machineId: 'machine1',
        level: AccessLevel.WRITE
      });

      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { machineId: 'machine1' }))
        .toBe(true);
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { machineId: 'machine2' }))
        .toBe(false);
    });
  });

  describe('time restrictions', () => {
    beforeEach(() => {
      accessManager.addRule({
        level: AccessLevel.WRITE,
        conditions: {
          timeRestriction: {
            start: '09:00:00',
            end: '17:00:00',
            days: [1, 2, 3, 4, 5] // Monday to Friday
          }
        }
      });
    });

    it('should allow access during work hours', () => {
      const timestamp = new Date('2025-02-10T14:00:00Z'); // Monday 2pm
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { timestamp }))
        .toBe(true);
    });

    it('should deny access outside work hours', () => {
      const timestamp = new Date('2025-02-10T20:00:00Z'); // Monday 8pm
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { timestamp }))
        .toBe(false);
    });

    it('should deny access on weekends', () => {
      const timestamp = new Date('2025-02-09T14:00:00Z'); // Sunday 2pm
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { timestamp }))
        .toBe(false);
    });
  });

  describe('IP restrictions', () => {
    beforeEach(() => {
      accessManager.addRule({
        level: AccessLevel.WRITE,
        conditions: {
          ipRestriction: [
            '192.168.1.0/24',
            '10.0.*.0',
            '172.16.1.1'
          ]
        }
      });
    });

    it('should match CIDR range', () => {
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { ip: '192.168.1.100' }))
        .toBe(true);
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { ip: '192.168.2.1' }))
        .toBe(false);
    });

    it('should match wildcard pattern', () => {
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { ip: '10.0.1.0' }))
        .toBe(true);
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { ip: '10.1.1.0' }))
        .toBe(false);
    });

    it('should match exact IP', () => {
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { ip: '172.16.1.1' }))
        .toBe(true);
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { ip: '172.16.1.2' }))
        .toBe(false);
    });
  });

  describe('location restrictions', () => {
    beforeEach(() => {
      accessManager.addRule({
        level: AccessLevel.WRITE,
        conditions: {
          locationRestriction: ['office', 'home']
        }
      });
    });

    it('should allow access from allowed locations', () => {
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { location: 'office' }))
        .toBe(true);
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { location: 'home' }))
        .toBe(true);
    });

    it('should deny access from other locations', () => {
      expect(accessManager.checkAccess('test', AccessLevel.WRITE, { location: 'cafe' }))
        .toBe(false);
    });
  });

  describe('rule management', () => {
    it('should add valid rule', () => {
      const rule = {
        level: AccessLevel.WRITE,
        resources: ['test/*']
      };

      expect(() => accessManager.addRule(rule)).not.toThrow();
      expect(accessManager.checkAccess('test/file', AccessLevel.WRITE, {}))
        .toBe(true);
    });

    it('should fail with invalid rule', () => {
      const rule = {
        level: 'invalid' as any,
        resources: ['test/*']
      };

      expect(() => accessManager.addRule(rule))
        .toThrow(SecurityErrorType.INVALID_CONFIG);
    });

    it('should remove rule', () => {
      const rule = {
        level: AccessLevel.WRITE,
        resources: ['test/*']
      };

      accessManager.addRule(rule);
      expect(accessManager.checkAccess('test/file', AccessLevel.WRITE, {}))
        .toBe(true);

      accessManager.removeRule(rule);
      expect(accessManager.checkAccess('test/file', AccessLevel.WRITE, {}))
        .toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate time format', () => {
      expect(() => accessManager.addRule({
        level: AccessLevel.WRITE,
        conditions: {
          timeRestriction: {
            start: 'invalid',
            end: '17:00:00'
          }
        }
      })).toThrow(SecurityErrorType.INVALID_CONFIG);
    });

    it('should validate IP format', () => {
      expect(() => accessManager.addRule({
        level: AccessLevel.WRITE,
        conditions: {
          ipRestriction: ['invalid']
        }
      })).toThrow(SecurityErrorType.INVALID_CONFIG);
    });

    it('should validate day numbers', () => {
      expect(() => accessManager.addRule({
        level: AccessLevel.WRITE,
        conditions: {
          timeRestriction: {
            days: [7] // Invalid day number
          }
        }
      })).toThrow(SecurityErrorType.INVALID_CONFIG);
    });
  });
});
