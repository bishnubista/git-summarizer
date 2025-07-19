import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { PullRequest, PRSummary } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export type LLMProvider = 'openai' | 'claude' | 'ollama';

export interface AIProviderConfig {
    provider: LLMProvider;
    model: string;
    maxTokens: number;
    temperature: number;
}

export class AIService {
    private openai?: OpenAI;
    private claude?: Anthropic;
    private defaultConfig: AIProviderConfig;

    constructor() {
        this.defaultConfig = {
            provider: (config.llm?.primary?.provider === 'anthropic' ? 'claude' : config.llm?.primary?.provider as LLMProvider) || 'openai',
            model: config.llm?.primary?.model || 'gpt-4',
            maxTokens: config.llm?.maxTokens || 4000,
            temperature: config.llm?.temperature || 0.3
        };

        this.initializeProviders();
    }

    private initializeProviders(): void {
        // Initialize OpenAI
        if (config.llm?.primary?.provider === 'openai' && config.llm?.primary?.apiKey) {
            this.openai = new OpenAI({
                apiKey: config.llm.primary.apiKey,
                baseURL: config.llm.primary.baseUrl,
            });
            logger.info('OpenAI client initialized');
        }

        // Initialize Claude
        if (config.llm?.primary?.provider === 'anthropic' && config.llm?.primary?.apiKey) {
            this.claude = new Anthropic({
                apiKey: config.llm.primary.apiKey,
                baseURL: config.llm.primary.baseUrl,
            });
            logger.info('Claude client initialized');
        }

        // Log available providers
        const availableProviders = [];
        if (this.openai) availableProviders.push('OpenAI');
        if (this.claude) availableProviders.push('Claude');

        logger.info(`AI Service initialized with providers: ${availableProviders.join(', ')}`);
    }

    /**
     * Generate a comprehensive PR summary
     */
    async generatePRSummary(
        pullRequest: PullRequest,
        options: Partial<AIProviderConfig> = {}
    ): Promise<PRSummary> {
        const config = { ...this.defaultConfig, ...options };

        logger.info(`Generating summary for PR #${pullRequest.number} in ${pullRequest.repository.fullName}`);

        try {
            const prompt = this.buildPRSummaryPrompt(pullRequest);
            const summary = await this.callLLM(prompt, config);

            return this.parseSummaryResponse(summary, pullRequest);
        } catch (error: any) {
            logger.error(`Failed to generate summary for PR #${pullRequest.number}:`, error);

            // Fallback summary
            return this.createFallbackSummary(pullRequest, error.message);
        }
    }

