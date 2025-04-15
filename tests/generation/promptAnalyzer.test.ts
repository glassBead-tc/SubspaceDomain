import { PromptAnalyzer } from '../../src/generation/promptAnalyzer';
import { DependencyMap } from '../../src/generation/types';

describe('PromptAnalyzer - extractDependencies', () => {
    let analyzer: PromptAnalyzer;
    const defaultDep = {
        version: 'latest',
        reason: 'Default dependency for MCP Bridge Server projects.',
    };
    const promptReason = (pkg: string) => `Identified from prompt: ${pkg}`;


    beforeEach(() => {
        // Assuming PromptAnalyzer has a default constructor or setup needed
        analyzer = new PromptAnalyzer();
    });

    it('should return default dependency for null prompt', () => {
        const expected: DependencyMap = {
            required: { '@modelcontextprotocol/sdk': defaultDep },
            optional: {},
        };
        // Need to handle potential null input if the function signature allows it
        expect(analyzer.extractDependencies(null as any)).toEqual(expected);
    });

    it('should return default dependency for empty prompt', () => {
        const expected: DependencyMap = {
            required: { '@modelcontextprotocol/sdk': defaultDep },
            optional: {},
        };
        expect(analyzer.extractDependencies('')).toEqual(expected);
    });

    it('should return default dependency for prompt with no dependencies', () => {
        const prompt = "Create a simple web server.";
        const expected: DependencyMap = {
            required: { '@modelcontextprotocol/sdk': defaultDep },
            optional: {},
        };
        expect(analyzer.extractDependencies(prompt)).toEqual(expected);
    });

     it('should extract a simple dependency without version', () => {
        const prompt = "Use express for routing.";
        const expected: DependencyMap = {
            required: {
                '@modelcontextprotocol/sdk': defaultDep,
                'express': { version: 'latest', reason: promptReason('express') }
            },
            optional: {},
        };
        expect(analyzer.extractDependencies(prompt)).toEqual(expected);
    });

    it('should extract a simple dependency with a specific version', () => {
        const prompt = "Need react@^18.2.0 for the UI.";
        const expected: DependencyMap = {
            required: {
                '@modelcontextprotocol/sdk': defaultDep,
                'react': { version: '^18.2.0', reason: promptReason('react@^18.2.0') }
            },
            optional: {},
        };
        expect(analyzer.extractDependencies(prompt)).toEqual(expected);
    });

     it('should extract multiple dependencies with and without versions', () => {
        const prompt = "Use react@^18.2.0 and also @reduxjs/toolkit@~1.9, plus axios.";
        const expected: DependencyMap = {
            required: {
                '@modelcontextprotocol/sdk': defaultDep,
                'react': { version: '^18.2.0', reason: promptReason('react@^18.2.0') },
                '@reduxjs/toolkit': { version: '~1.9', reason: promptReason('@reduxjs/toolkit@~1.9') },
                'axios': { version: 'latest', reason: promptReason('axios') }
            },
            optional: {},
        };
        expect(analyzer.extractDependencies(prompt)).toEqual(expected);
    });

    // More tests will be added here based on TDD anchors
});