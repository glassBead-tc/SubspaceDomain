import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class DependencyResolver {
    constructor() {
        this.knownSecurePackages = new Set(['@modelcontextprotocol/sdk']);
        this.packageVersionCache = new Map();
    }
    async analyzeDependencies(capabilities) {
        const dependencies = {
            required: {
                '@modelcontextprotocol/sdk': {
                    version: 'latest',
                    reason: 'Core MCP functionality'
                }
            },
            optional: {}
        };
        // Analyze tools capabilities
        if (capabilities.tools) {
            for (const [toolName, tool] of Object.entries(capabilities.tools)) {
                const toolDeps = await this.analyzeToolDependencies(toolName, tool);
                dependencies.required = { ...dependencies.required, ...toolDeps };
            }
        }
        // Analyze resource capabilities
        if (capabilities.resources) {
            for (const [resourceName, resource] of Object.entries(capabilities.resources)) {
                const resourceDeps = await this.analyzeResourceDependencies(resourceName, resource);
                dependencies.optional = { ...dependencies.optional, ...resourceDeps };
            }
        }
        return dependencies;
    }
    async validateSecurity(dependencies) {
        const vulnerabilities = [];
        const checkedPackages = new Set();
        // Check required dependencies
        for (const [pkg, info] of Object.entries(dependencies.required)) {
            if (!checkedPackages.has(pkg)) {
                const issues = await this.checkPackageSecurity(pkg, info.version);
                vulnerabilities.push(...issues);
                checkedPackages.add(pkg);
            }
        }
        // Check optional dependencies
        for (const [pkg, info] of Object.entries(dependencies.optional)) {
            if (!checkedPackages.has(pkg)) {
                const issues = await this.checkPackageSecurity(pkg, info.version);
                vulnerabilities.push(...issues);
                checkedPackages.add(pkg);
            }
        }
        return {
            safe: vulnerabilities.length === 0,
            vulnerabilities
        };
    }
    async resolveVersionConflicts(dependencies) {
        const resolved = {
            ...dependencies,
            resolutionStrategy: 'conservative',
            conflicts: []
        };
        const allDeps = new Map();
        // Collect all version requirements
        for (const [pkg, info] of Object.entries(dependencies.required)) {
            if (!allDeps.has(pkg)) {
                allDeps.set(pkg, new Set());
            }
            allDeps.get(pkg).add(info.version);
        }
        for (const [pkg, info] of Object.entries(dependencies.optional)) {
            if (!allDeps.has(pkg)) {
                allDeps.set(pkg, new Set());
            }
            allDeps.get(pkg).add(info.version);
        }
        // Resolve conflicts
        for (const [pkg, versions] of allDeps.entries()) {
            if (versions.size > 1) {
                const resolvedVersion = await this.resolveVersion(pkg, Array.from(versions));
                // Update the resolved version in dependencies
                if (pkg in resolved.required) {
                    resolved.required[pkg] = {
                        ...resolved.required[pkg],
                        version: resolvedVersion
                    };
                }
                if (pkg in resolved.optional) {
                    resolved.optional[pkg] = {
                        ...resolved.optional[pkg],
                        version: resolvedVersion
                    };
                }
                resolved.conflicts.push({
                    package: pkg,
                    requestedVersions: Array.from(versions),
                    resolvedVersion,
                    reason: 'Version conflict resolution'
                });
            }
        }
        return resolved;
    }
    async analyzeToolDependencies(toolName, tool) {
        // Analyze tool implementation to determine required packages
        const deps = {};
        // Add tool-specific dependencies based on capabilities
        switch (toolName) {
            case 'http':
                deps['axios'] = {
                    version: '^1.0.0',
                    reason: 'HTTP client for external requests'
                };
                break;
            case 'database':
                deps['sqlite3'] = {
                    version: '^5.0.0',
                    reason: 'Local data storage'
                };
                break;
            // Add more tool-specific dependencies as needed
        }
        return deps;
    }
    async analyzeResourceDependencies(resourceName, resource) {
        // Analyze resource implementation to determine optional packages
        const deps = {};
        // Add resource-specific dependencies based on capabilities
        switch (resourceName) {
            case 'cache':
                deps['redis'] = {
                    version: '^4.0.0',
                    reason: 'Optional caching support'
                };
                break;
            case 'metrics':
                deps['prom-client'] = {
                    version: '^14.0.0',
                    reason: 'Optional metrics collection'
                };
                break;
            // Add more resource-specific dependencies as needed
        }
        return deps;
    }
    async checkPackageSecurity(packageName, version) {
        const vulnerabilities = [];
        // Skip known secure packages
        if (this.knownSecurePackages.has(packageName)) {
            return vulnerabilities;
        }
        try {
            // Run npm audit
            const { stdout } = await execAsync(`npm audit ${packageName}@${version} --json`);
            const auditResult = JSON.parse(stdout);
            // Process npm audit results
            if (auditResult.vulnerabilities) {
                for (const [severity, details] of Object.entries(auditResult.vulnerabilities)) {
                    if (this.isValidSeverity(severity)) {
                        vulnerabilities.push({
                            package: packageName,
                            severity,
                            description: details.info,
                            recommendation: details.fix || 'Update to a newer version'
                        });
                    }
                }
            }
        }
        catch (error) {
            // If npm audit fails, add a warning
            vulnerabilities.push({
                package: packageName,
                severity: 'low',
                description: 'Unable to verify package security',
                recommendation: 'Manually verify package security'
            });
        }
        return vulnerabilities;
    }
    isValidSeverity(severity) {
        return ['low', 'medium', 'high', 'critical'].includes(severity);
    }
    async resolveVersion(packageName, versions) {
        try {
            // Get available versions from npm
            if (!this.packageVersionCache.has(packageName)) {
                const { stdout } = await execAsync(`npm view ${packageName} versions --json`);
                this.packageVersionCache.set(packageName, JSON.parse(stdout));
            }
            const availableVersions = this.packageVersionCache.get(packageName);
            // Find the highest version that satisfies all requirements
            const satisfyingVersions = availableVersions.filter(version => versions.every(required => this.satisfiesVersion(version, required)));
            if (satisfyingVersions.length > 0) {
                // Return highest satisfying version
                return satisfyingVersions[satisfyingVersions.length - 1];
            }
            // If no version satisfies all requirements, use the highest stable version
            const stableVersions = availableVersions.filter(v => !v.includes('-'));
            return stableVersions[stableVersions.length - 1];
        }
        catch (error) {
            // If version resolution fails, return the highest requested version
            return versions.sort(this.compareVersions)[versions.length - 1];
        }
    }
    satisfiesVersion(actual, required) {
        if (required === 'latest')
            return true;
        const [actualMajor, actualMinor, actualPatch] = actual
            .split('.')
            .map(v => parseInt(v.split('-')[0], 10));
        const requirement = required.replace(/[\^~]/g, '');
        const [reqMajor, reqMinor, reqPatch] = requirement
            .split('.')
            .map(v => parseInt(v.split('-')[0], 10));
        if (required.startsWith('^')) {
            return actualMajor === reqMajor &&
                (actualMajor > reqMajor ||
                    actualMinor > reqMinor ||
                    (actualMinor === reqMinor && actualPatch >= reqPatch));
        }
        if (required.startsWith('~')) {
            return actualMajor === reqMajor &&
                actualMinor === reqMinor &&
                actualPatch >= reqPatch;
        }
        return actualMajor === reqMajor &&
            actualMinor === reqMinor &&
            actualPatch === reqPatch;
    }
    compareVersions(a, b) {
        const [aMajor, aMinor, aPatch] = a
            .split('.')
            .map(v => parseInt(v.split('-')[0], 10));
        const [bMajor, bMinor, bPatch] = b
            .split('.')
            .map(v => parseInt(v.split('-')[0], 10));
        if (aMajor !== bMajor)
            return aMajor - bMajor;
        if (aMinor !== bMinor)
            return aMinor - bMinor;
        return aPatch - bPatch;
    }
}
export default DependencyResolver;
//# sourceMappingURL=dependencyResolver.js.map