    /**
     * Generate summaries for multiple PRs in batch
     */
    async generateBatchSummaries(
        pullRequests: PullRequest[],
        options: Partial<AIProviderConfig> = {}
    ): Promise<PRSummary[]> {
        logger.info(`Generating summaries for ${pullRequests.length} pull requests`);

        const summaries: PRSummary[] = [];
        const batchSize = 5; // Process in small batches to avoid rate limits

        for (let i = 0; i < pullRequests.length; i += batchSize) {
            const batch = pullRequests.slice(i, i + batchSize);
            logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pullRequests.length / batchSize)}`);

            const batchPromises = batch.map(pr => this.generatePRSummary(pr, options));
            const batchSummaries = await Promise.all(batchPromises);

            summaries.push(...batchSummaries);

            // Small delay between batches to be respectful to APIs
            if (i + batchSize < pullRequests.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        logger.info(`Generated ${summaries.length} summaries successfully`);
        return summaries;
    }

    /**
     * Build a comprehensive prompt for PR summarization
     */
    private buildPRSummaryPrompt(pullRequest: PullRequest): string {
        const { title, body, author, repository, changedFiles, additions, deletions, labels } = pullRequest;

        return `You are an expert code reviewer and technical writer. Analyze this GitHub pull request and provide a comprehensive, professional summary.

**Repository:** ${repository.fullName}
**PR Title:** ${title}
**Author:** ${author.login}
**Files Changed:** ${changedFiles} files
**Changes:** +${additions} -${deletions} lines
**Labels:** ${labels.map(l => l.name).join(', ') || 'None'}

**PR Description:**
${body || 'No description provided.'}

Please provide a structured analysis in the following format:

## Summary
[One paragraph overview of what this PR accomplishes]

## Key Changes
[Bullet points of the main changes, focus on functionality and architecture]

## Impact Assessment
[Analysis of the potential impact: Low/Medium/High and why]

## Technical Notes
[Any notable technical details, patterns, or concerns]

## Review Priority
[Suggest if this should be: Low/Medium/High priority for review and why]

Keep the summary concise but comprehensive, suitable for developers who need to quickly understand the PR's purpose and importance. Focus on technical substance over process details.`;
    }

    /**
     * Call the appropriate LLM provider
     */
    private async callLLM(prompt: string, config: AIProviderConfig): Promise<string> {
        switch (config.provider) {
            case 'openai':
                return this.callOpenAI(prompt, config);
            case 'claude':
                return this.callClaude(prompt, config);
            case 'ollama':
                return this.callOllama(prompt, config);
            default:
                throw new Error(`Unsupported LLM provider: ${config.provider}`);
        }
    }

    /**
     * Call OpenAI API
     */
    private async callOpenAI(prompt: string, config: AIProviderConfig): Promise<string> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized. Please check your API key.');
        }

        const response = await this.openai.chat.completions.create({
            model: config.model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: config.maxTokens,
            temperature: config.temperature,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('OpenAI returned empty response');
        }

        return content;
    }

    /**
     * Call Claude API
     */
    private async callClaude(prompt: string, config: AIProviderConfig): Promise<string> {
        if (!this.claude) {
            throw new Error('Claude client not initialized. Please check your API key.');
        }

        const response = await this.claude.messages.create({
            model: config.model.startsWith('claude-') ? config.model : 'claude-3-haiku-20240307',
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Claude returned non-text response');
        }

        return content.text;
    }

    /**
     * Call Ollama API (local LLM)
     */
    private async callOllama(prompt: string, config: AIProviderConfig): Promise<string> {
        const ollamaUrl = config.model.includes('://') ? config.model : `http://localhost:11434/api/generate`;

        const response = await fetch(ollamaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.model.split('/').pop() || 'llama2',
                prompt,
                stream: false,
                options: {
                    temperature: config.temperature,
                    num_predict: config.maxTokens,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.response || '';
    }

    /**
     * Parse the LLM response and create a PRSummary object
     */
    private parseSummaryResponse(content: string, pullRequest: PullRequest): PRSummary {
        // Extract key changes from the summary
        const keyChanges = this.extractKeyChanges(content);

        // Determine impact level
        const impact = this.determineImpact(content, pullRequest);

        return {
            id: `summary-${pullRequest.id}`,
            prId: pullRequest.id,
            summary: content,
            keyChanges,
            impact,
            isReviewed: false,
            isImportant: impact === 'high',
            createdAt: new Date().toISOString(),
            aiProvider: this.defaultConfig.provider,
            model: this.defaultConfig.model,
            confidence: this.calculateConfidence(content, pullRequest),
            reviewPriority: this.extractReviewPriority(content)
        };
    }

    /**
     * Extract key changes from the summary text
     */
    private extractKeyChanges(content: string): string[] {
        const keyChangesMatch = content.match(/## Key Changes\s*([\s\S]*?)(?=##|$)/);
        if (!keyChangesMatch) return [];

        const keyChangesText = keyChangesMatch[1];
        const changes = keyChangesText
            .split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
            .map(line => line.replace(/^[-*]\s*/, '').trim())
            .filter(line => line.length > 0);

        return changes.slice(0, 5); // Limit to 5 key changes
    }

    /**
     * Determine impact level from summary and PR metadata
     */
    private determineImpact(content: string, pullRequest: PullRequest): 'low' | 'medium' | 'high' {
        const lowerContent = content.toLowerCase();
        const { changedFiles, additions, deletions } = pullRequest;

        // High impact indicators
        if (lowerContent.includes('breaking change') ||
            lowerContent.includes('high impact') ||
            lowerContent.includes('critical') ||
            changedFiles > 20 ||
            (additions + deletions) > 1000) {
            return 'high';
        }

        // Low impact indicators  
        if (lowerContent.includes('low impact') ||
            lowerContent.includes('minor') ||
            lowerContent.includes('documentation') ||
            changedFiles <= 3 ||
            (additions + deletions) <= 50) {
            return 'low';
        }

        return 'medium';
    }

    /**
     * Calculate confidence score based on various factors
     */
    private calculateConfidence(content: string, pullRequest: PullRequest): number {
        let confidence = 0.7; // Base confidence

        // Increase confidence if we have good PR description
        if (pullRequest.body && pullRequest.body.length > 100) {
            confidence += 0.1;
        }

        // Increase confidence if we have labels
        if (pullRequest.labels.length > 0) {
            confidence += 0.1;
        }

        // Increase confidence based on content length and structure
        if (content.length > 500 && content.includes('##')) {
            confidence += 0.1;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Extract review priority from the summary
     */
    private extractReviewPriority(content: string): 'low' | 'medium' | 'high' {
        const lowerContent = content.toLowerCase();

        if (lowerContent.includes('high priority') || lowerContent.includes('urgent')) {
            return 'high';
        }

        if (lowerContent.includes('low priority')) {
            return 'low';
        }

        return 'medium';
    }

    /**
     * Create a fallback summary when AI generation fails
     */
    private createFallbackSummary(pullRequest: PullRequest, error: string): PRSummary {
        const { title, body, changedFiles, additions, deletions, author, repository } = pullRequest;

        const fallbackSummary = `## Summary
Unable to generate AI summary due to: ${error}

## Manual Analysis
- **Title**: ${title}
- **Author**: ${author.login}
- **Repository**: ${repository.fullName}
- **Changes**: ${changedFiles} files, +${additions}/-${deletions} lines

## Description
${body || 'No description provided.'}

*This is a fallback summary. AI analysis was unavailable.*`;

        return {
            id: `summary-${pullRequest.id}`,
            prId: pullRequest.id,
            summary: fallbackSummary,
            keyChanges: [`${changedFiles} files changed`, `+${additions}/-${deletions} lines`],
            impact: changedFiles > 10 ? 'high' : changedFiles > 3 ? 'medium' : 'low',
            isReviewed: false,
            isImportant: false,
            createdAt: new Date().toISOString(),
            aiProvider: 'fallback',
            model: 'none',
            confidence: 0.3,
            reviewPriority: 'medium'
        };
    }

    /**
     * Check if any LLM providers are available
     */
    isAvailable(): boolean {
        return Boolean(this.openai || this.claude);
    }

    /**
     * Get list of available providers
     */
    getAvailableProviders(): LLMProvider[] {
        const providers: LLMProvider[] = [];
        if (this.openai) providers.push('openai');
        if (this.claude) providers.push('claude');
        return providers;
    }

    /**
     * Test the AI service with a simple prompt
     */
    async testConnection(provider?: LLMProvider): Promise<boolean> {
        try {
            const testConfig = {
                ...this.defaultConfig,
                ...(provider && { provider }),
                maxTokens: 100
            };

            const testPrompt = 'Say "AI Service is working!" and nothing else.';
            const response = await this.callLLM(testPrompt, testConfig);

            return response.toLowerCase().includes('working');
        } catch (error) {
            logger.error('AI service test failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const aiService = new AIService(); 