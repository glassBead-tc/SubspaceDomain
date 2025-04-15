import { join } from 'path';
import { mkdtemp, rm, readFile, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { AuditLogger } from '../../src/security/audit.js';
import { SecurityErrorType } from '../../src/security/types.js';

describe('AuditLogger', () => {
  let tempDir: string;
  let logDir: string;
  let auditLogger: AuditLogger;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), 'mcp-test-'));
    logDir = join(tempDir, 'audit-logs');

    // Create logger
    auditLogger = new AuditLogger({
      enabled: true,
      logDirectory: logDir,
      retention: {
        days: 7,
        maxSize: 1024 * 1024 // 1MB
      },
      rotationInterval: 1000 // 1 second for testing
    });

    await auditLogger.initialize();
  });

  afterEach(async () => {
    // Close logger
    await auditLogger.close();

    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should create log directory', async () => {
      const logger = new AuditLogger({
        enabled: true,
        logDirectory: join(tempDir, 'new-logs'),
        retention: {
          days: 7
        }
      });

      await logger.initialize();
      const stats = await readdir(join(tempDir, 'new-logs'));
      expect(stats).toBeDefined();
    });

    it('should not create directory when disabled', async () => {
      const logger = new AuditLogger({
        enabled: false,
        logDirectory: join(tempDir, 'disabled-logs'),
        retention: {
          days: 7
        }
      });

      await logger.initialize();
      await expect(readdir(join(tempDir, 'disabled-logs')))
        .rejects
        .toThrow();
    });
  });

  describe('logging', () => {
    it('should write log entry', async () => {
      const entry = {
        timestamp: new Date(),
        action: 'test-action',
        userId: 'test-user',
        status: 'success' as const
      };

      await auditLogger.log(entry);

      // Get current log file
      const logPath = auditLogger.getCurrentLogPath();
      expect(logPath).toBeDefined();

      if (logPath) {
        const content = await readFile(logPath, 'utf8');
        const logEntry = JSON.parse(content.trim());

        expect(logEntry.action).toBe(entry.action);
        expect(logEntry.userId).toBe(entry.userId);
        expect(logEntry.status).toBe(entry.status);
        expect(new Date(logEntry.timestamp)).toBeInstanceOf(Date);
      }
    });

    it('should not write when disabled', async () => {
      const logger = new AuditLogger({
        enabled: false,
        logDirectory: join(tempDir, 'disabled-logs'),
        retention: {
          days: 7
        }
      });

      await logger.initialize();
      await logger.log({
        timestamp: new Date(),
        action: 'test',
        status: 'success'
      });

      const logPath = logger.getCurrentLogPath();
      expect(logPath).toBeUndefined();
    });

    it('should include metadata', async () => {
      const entry = {
        timestamp: new Date(),
        action: 'test-action',
        status: 'success' as const,
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          location: 'test-location',
          sessionId: 'test-session'
        }
      };

      await auditLogger.log(entry);

      const logPath = auditLogger.getCurrentLogPath();
      if (logPath) {
        const content = await readFile(logPath, 'utf8');
        const logEntry = JSON.parse(content.trim());

        expect(logEntry.metadata).toEqual(entry.metadata);
      }
    });
  });

  describe('rotation', () => {
    it('should rotate log file on interval', async () => {
      // Write initial log
      const firstPath = auditLogger.getCurrentLogPath();
      await auditLogger.log({
        timestamp: new Date(),
        action: 'test',
        status: 'success'
      });

      // Wait for rotation
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Write another log
      await auditLogger.log({
        timestamp: new Date(),
        action: 'test2',
        status: 'success'
      });

      const secondPath = auditLogger.getCurrentLogPath();
      expect(secondPath).not.toBe(firstPath);
    });

    it('should rotate log file on size limit', async () => {
      // Create logger with small size limit
      const logger = new AuditLogger({
        enabled: true,
        logDirectory: join(tempDir, 'size-test'),
        retention: {
          days: 7,
          maxSize: 100 // Very small for testing
        }
      });

      await logger.initialize();
      const firstPath = logger.getCurrentLogPath();

      // Write logs until rotation
      const longEntry = {
        timestamp: new Date(),
        action: 'test'.repeat(20), // Make it long enough to trigger rotation
        status: 'success' as const
      };

      await logger.log(longEntry);
      await logger.log(longEntry);

      const secondPath = logger.getCurrentLogPath();
      expect(secondPath).not.toBe(firstPath);
    });
  });

  describe('cleanup', () => {
    it('should delete old log files', async () => {
      // Create some fake old log files
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days old

      const oldLogPath = join(logDir, `audit-${oldDate.toISOString().replace(/[:.]/g, '-')}.log`);
      await auditLogger.log({
        timestamp: oldDate,
        action: 'old-test',
        status: 'success'
      });

      // Trigger cleanup
      await auditLogger.close();
      await auditLogger.initialize();

      // Check if old file was deleted
      await expect(readFile(oldLogPath, 'utf8'))
        .rejects
        .toThrow();
    });

    it('should keep recent log files', async () => {
      // Create recent log file
      const recentDate = new Date();
      const recentLogPath = join(logDir, `audit-${recentDate.toISOString().replace(/[:.]/g, '-')}.log`);
      await auditLogger.log({
        timestamp: recentDate,
        action: 'recent-test',
        status: 'success'
      });

      // Trigger cleanup
      await auditLogger.close();
      await auditLogger.initialize();

      // Check if recent file exists
      const content = await readFile(recentLogPath, 'utf8');
      expect(content).toContain('recent-test');
    });
  });

  describe('error handling', () => {
    it('should handle write errors', async () => {
      // Create logger with invalid directory
      const logger = new AuditLogger({
        enabled: true,
        logDirectory: '/invalid/directory',
        retention: {
          days: 7
        }
      });

      await expect(logger.initialize())
        .rejects
        .toThrow(SecurityErrorType.AUDIT_FAILED);
    });

    it('should handle rotation errors gracefully', async () => {
      // Make log directory read-only
      const logger = new AuditLogger({
        enabled: true,
        logDirectory: join(tempDir, 'readonly'),
        retention: {
          days: 7
        },
        rotationInterval: 100
      });

      await logger.initialize();

      // Write should still work for current file
      await logger.log({
        timestamp: new Date(),
        action: 'test',
        status: 'success'
      });

      // Wait for rotation attempt
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should still be able to write
      await expect(logger.log({
        timestamp: new Date(),
        action: 'test2',
        status: 'success'
      })).resolves.not.toThrow();
    });
  });
});
