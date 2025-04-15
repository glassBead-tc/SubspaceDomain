import { jest } from '@jest/globals';
import {
  ServerGenerator,
  TemplateManager,
  DependencyResolver,
  PromptAnalyzer,
  ServerTemplate,
  ValidationResult,
  DependencyMap,
  SecurityReport
} from '../../src/generation/index.js';

describe('ServerGenerator', () => {
  let serverGenerator: ServerGenerator;
  let templateManager: jest.Mocked<TemplateManager>;
  let dependencyResolver: jest.Mocked<DependencyResolver>;
  let promptAnalyzer: jest.Mocked<PromptAnalyzer>;

  const mockTemplate: ServerTemplate = {
    version: '1.0.0',
    template: 'test template {{serverName}}',
    metadata: {
      minSdkVersion: '1.0.0',
      supportedLanguages: ['typescript'],
      features: ['basic']
    }
  };

  const mockValidationResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const mockDependencies: DependencyMap = {
    required: {
      '@modelcontextprotocol/sdk': {
        version: 'latest',
        reason: 'Core dependency'
      }
    },
    optional: {}
  };

  const mockSecurityReport: SecurityReport = {
    safe: true,
    vulnerabilities: []
  };

  beforeEach(() => {
    templateManager = {
      getLatestTemplate: jest.fn().mockReturnValue(mockTemplate),
      generateServerCode: jest.fn().mockImplementation((template, options, replacements) => 
        Promise.resolve(template.template.replace('{{serverName}}', replacements.serverName))
      )
    } as unknown as jest.Mocked<TemplateManager>;

    dependencyResolver = {
      analyzeDependencies: jest.fn().mockResolvedValue(mockDependencies),
      validateSecurity: jest.fn().mockResolvedValue(mockSecurityReport),
      resolveVersionConflicts: jest.fn().mockImplementation(deps => 
        Promise.resolve({ ...deps, resolutionStrategy: 'conservative', conflicts: [] })
      )
    } as unknown as jest.Mocked<DependencyResolver>;

    promptAnalyzer = {
      analyzePrompt: jest.fn().mockResolvedValue({
        capabilities: { tools: {}, resources: {} },
        authRequirements: { type: 'none', requirements: {} },
        dataFlowPatterns: { inputSources: [], outputTargets: [], transformations: [], patterns: [] },
        externalDependencies: []
      }),
      validateCapabilities: jest.fn().mockResolvedValue(mockValidationResult)
    } as unknown as jest.Mocked<PromptAnalyzer>;

    serverGenerator = new ServerGenerator(
      templateManager,
      dependencyResolver,
      promptAnalyzer
    );
  });

  describe('generateServer', () => {
    it('should generate a server from a prompt', async () => {
      const prompt = 'Create a simple HTTP server';
      const result = await serverGenerator.generateServer(prompt);

      expect(result).toBeDefined();
      expect(result.code).toContain('simple-http-server');
      expect(result.context.prompt).toBe(prompt);
      expect(result.metadata.templateVersion).toBe('1.0.0');
    });

    it('should throw error on invalid capabilities', async () => {
      promptAnalyzer.validateCapabilities.mockResolvedValueOnce({
        valid: false,
        errors: [{ code: 'ERROR', message: 'Invalid tool', severity: 'error' }],
        warnings: []
      });

      await expect(serverGenerator.generateServer('invalid prompt'))
        .rejects
        .toThrow('Invalid capabilities: Invalid tool');
    });

    it('should throw error on security issues', async () => {
      dependencyResolver.validateSecurity.mockResolvedValueOnce({
        safe: false,
        vulnerabilities: [{
          package: 'test-pkg',
          severity: 'critical',
          description: 'Security issue',
          recommendation: 'Update'
        }]
      });

      await expect(serverGenerator.generateServer('vulnerable prompt'))
        .rejects
        .toThrow('Security issues found: test-pkg: Security issue');
    });

    it('should handle missing template', async () => {
      templateManager.getLatestTemplate.mockReturnValueOnce(undefined);

      await expect(serverGenerator.generateServer('prompt'))
        .rejects
        .toThrow('No templates available');
    });

    it('should generate valid server name from prompt', async () => {
      const result = await serverGenerator.generateServer('Create Weather API Server');
      expect(result.code).toContain('weather-api-server');
    });

    it('should fallback to generated name for short prompts', async () => {
      const result = await serverGenerator.generateServer('Hi');
      expect(result.code).toMatch(/mcp-server-[a-z0-9]{6}/);
    });
  });

  describe('resource prediction', () => {
    it('should adjust predictions based on capabilities', async () => {
      promptAnalyzer.analyzePrompt.mockResolvedValueOnce({
        capabilities: {
          tools: {
            httpClient: {
              description: 'HTTP client',
              parameters: {}
            },
            database: {
              description: 'Database',
              parameters: {}
            }
          },
          resources: {
            cache: {
              description: 'Cache'
            },
            metrics: {
              description: 'Metrics'
            }
          }
        },
        authRequirements: { type: 'none', requirements: {} },
        dataFlowPatterns: { inputSources: [], outputTargets: [], transformations: [], patterns: [] },
        externalDependencies: []
      });

      const result = await serverGenerator.generateServer('Complex server with all features');
      
      expect(result.context.resources.memory.estimated).toBeGreaterThan(128); // Base memory
      expect(result.context.resources.network.estimatedBandwidth).toBeGreaterThan(1); // Base bandwidth
      expect(result.context.resources.storage.estimated).toBeGreaterThan(10); // Base storage
      expect(result.context.resources.cpu.estimated).toBeGreaterThan(0.1); // Base CPU
    });
  });
});
