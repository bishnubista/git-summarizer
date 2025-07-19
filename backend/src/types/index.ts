// Core entity types (aligned with frontend)
export interface Repository {
    id: string;
    name: string;
    owner: string;
    fullName: string;
    description?: string;
    stargazersCount: number;
    updatedAt: string;
    // Backend-specific fields
    gitUrl: string;
    sshUrl: string;
    language?: string;
    isPrivate: boolean;
    lastChecked?: Date;
    enabled: boolean;
    priority: 'low' | 'medium' | 'high';
    customPrompt?: string;
    notificationChannels: string[];
}

export interface GitHubUser {
    login: string;
    id: number;
    avatarUrl: string;
    url?: string;
    type?: string;
}

export interface PullRequest {
    id: string;
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed' | 'merged';
    author: GitHubUser;
    createdAt: string;
    updatedAt: string;
    changedFiles: number;
    additions: number;
    deletions: number;
    repository: Repository;
    // Backend-specific fields
    htmlUrl: string;
    diffUrl: string;
    patchUrl: string;
    labels: Label[];
    assignees: GitHubUser[];
    reviewers: GitHubUser[];
    commits: Commit[];
    baseBranch: string;
    headBranch: string;
    mergeable?: boolean;
    mergeableState?: string;
}

export interface Label {
    id: number;
    name: string;
    color: string;
    description?: string;
}

export interface Commit {
    sha: string;
    message: string;
    author: CommitAuthor;
    url: string;
    createdAt: string;
}

export interface CommitAuthor {
    name: string;
    email: string;
    date: string;
}

export interface FileDiff {
    filename: string;
    status: 'added' | 'modified' | 'removed' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    previousFilename?: string;
}

export interface PRSummary {
    id: string;
    prId: string;
    summary: string;
    keyChanges: string[];
    impact: 'low' | 'medium' | 'high';
    isReviewed: boolean;
    isImportant: boolean;
    createdAt: string;
    // Backend-specific fields
    riskFactors: string[];
    estimatedReviewTime: number;
    changeCategories: ChangeCategory[];
    llmProvider: string;
    tokenUsage: TokenUsage;
    confidence: number;
}

export type ChangeCategory =
    | 'feature'
    | 'bugfix'
    | 'refactor'
    | 'documentation'
    | 'test'
    | 'config'
    | 'dependency'
    | 'security'
    | 'performance';

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
}

export interface PRAnalysis {
    id: string;
    pullRequest: PullRequest;
    changedFiles: FileDiff[];
    impactLevel: 'low' | 'medium' | 'high';
    changeCategories: ChangeCategory[];
    riskFactors: string[];
    keyChanges: string[];
    dependencyChanges: DependencyChange[];
    testCoverage?: TestCoverageInfo;
    codeQuality: CodeQualityMetrics;
    securityRisks: SecurityRisk[];
}

export interface DependencyChange {
    type: 'added' | 'removed' | 'updated';
    package: string;
    oldVersion?: string;
    newVersion?: string;
    ecosystem: 'npm' | 'pip' | 'gem' | 'cargo' | 'go' | 'maven' | 'other';
}

export interface TestCoverageInfo {
    hasTests: boolean;
    testFiles: string[];
    coverageChange?: number;
}

export interface CodeQualityMetrics {
    complexity: number;
    maintainability: number;
    duplicatedLines: number;
    techDebt: number;
}

export interface SecurityRisk {
    type: 'vulnerability' | 'secret' | 'permission' | 'dependency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    file?: string;
    line?: number;
}

// Configuration types
export interface SystemConfig {
    github: GitHubConfig;
    llm: LLMConfig;
    storage: StorageConfig;
    notifications: NotificationConfig;
    scheduling: SchedulingConfig;
    monitoring: MonitoringConfig;
    security: SecurityConfig;
}

export interface GitHubConfig {
    token: string;
    webhookSecret?: string | undefined;
    rateLimit: RateLimitConfig;
    includeForks: boolean;
    includePrivate: boolean;
    maxReposPerSync: number;
    maxPRsPerRepo: number;
}

