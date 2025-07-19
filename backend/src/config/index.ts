import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import type { SystemConfig } from '@/types/index.js';

// Load environment variables
dotenvConfig();

// Validation schemas
const rateLimitSchema = z.object({
    requests: z.number().min(1),
    window: z.number().min(1000), // milliseconds
    retryAfter: z.number().min(1000)
});

const llmProviderSchema = z.object({
    provider: z.enum(['openai', 'anthropic', 'ollama', 'custom']),
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string(),
    maxRetries: z.number().min(0).max(10),
    timeout: z.number().min(1000).max(300000)
});

const configSchema = z.object({
    // GitHub configuration
    github: z.object({
        token: z.string().min(1, 'GitHub token is required'),
        webhookSecret: z.string().optional(),
        rateLimit: rateLimitSchema,
        includeForks: z.boolean(),
        includePrivate: z.boolean(),
        maxReposPerSync: z.number().min(1).max(1000),
        maxPRsPerRepo: z.number().min(1).max(100)
    }),

    // LLM configuration
    llm: z.object({
        primary: llmProviderSchema,
        fallback: llmProviderSchema.optional(),
        maxTokens: z.number().min(100).max(100000),
        temperature: z.number().min(0).max(2),
        customPrompts: z.record(z.string()),
        costLimits: z.object({
            dailyLimit: z.number().min(0),
            monthlyLimit: z.number().min(0),
            perRequestLimit: z.number().min(0)
        })
    }),

    // Storage configuration
    storage: z.object({
        type: z.enum(['sqlite', 'postgresql', 'mysql']),
        connectionString: z.string().optional(),
        database: z.string(),
        backupEnabled: z.boolean(),
        retentionDays: z.number().min(1).max(365)
    }),

    // Security configuration
    security: z.object({
        encryptionKey: z.string().min(32),
        jwtSecret: z.string().min(32),
        sessionTimeout: z.number().min(300), // 5 minutes minimum
        apiRateLimit: rateLimitSchema,
        corsOrigins: z.array(z.string())
    }),

    // Scheduling configuration
    scheduling: z.object({
        enabled: z.boolean(),
        interval: z.number().min(1).max(1440), // 1 minute to 24 hours
        timezone: z.string(),
        adaptiveScheduling: z.boolean(),
        quietHours: z.object({
            start: z.string().regex(/^\d{2}:\d{2}$/),
            end: z.string().regex(/^\d{2}:\d{2}$/)
        })
    }),

    // Notifications configuration
    notifications: z.object({
        enabled: z.boolean(),
        channels: z.array(z.object({
            type: z.enum(['email', 'slack', 'telegram', 'discord', 'webhook', 'notion']),
            enabled: z.boolean(),
            config: z.record(z.any()),
            filters: z.array(z.object({
                field: z.string(),
                operator: z.enum(['equals', 'contains', 'in', 'gt', 'lt']),
                value: z.any()
            }))
        })),
        templates: z.array(z.object({
            channel: z.string(),
            format: z.enum(['text', 'html', 'markdown']),
            template: z.string(),
            variables: z.array(z.string())
        })),
        batchSize: z.number().min(1).max(100),
        retryAttempts: z.number().min(0).max(10),
        cooldownPeriod: z.number().min(0)
    }),

    // Monitoring configuration
    monitoring: z.object({
        enabled: z.boolean(),
        logLevel: z.enum(['debug', 'info', 'warn', 'error']),
        metricsEnabled: z.boolean(),
        healthCheckInterval: z.number().min(60),
        alerting: z.object({
            enabled: z.boolean(),
            errorThreshold: z.number().min(1),
            responseTimeThreshold: z.number().min(100),
            rateLimitThreshold: z.number().min(0.1).max(1),
            costThreshold: z.number().min(1)
        })
    })
});

// Helper functions
function getEnvString(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${key} is required`);
    }
    return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required`);
    }
    return value ? parseInt(value, 10) : defaultValue!;
}

