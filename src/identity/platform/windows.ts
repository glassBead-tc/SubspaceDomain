import { readFileSync, unlinkSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { MachineIdProvider, MachineIdOptions, IdentityError, IdentityErrorType } from '../types.js';

const execAsync = promisify(exec);

/**
 * Windows machine ID provider
 * Uses WMI to get system UUID
 */
export class WindowsMachineIdProvider implements MachineIdProvider {
  private cacheFile: string;
  private cachedId: string | null = null;
  private validationPattern: RegExp;

  constructor(options: MachineIdOptions = {}) {
    this.cacheFile = options.cacheFile || '.machine-id';
    this.validationPattern = options.validationRules?.pattern || 
      /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
  }

  /**
   * Get machine ID using WMI
   */
  public async getId(): Promise<string> {
    try {
      // Check cache first
      const cached = this.getCached();
      if (cached) {
        return cached;
      }

      // Get system UUID using WMI
      const { stdout } = await execAsync(
        'wmic csproduct get UUID'
      );

      // Parse UUID from output (second line after header)
      const id = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)[1];

      // Validate ID
      if (!this.validate(id)) {
        throw new IdentityError(
          IdentityErrorType.MACHINE_ID_INVALID,
          'Invalid machine ID format'
        );
      }

      // Cache ID
      await this.cacheId(id);

      return id;
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }

      // Try fallback methods if command fails
      const fallbackId = await this.getFallbackId();
      if (fallbackId) {
        return fallbackId;
      }

      throw new IdentityError(
        IdentityErrorType.MACHINE_ID_NOT_FOUND,
        'Failed to get machine ID',
        error
      );
    }
  }

  /**
   * Validate machine ID format
   */
  public validate(id: string): boolean {
    if (!id) return false;
    return this.validationPattern.test(id);
  }

  /**
   * Get cached machine ID
   */
  public getCached(): string | null {
    if (this.cachedId) {
      return this.cachedId;
    }

    try {
      const cached = readFileSync(this.cacheFile, 'utf8').trim();
      if (this.validate(cached)) {
        this.cachedId = cached;
        return cached;
      }
    } catch {
      // Ignore cache read errors
    }

    return null;
  }

  /**
   * Clear cached machine ID
   */
  public clearCache(): void {
    this.cachedId = null;
    try {
      unlinkSync(this.cacheFile);
    } catch {
      // Ignore cache delete errors
    }
  }

  /**
   * Cache machine ID to file
   */
  private async cacheId(id: string): Promise<void> {
    try {
      await fsPromises.writeFile(this.cacheFile, id, {
        mode: 0o600 // User read/write only
      });
      this.cachedId = id;
    } catch {
      // Ignore cache write errors
    }
  }

  /**
   * Get machine ID using fallback methods
   */
  private async getFallbackId(): Promise<string | null> {
    try {
      // Try BIOS serial number
      const { stdout } = await execAsync(
        'wmic bios get serialnumber'
      );

      const serial = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)[1];

      // Convert serial to UUID format if possible
      if (serial && serial.length >= 32) {
        const uuid = [
          serial.slice(0, 8),
          serial.slice(8, 12),
          serial.slice(12, 16),
          serial.slice(16, 20),
          serial.slice(20, 32)
        ].join('-');

        if (this.validate(uuid)) {
          return uuid;
        }
      }
    } catch {
      // Ignore fallback errors
    }

    try {
      // Try motherboard serial number
      const { stdout } = await execAsync(
        'wmic baseboard get serialnumber'
      );

      const serial = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)[1];

      // Convert serial to UUID format if possible
      if (serial && serial.length >= 32) {
        const uuid = [
          serial.slice(0, 8),
          serial.slice(8, 12),
          serial.slice(12, 16),
          serial.slice(16, 20),
          serial.slice(20, 32)
        ].join('-');

        if (this.validate(uuid)) {
          return uuid;
        }
      }
    } catch {
      // Ignore fallback errors
    }

    return null;
  }
}

// Export singleton instance
export const windowsProvider = new WindowsMachineIdProvider();
