import { DependencyMap, SecurityReport, ResolvedDependencies } from './types.js';
import { MCPServerCapabilities } from '@modelcontextprotocol/sdk';
export declare class DependencyResolver {
    private readonly knownSecurePackages;
    private readonly packageVersionCache;
    constructor();
    analyzeDependencies(capabilities: MCPServerCapabilities): Promise<DependencyMap>;
    validateSecurity(dependencies: DependencyMap): Promise<SecurityReport>;
    resolveVersionConflicts(dependencies: DependencyMap): Promise<ResolvedDependencies>;
    private analyzeToolDependencies;
    private analyzeResourceDependencies;
    private checkPackageSecurity;
    private isValidSeverity;
    private resolveVersion;
    private satisfiesVersion;
    private compareVersions;
}
export default DependencyResolver;
