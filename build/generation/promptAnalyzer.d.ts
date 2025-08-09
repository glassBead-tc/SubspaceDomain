import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { ValidationResult, DependencyMap } from './types.js';
interface PromptAnalysisResult {
    capabilities: ServerCapabilities;
    authRequirements: AuthConfig;
    dataFlowPatterns: DataFlowConfig;
    externalDependencies: DependencyMap;
}
interface AuthConfig {
    type: 'none' | 'basic' | 'oauth' | 'apiKey';
    requirements: {
        envVars?: string[];
        setupSteps?: string[];
        documentation?: string;
    };
}
interface DataFlowConfig {
    inputSources: string[];
    outputTargets: string[];
    transformations: string[];
    patterns: {
        type: 'stream' | 'batch' | 'request-response';
        description: string;
    }[];
}
export declare class PromptAnalyzer {
    private readonly capabilityPatterns;
    analyzePrompt(prompt: string): Promise<PromptAnalysisResult>;
    validateCapabilities(capabilities: ServerCapabilities): Promise<ValidationResult>;
    private extractCapabilities;
    private analyzeAuthRequirements;
    private analyzeDataFlow;
    /**
     * Extracts potential package dependencies and version specifiers from a prompt string.
     * @param prompt The input string potentially containing dependency mentions.
     * @returns A DependencyMap object.
     */
    extractDependencies(prompt: string): DependencyMap;
    /** Helper heuristic to determine if a matched string is likely a package name. */
    private isLikelyPackage;
    /** Finds all matches of a regex in a string and returns their text and indices. */
    private findMatchesWithIndices;
    /** Finds the first match of a regex in a string and returns its text and start index. */
    private findFirstMatch;
    private isValidToolName;
    private isValidResourceName;
}
export default PromptAnalyzer;
