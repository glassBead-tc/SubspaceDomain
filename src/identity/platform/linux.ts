import { readFileSync, unlinkSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { MachineIdProvider, MachineIdOptions, IdentityError, IdentityErrorType } from '../types.js';

/**
 * Linux machine ID provider
 * Uses /etc/machine-id or /var/lib/dbus/machine-id
 */
export class LinuxMachineIdProvider implements MachineIdProvider {
  private cacheFile: string;
  private cachedId: string | null = null;
  private validationPattern: RegExp;
  private readonly machineIdPaths = [
    '/etc/machine-id',
    '/var/lib/dbus/machine-id'
  ];

  constructor(options: MachineIdOptions = {}) {
    this.cacheFile = options.cacheFile || '.machine-id';
    this.validationPattern = options.validationRules?.pattern || 
      /^[0-9a-f]{32}$/i;
  }

  /**
   * Get machine ID from system files
   */
  public async getId(): Promise<string> {
    try {
      // Check cache first
      const cached = this.getCached();
      if (cached) {
        return cached;
      }

      // Try each machine ID path
      for (const path of this.machineIdPaths) {
        try {
          const id = readFileSync(path, 'utf8').trim();
          if (this.validate(id)) {
            // Cache valid ID
            await this.cacheId(id);
            return id;
          }
        } catch {
          // Try next path
          continue;
        }
      }

      // Try fallback methods if no valid ID found
      const fallbackId = await this.getFallbackId();
      if (fallbackId) {
        return fallbackId;
      }

      throw new IdentityError(
        IdentityErrorType.MACHINE_ID_NOT_FOUND,
        'No valid machine ID found'
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
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
      // Try reading DMI system UUID
      const sysUuid = readFileSync('/sys/class/dmi/id/product_uuid', 'utf8')
        .trim()
        .toLowerCase()
        .replace(/-/g, '');

      if (this.validate(sysUuid)) {
        return sysUuid;
      }
    } catch {
      // Ignore fallback errors
    }

    try {
      // Try reading motherboard serial
      const mbSerial = readFileSync('/sys/class/dmi/id/board_serial', 'utf8')
        .trim()
        .toLowerCase()
        .replace(/[^0-9a-f]/g, '')
        .padEnd(32, '0')
        .slice(0, 32);

      if (this.validate(mbSerial)) {
        return mbSerial;
      }
    } catch {
      // Ignore fallback errors
    }

    return null;
  }
}

// Export singleton instance
export const linuxProvider = new LinuxMachineIdProvider();
