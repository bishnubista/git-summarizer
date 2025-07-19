import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { aiService } from '../services/ai.js';
import { githubService } from '../services/github.js';
import type { ApiResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/ai/status - Check AI service status
router.get('/status', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const availableProviders = aiService.getAvailableProviders();
        const isAvailable = aiService.isAvailable();

        const response: ApiResponse<any> = {
            success: true,
            data: {
                available: isAvailable,
                providers: availableProviders,
                message: isAvailable
                    ? 'AI service is ready for generating summaries'
                    : 'AI service not available. Please configure API keys for OpenAI or Claude.',
                setupInstructions: {
                    openai: {
                        required: ['OPENAI_API_KEY'],
                        environment: 'Set LLM_PRIMARY_PROVIDER=openai, LLM_PRIMARY_MODEL=gpt-4, LLM_PRIMARY_API_KEY=your_key',
                        description: 'OpenAI GPT models for high-quality summaries'
                    },
                    claude: {
                        required: ['CLAUDE_API_KEY'],
                        environment: 'Set LLM_PRIMARY_PROVIDER=anthropic, LLM_PRIMARY_MODEL=claude-3-haiku-20240307, LLM_PRIMARY_API_KEY=your_key',
                        description: 'Anthropic Claude models for detailed analysis'
                    },
                    demo: {
                        description: 'Without API keys, the system will generate fallback summaries based on PR metadata'
                    }
                }
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to get AI status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get AI status',
            message: error.message
        });
    }
}));

// POST /api/ai/test - Test AI service with a simple prompt
router.post('/test', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { provider } = req.body;

        if (!aiService.isAvailable()) {
            res.status(503).json({
                success: false,
                error: 'AI service unavailable',
                message: 'No LLM providers are configured. The system will use fallback summaries.',
                setupHelp: 'Visit /api/ai/status for setup instructions'
            });
            return;
        }

        logger.info(`Testing AI service${provider ? ` with provider: ${provider}` : ''}`);

        const isWorking = await aiService.testConnection(provider);

        const response: ApiResponse<any> = {
            success: isWorking,
            data: {
                working: isWorking,
                provider: provider || 'default',
                message: isWorking
                    ? 'AI service is working correctly!'
                    : 'AI service test failed. Check your configuration.',
                testedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('AI service test failed:', error);
        res.status(500).json({
            success: false,
            error: 'AI service test failed',
            message: error.message
        });
    }
}));

// POST /api/ai/summarize-sample - Generate a sample summary from a real PR
router.post('/summarize-sample', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { repositoryName, prNumber } = req.body;

        // Get a sample PR to summarize
        let samplePR;

        if (repositoryName && prNumber) {
            // Try to get the specific PR
            const [owner, repo] = repositoryName.split('/');
            if (owner && repo) {
                try {
                    const { pullRequest } = await githubService.getPullRequestDetails(owner, repo, parseInt(prNumber));
                    samplePR = pullRequest;
                } catch (error) {
                    logger.warn(`Could not fetch specific PR ${repositoryName}#${prNumber}:`, error);
                }
            }
        }

        if (!samplePR) {
            // Get a random recent PR
            const { pullRequests } = await githubService.getAllPullRequestsFromStarredRepos({
                maxRepos: 5,
                maxPRsPerRepo: 2
            });

            if (pullRequests.length === 0) {
                res.status(404).json({
                    success: false,
                    error: 'No pull requests found',
                    message: 'No pull requests available from starred repositories'
                });
                return;
            }

            samplePR = pullRequests[0];
        }

        logger.info(`Generating sample summary for PR #${samplePR.number} in ${samplePR.repository.fullName}`);

        // Generate the summary
        const summary = await aiService.generatePRSummary(samplePR);

        const response: ApiResponse<any> = {
            success: true,
            data: {
                summary,
                pullRequest: {
                    id: samplePR.id,
                    number: samplePR.number,
                    title: samplePR.title,
                    repository: samplePR.repository.fullName,
                    author: samplePR.author.login,
                    url: samplePR.htmlUrl
                },
                generatedAt: new Date().toISOString(),
                aiProvider: summary.aiProvider,
                model: summary.model,
                confidence: summary.confidence
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to generate sample summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate sample summary',
            message: error.message
        });
    }
}));

// GET /api/ai/setup-guide - Get setup instructions for AI providers
router.get('/setup-guide', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const response: ApiResponse<any> = {
        success: true,
        data: {
            title: 'AI Service Setup Guide',
            currentStatus: {
                available: aiService.isAvailable(),
                providers: aiService.getAvailableProviders()
            },
            options: [
                {
                    provider: 'OpenAI',
                    recommended: true,
                    description: 'High-quality summaries with GPT-4',
                    steps: [
                        '1. Get API key from https://platform.openai.com/api-keys',
                        '2. Add to .env: LLM_PRIMARY_PROVIDER=openai',
                        '3. Add to .env: LLM_PRIMARY_MODEL=gpt-4',
                        '4. Add to .env: LLM_PRIMARY_API_KEY=your_openai_key',
                        '5. Add to .env: LLM_MAX_TOKENS=4000',
                        '6. Add to .env: LLM_TEMPERATURE=0.3',
                        '7. Restart the backend server'
                    ],
                    estimatedCost: '$0.01-0.05 per summary',
                    quality: 'Excellent'
                },
                {
                    provider: 'Claude (Anthropic)',
                    recommended: true,
                    description: 'Detailed analysis with Claude-3',
                    steps: [
                        '1. Get API key from https://console.anthropic.com/',
                        '2. Add to .env: LLM_PRIMARY_PROVIDER=anthropic',
                        '3. Add to .env: LLM_PRIMARY_MODEL=claude-3-haiku-20240307',
                        '4. Add to .env: LLM_PRIMARY_API_KEY=your_claude_key',
                        '5. Add to .env: LLM_MAX_TOKENS=4000',
                        '6. Add to .env: LLM_TEMPERATURE=0.3',
                        '7. Restart the backend server'
                    ],
                    estimatedCost: '$0.005-0.02 per summary',
                    quality: 'Excellent'
                },
                {
                    provider: 'Ollama (Local)',
                    recommended: false,
                    description: 'Free local LLM (requires setup)',
                    steps: [
                        '1. Install Ollama from https://ollama.ai/',
                        '2. Run: ollama pull llama2',
                        '3. Add to .env: LLM_PRIMARY_PROVIDER=ollama',
                        '4. Add to .env: LLM_PRIMARY_MODEL=llama2',
                        '5. Restart the backend server'
                    ],
                    estimatedCost: 'Free (uses local compute)',
                    quality: 'Good (varies by model)'
                },
                {
                    provider: 'Fallback Mode',
                    recommended: false,
                    description: 'Basic summaries without AI (current mode)',
                    steps: [
                        'No setup required - system generates basic summaries from PR metadata',
                        'Limited functionality but works without API keys'
                    ],
                    estimatedCost: 'Free',
                    quality: 'Basic'
                }
            ],
            testEndpoints: [
                'GET /api/ai/status - Check current AI service status',
                'POST /api/ai/test - Test AI connection',
                'POST /api/ai/summarize-sample - Generate a test summary',
                'POST /api/summaries/generate - Generate summaries for recent PRs'
            ]
        }
    };

    res.json(response);
}));

export { router as aiRouter }; 