export interface RateLimitConfig {
    requests: number;
    window: number; // in milliseconds
    retryAfter: number;
}

export interface LLMConfig {
    primary: LLMProviderConfig;
    fallback?: LLMProviderConfig | undefined;
    maxTokens: number;
    temperature: number;
    customPrompts: Record<string, string>;
    costLimits: CostLimits;
}

export interface LLMProviderConfig {
    provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
    model: string;
    maxRetries: number;
    timeout: number;
}

export interface CostLimits {
    dailyLimit: number;
    monthlyLimit: number;
    perRequestLimit: number;
}

export interface StorageConfig {
    type: 'sqlite' | 'postgresql' | 'mysql';
    connectionString?: string | undefined;
    database: string;
    backupEnabled: boolean;
    retentionDays: number;
}

export interface NotificationConfig {
    enabled: boolean;
    channels: NotificationChannelConfig[];
    templates: NotificationTemplate[];
    batchSize: number;
    retryAttempts: number;
    cooldownPeriod: number;
}

export interface NotificationChannelConfig {
    type: 'email' | 'slack' | 'telegram' | 'discord' | 'webhook' | 'notion';
    enabled: boolean;
    config: Record<string, any>;
    filters: NotificationFilter[];
}

export interface NotificationFilter {
    field: string;
    operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt';
    value: any;
}

export interface NotificationTemplate {
    channel: string;
    format: 'text' | 'html' | 'markdown';
    template: string;
    variables: string[];
}

export interface SchedulingConfig {
    enabled: boolean;
    interval: number; // in minutes
    timezone: string;
    adaptiveScheduling: boolean;
    quietHours: {
        start: string;
        end: string;
    };
}

export interface MonitoringConfig {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsEnabled: boolean;
    healthCheckInterval: number;
    alerting: AlertingConfig;
}

export interface AlertingConfig {
    enabled: boolean;
    errorThreshold: number;
    responseTimeThreshold: number;
    rateLimitThreshold: number;
    costThreshold: number;
}

export interface SecurityConfig {
    encryptionKey: string;
    jwtSecret: string;
    sessionTimeout: number;
    apiRateLimit: RateLimitConfig;
    corsOrigins: string[];
}

// API types
export type FilterType = 'all' | 'reviewed' | 'important' | 'unreviewed';

export interface AppState {
    repositories: Repository[];
    pullRequests: PullRequest[];
    summaries: PRSummary[];
    selectedRepo: string | null;
    filter: FilterType;
    lastSync: Date | null;
    isLoading: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    meta?: {
        total: number;
        page: number;
        limit: number;
        hasNext: boolean;
    };
}

export interface SyncResult {
    repositoriesChecked: number;
    newPRsFound: number;
    summariesGenerated: number;
    errors: string[];
    duration: number;
    startedAt: Date;
    completedAt: Date;
}

export interface ProcessedPR {
    id: string;
    repository: string;
    prNumber: number;
    summary: PRSummary;
    processedAt: Date;
    notificationsSent: NotificationDelivery[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface NotificationDelivery {
    id: string;
    channel: string;
    status: 'sent' | 'failed' | 'pending';
    sentAt?: Date;
    error?: string;
    attempts: number;
}

// Database schema types
export interface DatabaseSchema {
    repositories: Repository;
    pullRequests: PullRequest;
    prSummaries: PRSummary;
    prAnalyses: PRAnalysis;
    processedPRs: ProcessedPR;
    notifications: NotificationDelivery;
    syncHistory: SyncResult;
    userConfig: SystemConfig;
}

// Event types for internal messaging
export interface SystemEvent {
    type: string;
    timestamp: Date;
    data: any;
    source: string;
}

export interface PREvent extends SystemEvent {
    type: 'pr.discovered' | 'pr.analyzed' | 'pr.summarized' | 'pr.reviewed';
    data: {
        pr: PullRequest;
        summary?: PRSummary;
        analysis?: PRAnalysis;
    };
}

export interface NotificationEvent extends SystemEvent {
    type: 'notification.sent' | 'notification.failed';
    data: {
        delivery: NotificationDelivery;
        summary: PRSummary;
    };
} 