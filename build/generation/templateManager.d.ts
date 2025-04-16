import { ServerTemplate, TemplateOptions } from './types.js';
export declare class TemplateManager {
    private templates;
    private readonly templatesDir;
    constructor(templatesDir?: string);
    initialize(): Promise<void>;
    private initializeDefaultTemplates;
    private loadDefaultTemplate;
    private saveRegistry;
    getTemplate(version: string): ServerTemplate | undefined;
    getLatestTemplate(): ServerTemplate;
    validateTemplate(template: ServerTemplate): boolean;
    migrateTemplate(template: ServerTemplate, targetVersion: string): Promise<ServerTemplate>;
    private applyMigration;
    private compareVersions;
    generateServerCode(template: ServerTemplate, options: TemplateOptions, replacements: Record<string, string>): Promise<string>;
    private transformToPython;
    private transformToJavaScript;
    private stripComments;
    private addStrictMode;
}
export default TemplateManager;
