import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { ServerTemplate, TemplateFormat, TemplateOptions } from './types.js';

export default class TemplateManager {
  private templates: Map<string, ServerTemplate> = new Map();
  private readonly templatesDir: string;

  constructor(templatesDir: string = join(__dirname, 'templates')) {
    this.templatesDir = templatesDir;
  }

  async initialize(): Promise<void> {
    try {
      // Load all templates from the templates directory
      const templateFiles = await readFile(join(this.templatesDir, 'registry.json'), 'utf-8');
      const registry = JSON.parse(templateFiles);
      
      for (const [version, template] of Object.entries(registry)) {
        this.templates.set(version, template as ServerTemplate);
      }
    } catch (error) {
      // If registry doesn't exist yet, initialize with default templates
      await this.initializeDefaultTemplates();
    }
  }

  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplate: ServerTemplate = {
      version: '1.0.0',
      template: await this.loadDefaultTemplate(),
      metadata: {
        minSdkVersion: '1.0.0',
        supportedLanguages: ['typescript'],
        features: ['basic', 'tools', 'resources']
      }
    };

    this.templates.set(defaultTemplate.version, defaultTemplate);
    await this.saveRegistry();
  }

  private async loadDefaultTemplate(): Promise<string> {
    return `import { Server } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class GeneratedServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: '{{serverName}}',
        version: '{{version}}'
      },
      {
        capabilities: {{capabilities}}
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    {{handlers}}
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('{{serverName}} running on stdio');
  }
}

const server = new GeneratedServer();
server.run().catch(console.error);
`;
  }

  private async saveRegistry(): Promise<void> {
    const registry = Object.fromEntries(this.templates.entries());
    await writeFile(
      join(this.templatesDir, 'registry.json'),
      JSON.stringify(registry, null, 2),
      'utf-8'
    );
  }

  getTemplate(version: string): ServerTemplate | undefined {
    return this.templates.get(version);
  }

  getLatestTemplate(): ServerTemplate {
    const versions = Array.from(this.templates.keys())
      .sort((a, b) => this.compareVersions(b, a));
    
    const latest = this.templates.get(versions[0]);
    if (!latest) {
      throw new Error('No templates available');
    }
    
    return latest;
  }

  validateTemplate(template: ServerTemplate): boolean {
    // Ensure required fields exist
    if (!template.version || !template.template || !template.metadata) {
      return false;
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(template.version)) {
      return false;
    }

    // Validate metadata
    const { metadata } = template;
    if (!metadata.minSdkVersion || !metadata.supportedLanguages || !metadata.features) {
      return false;
    }

    // Validate supported languages
    if (!metadata.supportedLanguages.every((lang: string) => 
      ['typescript', 'python', 'javascript'].includes(lang))) {
      return false;
    }

    return true;
  }

  async migrateTemplate(
    template: ServerTemplate,
    targetVersion: string
  ): Promise<ServerTemplate> {
    if (this.compareVersions(template.version, targetVersion) >= 0) {
      return template; // Already at or above target version
    }

    // Apply migrations sequentially
    let currentTemplate = { ...template };
    const versions = Array.from(this.templates.keys())
      .sort((a, b) => this.compareVersions(a, b))
      .filter(v => 
        this.compareVersions(v, template.version) > 0 && 
        this.compareVersions(v, targetVersion) <= 0
      );

    for (const version of versions) {
      currentTemplate = await this.applyMigration(currentTemplate, version);
    }

    return currentTemplate;
  }

  private async applyMigration(
    template: ServerTemplate,
    targetVersion: string
  ): Promise<ServerTemplate> {
    // Load and apply migration script
    try {
      const migration = await import(
        join(this.templatesDir, 'migrations', `${targetVersion}.js`)
      );
      return migration.default(template);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to apply migration to version ${targetVersion}: ${errorMessage}`
      );
    }
  }

  private compareVersions(a: string, b: string): number {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);

    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }

  async generateServerCode(
    template: ServerTemplate,
    options: TemplateOptions,
    replacements: Record<string, string>
  ): Promise<string> {
    let code = template.template;

    // Apply replacements
    for (const [key, value] of Object.entries(replacements)) {
      code = code.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Apply format-specific transformations
    switch (options.format) {
      case 'python':
        code = this.transformToPython(code);
        break;
      case 'javascript':
        code = this.transformToJavaScript(code);
        break;
      // TypeScript is the default format, no transformation needed
    }

    // Add or remove comments based on options
    if (!options.includeComments) {
      code = this.stripComments(code);
    }

    // Add strict mode if requested
    if (options.strictMode) {
      code = this.addStrictMode(code, options.format);
    }

    return code;
  }

  private transformToPython(code: string): string {
    // Basic TypeScript to Python transformation
    return code
      .replace(/import .+ from ['"](.+)['"];?/g, 'from $1 import *')
      .replace(/class \w+ {/g, 'class $0:')
      .replace(/private /g, '_')
      .replace(/this\./g, 'self.')
      .replace(/async /g, '@asyncio.coroutine\ndef ')
      .replace(/constructor/g, '__init__')
      .replace(/: void/g, '')
      .replace(/: string/g, '')
      .replace(/: number/g, '')
      .replace(/: boolean/g, '')
      .replace(/: any/g, '')
      .replace(/interface /g, 'class ')
      .replace(/export /g, '');
  }

  private transformToJavaScript(code: string): string {
    // TypeScript to JavaScript transformation
    return code
      .replace(/: \w+/g, '') // Remove type annotations
      .replace(/interface \w+ {[\s\S]*?}/g, '') // Remove interfaces
      .replace(/private /g, '#') // Convert private to JS private fields
      .replace(/export /g, ''); // Remove exports
  }

  private stripComments(code: string): string {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\/\/.*/g, ''); // Remove single-line comments
  }

  private addStrictMode(code: string, format: TemplateFormat): string {
    switch (format) {
      case 'typescript':
      case 'javascript':
        return `'use strict';\n\n${code}`;
      case 'python':
        return `from __future__ import annotations\n\n${code}`;
      default:
        return code;
    }
  }
}
