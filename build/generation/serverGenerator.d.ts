import { GeneratedServer, TemplateOptions } from './types.js';
import TemplateManager from './templateManager.js';
import DependencyResolver from './dependencyResolver.js';
import { PromptAnalyzer } from './promptAnalyzer.js';
export declare class ServerGenerator {
    private readonly templateManager;
    private readonly dependencyResolver;
    private readonly promptAnalyzer;
    constructor(templateManager: TemplateManager, dependencyResolver: DependencyResolver, promptAnalyzer: PromptAnalyzer);
    generateServer(prompt: string, options?: TemplateOptions): Promise<GeneratedServer>;
    private generateServerCode;
    private generateHandlers;
    private generateToolHandler;
    private generateResourceHandler;
    private generateToolImplementation;
    private generateResourceImplementation;
    private generateServerName;
    private generateHash;
    private getSDKVersion;
    private predictResourceNeeds;
}
export default ServerGenerator;
