// Define constants for regex patterns and common words filter
// Simplified Regex - Capture group 1 has the package name
const PACKAGE_NAME_REGEX = /((?:@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_.-]{2,})/g;
// Refined version regex to capture common specifiers more accurately
const VERSION_SPECIFIER_REGEX = /^@([~^]?\d+(\.\d+){0,2}(-[a-zA-Z0-9_.-]+)?|latest|next|[\*xX])/;
const COMMON_WORDS_FILTER = new Set([
    "the", "a", "an", "is", "in", "it", "of", "and", "to", "for", "with", "on", "as",
    "if", "or", "be", "use", "run", "get", "set", "new", "old", "type", "any", "all",
    "test", "build", "start", "dev", "prod", "config", "server", "client", "api", "app",
    "core", "util", "lib", "common", "shared", "index", "main", "src", "dist", "import",
    "export", "from", "function", "class", "const", "let", "var", "return", "await",
    "async", "promise", "interface", "implements", "extends", "private", "public",
    "static", "this", "super", "try", "catch", "finally", "throw", "while", "for",
    "switch", "case", "default", "break", "continue", "package", "version", "dependency",
    "install", "require", "module", "node", "npm", "yarn", "pnpm", "script", "file",
    "directory", "path", "env", "environment", "variable", "string", "number", "boolean",
    "object", "array", "null", "undefined", "true", "false", "error", "warning", "info",
    "debug", "log", "console", "process", "system", "os", "network", "http", "https",
    "url", "uri", "json", "yaml", "xml", "html", "css", "js", "ts", "jsx", "tsx", "md",
    "txt", "data", "value", "key", "name", "id", "description", "metadata", "context",
    "prompt", "analyze", "generate", "create", "update", "delete", "read", "write",
    "list", "search", "find", "get", "set", "add", "remove", "validate", "resolve",
    "extract", "parse", "format", "handle", "manage", "monitor", "report", "audit",
    "secure", "encrypt", "decrypt", "auth", "login", "logout", "user", "session",
    "token", "credential", "permission", "access", "role", "group", "policy", "rule",
    "event", "message", "queue", "stream", "batch", "request", "response", "header",
    "body", "status", "code", "result", "output", "input", "parameter", "argument",
    "option", "setting", "feature", "capability", "resource", "tool", "sdk", "mcp",
    "model", "context", "protocol", "bridge", "server", "client", "agent", "mode",
    "task", "workflow", "step", "action", "command", "execute", "run", "build", "test",
    "deploy", "start", "stop", "restart", "status", "config", "setting", "env",
    "secret", "key", "value", "variable", "parameter", "argument", "option", "flag",
    "help", "version", "info", "debug", "verbose", "quiet", "silent", "force", "yes",
    "no", "all", "none", "any", "some", "each", "map", "filter", "reduce", "sort",
    "find", "index", "match", "replace", "split", "join", "trim", "lower", "upper",
    "case", "default", "break", "continue", "return", "throw", "try", "catch", "finally",
    "async", "await", "promise", "resolve", "reject", "then", "yield", "generator",
    "iterator", "iterable", "symbol", "proxy", "reflect", "global", "window", "document",
    "navigator", "location", "history", "storage", "cookie", "event", "listener",
    "target", "current", "previous", "next", "first", "last", "item", "element",
    "node", "component", "module", "class", "function", "method", "property", "field",
    "attribute", "tag", "selector", "style", "layout", "render", "update", "state",
    "props", "hook", "effect", "ref", "memo", "callback", "context", "provider",
    "consumer", "router", "route", "link", "navigate", "history", "location", "match",
    "params", "query", "state", "store", "reducer", "action", "dispatch", "selector",
    "middleware", "saga", "thunk", "observable", "subject", "pipe", "subscribe",
    "unsubscribe", "operator", "error", "exception", "handler", "logger", "transport",
    "formatter", "level", "message", "timestamp", "metadata", "metric", "counter",
    "gauge", "histogram", "summary", "label", "tag", "trace", "span", "context",
    "baggage", "propagation", "instrumentation", "exporter", "collector", "processor",
    "sampler", "resource", "attribute", "event", "log", "record", "database", "table",
    "collection", "document", "row", "column", "field", "index", "query", "mutation",
    "aggregation", "transaction", "connection", "pool", "driver", "adapter", "orm",
    "migration", "schema", "model", "entity", "repository", "service", "controller",
    "view", "template", "engine", "cache", "store", "key", "value", "ttl", "expiry",
    "invalidation", "policy", "strategy", "lock", "semaphore", "mutex", "queue", "stack",
    "list", "set", "map", "tree", "graph", "algorithm", "data", "structure", "pattern",
    "design", "architecture", "component", "module", "library", "framework", "platform",
    "sdk", "api", "interface", "contract", "protocol", "standard", "specification",
    "documentation", "readme", "tutorial", "example", "guide", "reference", "changelog",
    "license", "contributing", "issue", "bug", "feature", "request", "pull", "merge",
    "commit", "branch", "tag", "release", "version", "dependency", "package", "manager",
    "registry", "repository", "source", "control", "git", "svn", "hg", "ci", "cd",
    "pipeline", "build", "test", "deploy", "automation", "script", "task", "job",
    "workflow", "orchestration", "container", "docker", "kubernetes", "vm", "serverless",
    "cloud", "aws", "gcp", "azure", "provider", "service", "resource", "instance",
    "cluster", "node", "pod", "deployment", "service", "ingress", "load", "balancer",
    "firewall", "network", "vpc", "subnet", "route", "dns", "cdn", "storage", "bucket",
    "blob", "file", "database", "cache", "queue", "message", "event", "function", "lambda",
    "compute", "instance", "vm", "container", "registry", "repository", "artifact",
    "image", "monitoring", "logging", "tracing", "alerting", "dashboard", "security",
    "identity", "access", "management", "iam", "role", "policy", "permission", "audit",
    "compliance", "encryption", "key", "certificate", "secret", "vault", "cost",
    "billing", "budget", "optimization", "performance", "scalability", "reliability",
    "availability", "resilience", "disaster", "recovery", "backup", "restore", "test",
    "unit", "integration", "e2e", "end-to-end", "component", "contract", "performance",
    "load", "stress", "security", "penetration", "fuzz", "coverage", "report", "runner",
    "framework", "library", "assertion", "mock", "stub", "spy", "fixture", "setup",
    "teardown", "before", "after", "each", "all", "describe", "it", "expect", "assert",
    "should", "chai", "mocha", "jest", "jasmine", "karma", "cypress", "playwright",
    "selenium", "webdriver", "puppeteer", "storybook", "styleguidist", "documentation",
    "jsdoc", "tsdoc", "typedoc", "sphinx", "javadoc", "doxygen", "swagger", "openapi",
    "raml", "blueprint", "graphql", "sdl", "schema", "query", "mutation", "subscription",
    "resolver", "type", "interface", "enum", "union", "scalar", "directive", "introspection",
    "federation", "gateway", "subgraph", "rest", "http", "crud", "get", "post", "put",
    "patch", "delete", "options", "head", "trace", "connect", "url", "uri", "path",
    "query", "param", "header", "body", "form", "data", "json", "xml", "yaml", "protobuf",
    "grpc", "rpc", "websocket", "sse", "mqtt", "amqp", "kafka", "rabbitmq", "redis",
    "pubsub", "event", "message", "broker", "producer", "consumer", "topic", "queue",
    "channel", "subscription", "stream", "pipeline", "etl", "elt", "data", "warehouse",
    "lake", "mart", "analytics", "bi", "business", "intelligence", "dashboard", "report",
    "visualization", "chart", "graph", "table", "sql", "nosql", "newsql", "database",
    "query", "language", "engine", "storage", "index", "partition", "shard", "replica",
    "consistency", "transaction", "acid", "base", "cap", "theorem", "machine", "learning",
    "ai", "artificial", "intelligence", "deep", "neural", "network", "model", "training",
    "inference", "prediction", "classification", "regression", "clustering", "nlp",
    "natural", "language", "processing", "cv", "computer", "vision", "speech",
    "recognition", "synthesis", "recommendation", "system", "reinforcement", "agent",
    "environment", "reward", "policy", "state", "action", "tensorflow", "pytorch",
    "keras", "scikit-learn", "pandas", "numpy", "scipy", "matplotlib", "seaborn",
    "jupyter", "notebook", "colab", "kaggle", "dataset", "feature", "engineering",
    "preprocessing", "normalization", "scaling", "encoding", "embedding", "vector",
    "dimension", "reduction", "pca", "t-sne", "umap", "hyperparameter", "tuning",
    "optimization", "gradient", "descent", "backpropagation", "loss", "function",
    "accuracy", "precision", "recall", "f1", "score", "auc", "roc", "confusion", "matrix",
    "overfitting", "underfitting", "regularization", "dropout", "batch", "normalization",
    "activation", "function", "relu", "sigmoid", "tanh", "softmax", "convolutional",
    "cnn", "recurrent", "rnn", "lstm", "gru", "transformer", "attention", "bert", "gpt",
    "llm", "large", "language", "model", "prompt", "engineering", "fine-tuning",
    "transfer", "learning", "zero-shot", "few-shot", "rag", "retrieval", "augmented",
    "generation", "vector", "database", "embedding", "similarity", "search", "ann",
    "approximate", "nearest", "neighbor", "faiss", "annoy", "nmslib", "pinecone",
    "weaviate", "milvus", "qdrant", "chroma", "langchain", "llamaindex", "haystack",
    "openai", "anthropic", "google", "meta", "huggingface", "cohere", "mistral",
    "gemini", "claude", "chatgpt", "api", "sdk", "library", "tool", "framework",
    "platform", "service", "model", "endpoint", "request", "response", "token", "usage",
    "cost", "limit", "quota", "rate", "policy", "fine-tuning", "embedding", "completion",
    "chat", "image", "audio", "video", "code", "generation", "translation", "summarization",
    "classification", "sentiment", "analysis", "entity", "recognition", "question",
    "answering", "search", "retrieval", "recommendation", "personalization", "safety",
    "ethics", "bias", "fairness", "transparency", "explainability", "privacy", "security",
    "robustness", "adversarial", "attack", "defense", "alignment", "governance",
    "regulation", "policy", "compliance", "audit", "responsible", "ai", "human", "loop",
    "evaluation", "benchmark", "metric", "leaderboard", "research", "paper", "conference",
    "journal", "arxiv", "github", "community", "forum", "discord", "slack", "contributor",
    "maintainer", "issue", "pull", "request", "code", "review", "documentation", "example",
    "tutorial", "blog", "post", "news", "update", "release", "roadmap", "future", "plan", "simple", "web", "also", "plus"
]);
export class PromptAnalyzer {
    constructor() {
        this.capabilityPatterns = [
            {
                keywords: ['http', 'request', 'fetch', 'api'],
                category: 'tool',
                capability: 'httpClient',
                parameters: {
                    timeout: 30000,
                    retries: 3
                }
            },
            {
                keywords: ['database', 'storage', 'persist'],
                category: 'tool',
                capability: 'database',
                parameters: {
                    type: 'sqlite',
                    path: ':memory:'
                }
            },
            {
                keywords: ['cache', 'redis', 'memory'],
                category: 'resource',
                capability: 'cache'
            },
            {
                keywords: ['metrics', 'monitoring', 'stats'],
                category: 'resource',
                capability: 'metrics'
            }
        ];
    }
    async analyzePrompt(prompt) {
        const capabilities = await this.extractCapabilities(prompt);
        const authRequirements = this.analyzeAuthRequirements(prompt);
        const dataFlowPatterns = this.analyzeDataFlow(prompt);
        const externalDependencies = this.extractDependencies(prompt); // Now returns DependencyMap
        return {
            capabilities,
            authRequirements,
            dataFlowPatterns,
            externalDependencies
        };
    }
    async validateCapabilities(capabilities) {
        const errors = [];
        const warnings = [];
        // Validate tools
        if (capabilities.tools) {
            for (const [name, tool] of Object.entries(capabilities.tools)) {
                if (!this.isValidToolName(name)) {
                    errors.push({
                        code: 'INVALID_TOOL_NAME',
                        message: `Invalid tool name: ${name}`,
                        severity: 'error'
                    });
                }
                if (!tool.description) {
                    warnings.push({
                        code: 'MISSING_TOOL_DESCRIPTION',
                        message: `Tool ${name} is missing a description`,
                        recommendation: 'Add a description to improve usability'
                    });
                }
            }
        }
        // Validate resources
        if (capabilities.resources) {
            for (const [name, resource] of Object.entries(capabilities.resources)) {
                if (!this.isValidResourceName(name)) {
                    errors.push({
                        code: 'INVALID_RESOURCE_NAME',
                        message: `Invalid resource name: ${name}`,
                        severity: 'error'
                    });
                }
                if (!resource.description) {
                    warnings.push({
                        code: 'MISSING_RESOURCE_DESCRIPTION',
                        message: `Resource ${name} is missing a description`,
                        recommendation: 'Add a description to improve usability'
                    });
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    async extractCapabilities(prompt) {
        const capabilities = {
            tools: {},
            resources: {}
        };
        // Extract capabilities based on patterns
        for (const pattern of this.capabilityPatterns) {
            if (pattern.keywords.some(keyword => prompt.toLowerCase().includes(keyword.toLowerCase()))) {
                if (pattern.category === 'tool') {
                    capabilities.tools[pattern.capability] = {
                        description: `Auto-generated ${pattern.capability} tool`,
                        parameters: pattern.parameters
                    };
                }
                else {
                    capabilities.resources[pattern.capability] = {
                        description: `Auto-generated ${pattern.capability} resource`
                    };
                }
            }
        }
        return capabilities;
    }
    analyzeAuthRequirements(prompt) {
        // Default to no auth
        const auth = {
            type: 'none',
            requirements: {}
        };
        // Check for auth-related keywords
        if (prompt.toLowerCase().includes('oauth')) {
            auth.type = 'oauth';
            auth.requirements = {
                envVars: ['CLIENT_ID', 'CLIENT_SECRET'],
                setupSteps: [
                    'Create OAuth application',
                    'Configure redirect URI',
                    'Store credentials in environment'
                ]
            };
        }
        else if (prompt.toLowerCase().includes('api key')) {
            auth.type = 'apiKey';
            auth.requirements = {
                envVars: ['API_KEY'],
                setupSteps: [
                    'Generate API key',
                    'Store key in environment'
                ]
            };
        }
        return auth;
    }
    analyzeDataFlow(prompt) {
        const dataFlow = {
            inputSources: [],
            outputTargets: [],
            transformations: [],
            patterns: []
        };
        // Extract data flow patterns from prompt
        if (prompt.toLowerCase().includes('stream')) {
            dataFlow.patterns.push({
                type: 'stream',
                description: 'Continuous data processing'
            });
        }
        if (prompt.toLowerCase().includes('batch')) {
            dataFlow.patterns.push({
                type: 'batch',
                description: 'Periodic batch processing'
            });
        }
        // Default to request-response if no specific pattern found
        if (dataFlow.patterns.length === 0) {
            dataFlow.patterns.push({
                type: 'request-response',
                description: 'Synchronous request handling'
            });
        }
        return dataFlow;
    }
    /**
     * Extracts potential package dependencies and version specifiers from a prompt string.
     * @param prompt The input string potentially containing dependency mentions.
     * @returns A DependencyMap object.
     */
    extractDependencies(prompt) {
        const requiredDependencies = {};
        // Add default MCP SDK dependency
        requiredDependencies["@modelcontextprotocol/sdk"] = { version: "latest", reason: "Default dependency for MCP Bridge Server projects." };
        if (!prompt || prompt.trim() === "") {
            return { required: requiredDependencies, optional: {} };
        }
        // Use the simplified regex and extraction logic
        const potentialMatches = this.findMatchesWithIndices(prompt, PACKAGE_NAME_REGEX);
        for (const match of potentialMatches) {
            const packageName = match.text; // Clean package name from group 1
            const startIndex = match.startIndex; // Index of the clean package name
            const endIndex = match.endIndex; // Index after the clean package name
            // Check if the match is likely a package name using the helper
            if (this.isLikelyPackage(packageName, prompt, startIndex)) {
                let detectedVersion = "latest";
                let reason = `Identified from prompt: ${packageName}`; // Include package name
                // Check for an immediate version specifier like package@version
                const substringAfterPackage = prompt.substring(endIndex);
                const versionMatch = this.findFirstMatch(substringAfterPackage, VERSION_SPECIFIER_REGEX);
                // Ensure the version specifier starts immediately after the package name
                if (versionMatch && versionMatch.startIndex === 0) {
                    detectedVersion = versionMatch.text.substring(1); // Remove leading '@'
                    reason = `Identified from prompt: ${packageName}@${detectedVersion}`; // Include package name and version
                }
                // Add or update the dependency (last mention wins)
                requiredDependencies[packageName] = { version: detectedVersion, reason: reason };
            }
        }
        const dependencyMap = {
            required: requiredDependencies,
            optional: {} // Optional dependencies are not handled in this version
        };
        return dependencyMap;
    }
    /** Helper heuristic to determine if a matched string is likely a package name. */
    isLikelyPackage(packageName, context, index) {
        // Basic length and character checks (npm package name rules)
        // Strip scope for length check if present
        const namePart = packageName.replace(/^@[a-zA-Z0-9_-]+\//, '');
        if (namePart.length < 1 || namePart.length > 214) {
            return false;
        }
        // Regex for valid npm package names (scoped or unscoped)
        // Disallow trailing dots/hyphens, ensure at least one non-numeric/dot/hyphen char if unscoped
        if (!/^(?:@[a-zA-Z0-9_-]+\/)?(?:[a-zA-Z0-9_.-]*[a-zA-Z0-9_-])$/.test(packageName)) {
            return false;
        }
        // Cannot start with . or _
        if (namePart.startsWith('.') || namePart.startsWith('_')) {
            return false;
        }
        // Cannot contain uppercase letters (though regex allows it, npm normalizes)
        if (/[A-Z]/.test(namePart)) {
            return false;
        }
        // Disallow purely numeric/dot/hyphen names unless scoped
        if (!packageName.includes('/') && /^[0-9.-]+$/.test(namePart)) {
            return false;
        }
        // Filter common words
        if (COMMON_WORDS_FILTER.has(packageName.toLowerCase())) {
            return false;
        }
        // Check context: Look for keywords like 'install', 'import', 'require', 'package' nearby
        const precedingText = context.substring(Math.max(0, index - 25), index).toLowerCase();
        // Higher confidence if preceded by install/import keywords
        if (/(npm i|npm install|yarn add|pnpm add|import|require|dependency|package)\s+$/.test(precedingText)) {
            return true;
        }
        // Check if it's a scoped package (strong indicator)
        if (packageName.includes('/')) {
            return true; // Scoped packages are very likely intended dependencies, even without preceding keywords
        }
        // Check for negative following context more carefully
        const charAfter = context.charAt(index + packageName.length); // Get char immediately after package name
        if (/[a-zA-Z0-9]/.test(charAfter)) {
            // If followed immediately by alphanumeric, it's likely part of a larger word.
            return false;
        }
        // Consider '.' or '/' as negative context only if not preceded by strong keywords
        if (/[.\/]/.test(charAfter) && !/(npm i|npm install|yarn add|pnpm add|import|require|dependency|package)\s+$/.test(precedingText)) {
            return false;
        }
        // Default to true if basic checks passed and no strong negative indicators found
        return true;
    }
    // --- Helper functions for regex matching ---
    /** Finds all matches of a regex in a string and returns their text and indices. */
    findMatchesWithIndices(text, regex) {
        const matches = [];
        let match;
        // Ensure the regex has the global flag 'g' for exec to work correctly in a loop
        const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        while ((match = globalRegex.exec(text)) !== null) {
            // match[1] is the clean package name because of the capture group
            if (match[1]) { // Ensure capture group 1 exists
                const packageName = match[1];
                // Calculate the start index of the package name (group 1) within the original text
                // Add 1 unless the match started at the beginning of the string (^)
                const startIndex = match.index + (match[0].startsWith(packageName) ? 0 : 1);
                matches.push({
                    text: packageName,
                    startIndex: startIndex,
                    endIndex: startIndex + packageName.length // End index relative to the clean package name
                });
            }
            // Avoid infinite loops with zero-width matches
            if (match[0].length === 0) {
                globalRegex.lastIndex++;
            }
        }
        return matches;
    }
    /** Finds the first match of a regex in a string and returns its text and start index. */
    findFirstMatch(text, regex) {
        // Ensure the regex does NOT have the global flag 'g' if we only want the first match from the start
        // If the regex is designed to match anywhere, 'g' is fine, but we usually want the first occurrence.
        // The provided VERSION_SPECIFIER_REGEX uses ^, so it only matches at the start.
        const match = regex.exec(text);
        if (match) {
            return {
                text: match[0],
                startIndex: match.index
            };
        }
        return null;
    }
    isValidToolName(name) {
        return /^[a-z][a-zA-Z0-9]*$/.test(name);
    }
    isValidResourceName(name) {
        return /^[a-z][a-zA-Z0-9]*$/.test(name);
    }
}
export default PromptAnalyzer;
//# sourceMappingURL=promptAnalyzer.js.map