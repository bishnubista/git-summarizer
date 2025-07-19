import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { githubService } from '../services/github.js';
import type { PullRequest, ApiResponse, FilterType } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/pull-requests - Fetch pull requests with optional filtering
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            repository,
            state,
            author,
            page = '1',
            limit = '20'
        } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        logger.info(`Fetching pull requests - page: ${pageNum}, limit: ${limitNum}`);

        if (repository && typeof repository === 'string') {
            // Get PRs for a specific repository
            const [owner, repo] = repository.split('/');
            if (!owner || !repo) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid repository format. Use "owner/repo"'
                });
                return;
            }

            const { pullRequests, hasNext } = await githubService.getRepositoryPullRequests(
                owner,
                repo,
                {
                    state: state as any || 'open',
                    page: pageNum,
                    perPage: limitNum
                }
            );

            let filteredPRs = pullRequests;

            // Filter by author if specified
            if (author && typeof author === 'string') {
                filteredPRs = filteredPRs.filter(pr => pr.author.login === author);
            }

            const response: ApiResponse<PullRequest[]> = {
                success: true,
                data: filteredPRs,
                meta: {
                    total: filteredPRs.length,
                    page: pageNum,
                    limit: limitNum,
                    hasNext: hasNext && filteredPRs.length === limitNum
                }
            };

            res.json(response);
        } else {
            // Get PRs from all starred repositories
            const { pullRequests } = await githubService.getAllPullRequestsFromStarredRepos({
                maxRepos: 10, // Limit for performance
                maxPRsPerRepo: 5,
                prState: state as any || 'open'
            });

            let filteredPRs = pullRequests;

            // Filter by author if specified
            if (author && typeof author === 'string') {
                filteredPRs = filteredPRs.filter(pr => pr.author.login === author);
            }

            // Apply pagination
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedPRs = filteredPRs.slice(startIndex, endIndex);

            const response: ApiResponse<PullRequest[]> = {
                success: true,
                data: paginatedPRs,
                meta: {
                    total: filteredPRs.length,
                    page: pageNum,
                    limit: limitNum,
                    hasNext: endIndex < filteredPRs.length
                }
            };

            res.json(response);
        }
    } catch (error: any) {
        logger.error('Failed to fetch pull requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pull requests',
            message: error.message
        });
    }
}));

// GET /api/pull-requests/:id - Fetch specific pull request
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // For now, we'll get all PRs and find the matching one
        // In a real implementation with database, we'd store the mapping
        const { pullRequests } = await githubService.getAllPullRequestsFromStarredRepos({
            maxRepos: 20,
            maxPRsPerRepo: 10
        });

        const pullRequest = pullRequests.find(pr => pr.id === id);

        if (!pullRequest) {
            res.status(404).json({
                success: false,
                error: 'Pull request not found'
            });
            return;
        }

        // Get detailed information for this PR
        try {
            const { pullRequest: detailedPR, commits, files } = await githubService.getPullRequestDetails(
                pullRequest.repository.owner,
                pullRequest.repository.name,
                pullRequest.number
            );

            // Add commits to the PR object
            detailedPR.commits = commits;

            const response: ApiResponse<PullRequest> = {
                success: true,
                data: detailedPR
            };

            res.json(response);
        } catch (detailError) {
            // If we can't get details, return the basic PR info
            logger.warn(`Could not fetch detailed info for PR ${id}:`, detailError);

            const response: ApiResponse<PullRequest> = {
                success: true,
                data: pullRequest
            };

            res.json(response);
        }
    } catch (error: any) {
        logger.error(`Failed to fetch pull request ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pull request',
            message: error.message
        });
    }
}));

// GET /api/pull-requests/repository/:owner/:repo - Fetch pull requests for specific repository
router.get('/repository/:owner/:repo', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
        const { owner, repo } = req.params;
        const { page = '1', limit = '20', state = 'open' } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        logger.info(`Fetching pull requests for ${owner}/${repo}`);

        const { pullRequests, hasNext } = await githubService.getRepositoryPullRequests(
            owner,
            repo,
            {
                state: state as any,
                page: pageNum,
                perPage: limitNum
            }
        );

        const response: ApiResponse<PullRequest[]> = {
            success: true,
            data: pullRequests,
            meta: {
                total: pullRequests.length,
                page: pageNum,
                limit: limitNum,
                hasNext
            }
        };

        res.json(response);
    } catch (error: any) {
        logger.error(`Failed to fetch pull requests for ${req.params.owner}/${req.params.repo}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pull requests',
            message: error.message
        });
    }
}));

export { router as pullRequestsRouter }; 