function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required`);
    }
    return value ? value.toLowerCase() === 'true' : defaultValue!;
}

function getEnvArray(key: string, defaultValue?: string[]): string[] {
    const value = process.env[key];
    if (!value && !defaultValue) {
        return [];
    }
    return value ? value.split(',').map(s => s.trim()) : defaultValue!;
}

// Build configuration from environment variables
function buildConfig(): SystemConfig {
    return {
        github: {
            token: getEnvString('GITHUB_TOKEN'),
            webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
            rateLimit: {
                requests: getEnvNumber('GITHUB_RATE_LIMIT_REQUESTS', 5000),
                window: getEnvNumber('GITHUB_RATE_LIMIT_WINDOW', 3600000), // 1 hour
                retryAfter: getEnvNumber('GITHUB_RATE_LIMIT_RETRY_AFTER', 60000) // 1 minute
            },
            includeForks: getEnvBoolean('GITHUB_INCLUDE_FORKS', false),
            includePrivate: getEnvBoolean('GITHUB_INCLUDE_PRIVATE', false),
            maxReposPerSync: getEnvNumber('MAX_REPOS_PER_SYNC', 50),
            maxPRsPerRepo: getEnvNumber('MAX_PRS_PER_REPO', 20)
        },

        llm: {
            primary: {
                provider: (process.env.LLM_PRIMARY_PROVIDER as any) || 'openai',
                apiKey: process.env.LLM_PRIMARY_API_KEY,
                baseUrl: process.env.LLM_PRIMARY_BASE_URL,
                model: getEnvString('LLM_PRIMARY_MODEL', 'gpt-4'),
                maxRetries: getEnvNumber('LLM_MAX_RETRIES', 3),
                timeout: getEnvNumber('LLM_TIMEOUT', 30000)
            },
            fallback: process.env.LLM_FALLBACK_PROVIDER ? {
                provider: (process.env.LLM_FALLBACK_PROVIDER as any),
                apiKey: process.env.LLM_FALLBACK_API_KEY,
                baseUrl: process.env.LLM_FALLBACK_BASE_URL,
                model: getEnvString('LLM_FALLBACK_MODEL', 'claude-3-sonnet-20240229'),
                maxRetries: getEnvNumber('LLM_FALLBACK_MAX_RETRIES', 3),
                timeout: getEnvNumber('LLM_FALLBACK_TIMEOUT', 30000)
            } : undefined,
            maxTokens: getEnvNumber('LLM_MAX_TOKENS', 4000),
            temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
            customPrompts: {},
            costLimits: {
                dailyLimit: parseFloat(process.env.LLM_DAILY_COST_LIMIT || '10.00'),
                monthlyLimit: parseFloat(process.env.LLM_MONTHLY_COST_LIMIT || '100.00'),
                perRequestLimit: parseFloat(process.env.LLM_PER_REQUEST_LIMIT || '1.00')
            }
        },

        storage: {
            type: (process.env.DATABASE_TYPE as any) || 'sqlite',
            connectionString: process.env.DATABASE_URL,
            database: getEnvString('DATABASE_PATH', './data/git-watch.db'),
            backupEnabled: getEnvBoolean('BACKUP_ENABLED', true),
            retentionDays: getEnvNumber('DATA_RETENTION_DAYS', 90)
        },

        security: {
            encryptionKey: getEnvString('ENCRYPTION_KEY'),
            jwtSecret: getEnvString('JWT_SECRET'),
            sessionTimeout: getEnvNumber('SESSION_TIMEOUT', 86400), // 24 hours
            apiRateLimit: {
                requests: getEnvNumber('API_RATE_LIMIT_REQUESTS', 100),
                window: getEnvNumber('API_RATE_LIMIT_WINDOW', 900000), // 15 minutes
                retryAfter: getEnvNumber('API_RATE_LIMIT_RETRY_AFTER', 60000) // 1 minute
            },
            corsOrigins: getEnvArray('CORS_ORIGINS', ['http://localhost:5173'])
        },

        scheduling: {
            enabled: getEnvBoolean('SYNC_ENABLED', true),
            interval: getEnvNumber('SYNC_INTERVAL', 60), // 1 hour
            timezone: getEnvString('SYNC_TIMEZONE', 'UTC'),
            adaptiveScheduling: getEnvBoolean('ADAPTIVE_SCHEDULING', true),
            quietHours: {
                start: getEnvString('QUIET_HOURS_START', '23:00'),
                end: getEnvString('QUIET_HOURS_END', '07:00')
            }
        },

        notifications: {
            enabled: getEnvBoolean('NOTIFICATIONS_ENABLED', true),
            channels: buildNotificationChannels(),
            templates: [],
            batchSize: getEnvNumber('NOTIFICATION_BATCH_SIZE', 10),
            retryAttempts: getEnvNumber('NOTIFICATION_RETRY_ATTEMPTS', 3),
            cooldownPeriod: getEnvNumber('NOTIFICATION_COOLDOWN_PERIOD', 300) // 5 minutes
        },

        monitoring: {
            enabled: getEnvBoolean('MONITORING_ENABLED', true),
            logLevel: (process.env.LOG_LEVEL as any) || 'info',
            metricsEnabled: getEnvBoolean('METRICS_ENABLED', true),
            healthCheckInterval: getEnvNumber('HEALTH_CHECK_INTERVAL', 300), // 5 minutes
            alerting: {
                enabled: getEnvBoolean('ALERTING_ENABLED', true),
                errorThreshold: getEnvNumber('ALERT_ERROR_THRESHOLD', 10),
                responseTimeThreshold: getEnvNumber('ALERT_RESPONSE_TIME_THRESHOLD', 5000),
                rateLimitThreshold: parseFloat(process.env.ALERT_RATE_LIMIT_THRESHOLD || '0.8'),
                costThreshold: parseFloat(process.env.ALERT_COST_THRESHOLD || '80.0')
            }
        }
    };
}

function buildNotificationChannels() {
    const channels = [];

    // Email channel
    if (getEnvBoolean('EMAIL_ENABLED', false)) {
        channels.push({
            type: 'email' as const,
            enabled: true,
            config: {
                smtp: {
                    host: getEnvString('EMAIL_SMTP_HOST'),
                    port: getEnvNumber('EMAIL_SMTP_PORT', 587),
                    secure: getEnvBoolean('EMAIL_SMTP_SECURE', false),
                    auth: {
                        user: getEnvString('EMAIL_SMTP_USER'),
                        pass: getEnvString('EMAIL_SMTP_PASS')
                    }
                },
                from: getEnvString('EMAIL_FROM'),
                to: getEnvString('EMAIL_TO')
            },
            filters: []
        });
    }

    // Slack channel
    if (getEnvBoolean('SLACK_ENABLED', false)) {
        channels.push({
            type: 'slack' as const,
            enabled: true,
            config: {
                botToken: getEnvString('SLACK_BOT_TOKEN'),
                channel: getEnvString('SLACK_CHANNEL', '#general'),
                webhookUrl: process.env.SLACK_WEBHOOK_URL
            },
            filters: []
        });
    }

    // Telegram channel
    if (getEnvBoolean('TELEGRAM_ENABLED', false)) {
        channels.push({
            type: 'telegram' as const,
            enabled: true,
            config: {
                botToken: getEnvString('TELEGRAM_BOT_TOKEN'),
                chatId: getEnvString('TELEGRAM_CHAT_ID')
            },
            filters: []
        });
    }

    // Discord channel
    if (getEnvBoolean('DISCORD_ENABLED', false)) {
        channels.push({
            type: 'discord' as const,
            enabled: true,
            config: {
                webhookUrl: getEnvString('DISCORD_WEBHOOK_URL')
            },
            filters: []
        });
    }

    // Notion channel
    if (getEnvBoolean('NOTION_ENABLED', false)) {
        channels.push({
            type: 'notion' as const,
            enabled: true,
            config: {
                token: getEnvString('NOTION_TOKEN'),
                databaseId: getEnvString('NOTION_DATABASE_ID')
            },
            filters: []
        });
    }

    return channels;
}

// Validate and export configuration
let config: SystemConfig;

try {
    config = buildConfig();
    // Only validate the parts we've defined in the schema
    configSchema.parse(config);
    console.log('✅ Configuration loaded and validated successfully');
} catch (error) {
    console.error('❌ Configuration validation failed:', error);
    // For development, let's continue even if validation fails
    if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Continuing with unvalidated config in development mode');
        config = buildConfig();
    } else {
        process.exit(1);
    }
}

export { config };

// Export additional configuration values
export const serverConfig = {
    port: getEnvNumber('PORT', 3001),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    apiBaseUrl: getEnvString('API_BASE_URL', 'http://localhost:3001'),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test'
};

export default config; 