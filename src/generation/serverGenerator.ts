import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { 
  GeneratedServer, 
  ServerTemplate, 
  TemplateOptions,
  ResourcePrediction 
} from './types.js';
import TemplateManager from './templateManager.js';
import DependencyResolver from './dependencyResolver.js';
import { PromptAnalyzer } from './promptAnalyzer.js';
import { createHash } from 'crypto';

export class ServerGenerator {
  constructor(
    private readonly templateManager: TemplateManager,
    private readonly dependencyResolver: DependencyResolver,
    private readonly promptAnalyzer: PromptAnalyzer
  ) {}

  async generateServer(
    prompt: string,
    options: TemplateOptions = {
      format: 'typescript',
      includeComments: true,
      strictMode: true,
      experimentalFeatures: false
    }
  ): Promise<GeneratedServer> {
    // Analyze prompt
    const analysis = await this.promptAnalyzer.analyzePrompt(prompt);
    
    // Validate capabilities
    const validationResult = await this.promptAnalyzer.validateCapabilities(
      analysis.capabilities
    );
    
    if (!validationResult.valid) {
      throw new Error(
        `Invalid capabilities: ${validationResult.errors.map(e => e.message).join(', ')}`
      );
    }

    // Resolve dependencies
    const dependencies = await this.dependencyResolver.analyzeDependencies(
      analysis.capabilities
    );
    
    // Check for security issues
    const securityReport = await this.dependencyResolver.validateSecurity(dependencies);
    if (!securityReport.safe) {
      const issues = securityReport.vulnerabilities
        .filter(v => v.severity === 'high' || v.severity === 'critical')
        .map(v => `${v.package}: ${v.description}`);
      
      if (issues.length > 0) {
        throw new Error(`Security issues found: ${issues.join(', ')}`);
      }
    }

    // Get template
    const template = this.templateManager.getLatestTemplate();
    if (!template) {
      throw new Error('No templates available');
    }

    // Generate server code
    const serverName = this.generateServerName(prompt);
    const code = await this.generateServerCode(
      template,
      analysis.capabilities,
      serverName,
      options
    );

    // Create metadata
    const metadata = {
      generatedAt: new Date().toISOString(),
      sdkVersion: await this.getSDKVersion(),
      templateVersion: template.version,
      hash: this.generateHash(code)
    };

    return {
      code,
      context: {
        prompt,
        capabilities: analysis.capabilities,
        template,
        dependencies: await this.dependencyResolver.resolveVersionConflicts(dependencies),
        resources: await this.predictResourceNeeds(analysis.capabilities),
        validation: validationResult
      },
      metadata
    };
  }

  private async generateServerCode(
    template: ServerTemplate,
    capabilities: ServerCapabilities,
    serverName: string,
    options: TemplateOptions
  ): Promise<string> {
    // Generate handlers for each capability
    const handlers = await this.generateHandlers(capabilities);

    // Replace template variables
    const replacements = {
      serverName,
      version: '1.0.0',
      capabilities: JSON.stringify(capabilities, null, 2),
      handlers
    };

    return this.templateManager.generateServerCode(template, options, replacements);
  }

  private async generateHandlers(capabilities: ServerCapabilities): Promise<string> {
    const handlers: string[] = [];

    // Generate tool handlers
    if (capabilities.tools) {
      for (const [name, tool] of Object.entries(capabilities.tools)) {
        handlers.push(this.generateToolHandler(name, tool));
      }
    }

    // Generate resource handlers
    if (capabilities.resources) {
      for (const [name, resource] of Object.entries(capabilities.resources)) {
        handlers.push(this.generateResourceHandler(name, resource));
      }
    }

    return handlers.join('\n\n');
  }

  private generateToolHandler(name: string, tool: unknown): string {
    return `
    this.server.setRequestHandler(
      ${name}RequestSchema,
      async (request) => {
        // Auto-generated handler for ${name}
        ${this.generateToolImplementation(name, tool)}
      }
    );`;
  }

  private generateResourceHandler(name: string, resource: unknown): string {
    return `
    this.server.setRequestHandler(
      ${name}ResourceSchema,
      async (request) => {
        // Auto-generated handler for ${name}
        ${this.generateResourceImplementation(name, resource)}
      }
    );`;
  }

  private generateToolImplementation(name: string, tool: unknown): string {
    // Generate basic implementation based on tool type
    switch (name) {
      case 'httpClient':
        return `
        const response = await fetch(request.params.url, request.params.options);
        return await response.json();`;
      case 'database':
        return `
        const db = await this.getDatabase();
        return await db.query(request.params.query);`;
      default:
        return `
        throw new Error('Not implemented');`;
    }
  }

  private generateResourceImplementation(name: string, resource: unknown): string {
    // Generate basic implementation based on resource type
    switch (name) {
      case 'cache':
        return `
        const cache = await this.getCache();
        return await cache.get(request.params.key);`;
      case 'metrics':
        return `
        const metrics = await this.getMetrics();
        return metrics.collect();`;
      default:
        return `
        throw new Error('Not implemented');`;
    }
  }

  private generateServerName(prompt: string): string {
    // Extract meaningful name from prompt or generate a unique one
    const words = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 2);

    if (words.length > 0) {
      return `${words.join('-')}-server`;
    }

    // Fallback to generated name
    return `mcp-server-${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateHash(code: string): string {
    return createHash('sha256')
      .update(code)
      .digest('hex');
  }

  private async getSDKVersion(): Promise<string> {
    try {
      const packageJson = require('@modelcontextprotocol/sdk/package.json');
      return packageJson.version;
    } catch {
      return 'unknown';
    }
  }

  private async predictResourceNeeds(
    capabilities: ServerCapabilities
  ): Promise<ResourcePrediction> {
    // Basic resource prediction based on capabilities
    const prediction: ResourcePrediction = {
      cpu: {
        estimated: 0.1, // Base CPU cores
        confidence: 0.8
      },
      memory: {
        estimated: 128, // Base MB
        confidence: 0.8
      },
      storage: {
        estimated: 10, // Base MB
        confidence: 0.8
      },
      network: {
        estimatedBandwidth: 1, // Base MB/s
        estimatedLatency: 100, // Base ms
        confidence: 0.7
      }
    };

    // Adjust based on capabilities
    if (capabilities.tools?.httpClient) {
      prediction.network.estimatedBandwidth += 5;
      prediction.network.estimatedLatency += 50;
    }

    if (capabilities.tools?.database) {
      prediction.storage.estimated += 100;
      prediction.memory.estimated += 256;
    }

    if (capabilities.resources?.cache) {
      prediction.memory.estimated += 512;
    }

    if (capabilities.resources?.metrics) {
      prediction.cpu.estimated += 0.1;
      prediction.memory.estimated += 64;
    }

    return prediction;
  }
}

export default ServerGenerator;
