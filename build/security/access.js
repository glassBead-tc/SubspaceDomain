import { AccessLevel, SecurityError, SecurityErrorType } from './types.js';
/**
 * Access control manager
 * Handles access control rules and permissions
 */
export class AccessControlManager {
    constructor(options) {
        this.validateRules(options.rules);
        this.rules = options.rules;
        this.defaultLevel = options.defaultLevel;
    }
    /**
     * Check access permission
     */
    checkAccess(resource, level, context) {
        try {
            // Get applicable rules
            const rules = this.getApplicableRules(resource, context);
            // If no rules match, use default level
            if (rules.length === 0) {
                return level <= this.defaultLevel;
            }
            // Check if any rule grants the required access level
            return rules.some(rule => {
                // Check basic level requirement
                if (level > rule.level) {
                    return false;
                }
                // Check conditions if present
                if (rule.conditions) {
                    // Time restriction
                    if (rule.conditions.timeRestriction) {
                        const time = context.timestamp || new Date();
                        const restriction = rule.conditions.timeRestriction;
                        // Check time range
                        if (restriction.start && restriction.end) {
                            const start = new Date(`1970-01-01T${restriction.start}Z`);
                            const end = new Date(`1970-01-01T${restriction.end}Z`);
                            const current = new Date(`1970-01-01T${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}Z`);
                            if (current < start || current > end) {
                                return false;
                            }
                        }
                        // Check days
                        if (restriction.days && !restriction.days.includes(time.getDay())) {
                            return false;
                        }
                    }
                    // IP restriction
                    if (rule.conditions.ipRestriction && context.ip) {
                        if (!this.matchIpAddress(context.ip, rule.conditions.ipRestriction)) {
                            return false;
                        }
                    }
                    // Location restriction
                    if (rule.conditions.locationRestriction && context.location) {
                        if (!rule.conditions.locationRestriction.includes(context.location)) {
                            return false;
                        }
                    }
                }
                return true;
            });
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(SecurityErrorType.ACCESS_DENIED, 'Failed to check access', error);
        }
    }
    /**
     * Add access rule
     */
    addRule(rule) {
        try {
            // Validate rule
            this.validateRule(rule);
            // Add rule
            this.rules.push(rule);
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Failed to add rule', error);
        }
    }
    /**
     * Remove access rule
     */
    removeRule(rule) {
        this.rules = this.rules.filter(r => !(r.userId === rule.userId &&
            r.clientId === rule.clientId &&
            r.machineId === rule.machineId &&
            r.level === rule.level &&
            JSON.stringify(r.resources) === JSON.stringify(rule.resources) &&
            JSON.stringify(r.conditions) === JSON.stringify(rule.conditions)));
    }
    /**
     * Get applicable rules for resource and context
     */
    getApplicableRules(resource, context) {
        return this.rules.filter(rule => {
            // Check resource match
            if (rule.resources && !this.matchResource(resource, rule.resources)) {
                return false;
            }
            // Check identity match
            if (rule.userId && rule.userId !== context.userId) {
                return false;
            }
            if (rule.clientId && rule.clientId !== context.clientId) {
                return false;
            }
            if (rule.machineId && rule.machineId !== context.machineId) {
                return false;
            }
            return true;
        });
    }
    /**
     * Match resource against patterns
     */
    matchResource(resource, patterns) {
        return patterns.some(pattern => {
            // Convert glob pattern to regex
            const regex = new RegExp('^' +
                pattern
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.')
                    .replace(/\[!/g, '[^')
                    .replace(/\[/g, '[')
                    .replace(/\]/g, ']')
                    .replace(/\./g, '\\.') +
                '$');
            return regex.test(resource);
        });
    }
    /**
     * Match IP address against patterns
     */
    matchIpAddress(ip, patterns) {
        return patterns.some(pattern => {
            // Handle CIDR notation
            if (pattern.includes('/')) {
                return this.matchCidr(ip, pattern);
            }
            // Handle wildcard notation
            if (pattern.includes('*')) {
                const regex = new RegExp('^' +
                    pattern
                        .replace(/\./g, '\\.')
                        .replace(/\*/g, '\\d+') +
                    '$');
                return regex.test(ip);
            }
            // Exact match
            return ip === pattern;
        });
    }
    /**
     * Match IP address against CIDR pattern
     */
    matchCidr(ip, cidr) {
        const [subnet, bits] = cidr.split('/');
        const mask = parseInt(bits, 10);
        const ipNum = this.ipToNumber(ip);
        const subnetNum = this.ipToNumber(subnet);
        const maskNum = ~((1 << (32 - mask)) - 1);
        return (ipNum & maskNum) === (subnetNum & maskNum);
    }
    /**
     * Convert IP address to number
     */
    ipToNumber(ip) {
        return ip.split('.')
            .reduce((num, octet) => (num << 8) + parseInt(octet, 10), 0) >>> 0;
    }
    /**
     * Validate access rules
     */
    validateRules(rules) {
        if (!Array.isArray(rules)) {
            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Rules must be an array');
        }
        rules.forEach(rule => this.validateRule(rule));
    }
    /**
     * Validate single access rule
     */
    validateRule(rule) {
        // Validate level
        if (!Object.values(AccessLevel).includes(rule.level)) {
            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid access level');
        }
        // Validate resources
        if (rule.resources) {
            if (!Array.isArray(rule.resources)) {
                throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Resources must be an array');
            }
            rule.resources.forEach(resource => {
                if (typeof resource !== 'string') {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Resource must be a string');
                }
            });
        }
        // Validate conditions
        if (rule.conditions) {
            // Time restriction
            if (rule.conditions.timeRestriction) {
                const time = rule.conditions.timeRestriction;
                if (time.start && !time.start.match(/^\d{2}:\d{2}:\d{2}$/)) {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid time format for start time');
                }
                if (time.end && !time.end.match(/^\d{2}:\d{2}:\d{2}$/)) {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid time format for end time');
                }
                if (time.days) {
                    if (!Array.isArray(time.days)) {
                        throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Days must be an array');
                    }
                    time.days.forEach(day => {
                        if (typeof day !== 'number' || day < 0 || day > 6) {
                            throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid day number');
                        }
                    });
                }
            }
            // IP restriction
            if (rule.conditions.ipRestriction) {
                if (!Array.isArray(rule.conditions.ipRestriction)) {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'IP restriction must be an array');
                }
                rule.conditions.ipRestriction.forEach(ip => {
                    if (typeof ip !== 'string') {
                        throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'IP must be a string');
                    }
                    // Validate IP format
                    if (!ip.match(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/) && !ip.match(/^(\d{1,3}|\*)(\.(\d{1,3}|\*)){3}$/)) {
                        throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Invalid IP format');
                    }
                });
            }
            // Location restriction
            if (rule.conditions.locationRestriction) {
                if (!Array.isArray(rule.conditions.locationRestriction)) {
                    throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Location restriction must be an array');
                }
                rule.conditions.locationRestriction.forEach(location => {
                    if (typeof location !== 'string') {
                        throw new SecurityError(SecurityErrorType.INVALID_CONFIG, 'Location must be a string');
                    }
                });
            }
        }
    }
}
//# sourceMappingURL=access.js.map