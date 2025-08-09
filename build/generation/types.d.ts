import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
export type MCPServerCapabilities = ServerCapabilities;
export interface ServerTemplate {
    version: string;
    template: string;
    metadata: {
        minSdkVersion: string;
        supportedLanguages: string[];
        features: string[];
    };
}
export interface DependencyMap {
    required: {
        [packageName: string]: {
            version: string;
            reason: string;
        };
    };
    optional: {
        [packageName: string]: {
            version: string;
            reason: string;
        };
    };
}
export interface SecurityReport {
    safe: boolean;
    vulnerabilities: Array<{
        package: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        recommendation: string;
    }>;
}
export interface ResolvedDependencies extends DependencyMap {
    resolutionStrategy: 'conservative' | 'latest' | 'specified';
    conflicts: Array<{
        package: string;
        requestedVersions: string[];
        resolvedVersion: string;
        reason: string;
    }>;
}
export interface ValidationResult {
    valid: boolean;
    errors: Array<{
        code: string;
        message: string;
        severity: 'warning' | 'error';
        path?: string[];
    }>;
    warnings: Array<{
        code: string;
        message: string;
        recommendation?: string;
    }>;
}
export interface ResourcePrediction {
    cpu: {
        estimated: number;
        confidence: number;
    };
    memory: {
        estimated: number;
        confidence: number;
    };
    storage: {
        estimated: number;
        confidence: number;
    };
    network: {
        estimatedBandwidth: number;
        estimatedLatency: number;
        confidence: number;
    };
}
export interface GenerationContext {
    prompt: string;
    capabilities: ServerCapabilities;
    template: ServerTemplate;
    dependencies: ResolvedDependencies;
    resources: ResourcePrediction;
    validation: ValidationResult;
}
export interface GeneratedServer {
    code: string;
    context: GenerationContext;
    metadata: {
        generatedAt: string;
        sdkVersion: string;
        templateVersion: string;
        hash: string;
    };
}
export type TemplateFormat = 'typescript' | 'python' | 'javascript';
export interface TemplateOptions {
    format: TemplateFormat;
    includeComments: boolean;
    strictMode: boolean;
    experimentalFeatures: boolean;
}
