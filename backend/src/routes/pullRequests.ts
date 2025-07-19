import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { PullRequest, ApiResponse, FilterType } from '../types/index.js';

const router = Router();

// Mock data for pull requests (will be replaced with real GitHub API integration)
const mockPullRequests: PullRequest[] = [
    {
        id: 'pr-1',
        number: 12345,
        title: 'feat: Add new concurrent features for React 19',
        body: 'This PR introduces new concurrent features for React 19 including improved Suspense support and automatic batching...',
        state: 'open',
        author: {
            login: 'gaearon',
            id: 810438,
            avatarUrl: 'https://avatars.githubusercontent.com/u/810438?v=4'
        },
        createdAt: '2024-01-15T14:30:00Z',
        updatedAt: '2024-01-15T16:45:00Z',
        changedFiles: 15,
        additions: 342,
        deletions: 128,
        repository: {
            id: '1',
            name: 'react',
            owner: 'facebook',
            fullName: 'facebook/react',
            description: 'The library for web and native user interfaces',
            stargazersCount: 223000,
            updatedAt: '2024-01-15T10:30:00Z',
            gitUrl: 'git://github.com/facebook/react.git',
            sshUrl: 'git@github.com:facebook/react.git',
            language: 'JavaScript',
            isPrivate: false,
            enabled: true,
            priority: 'high',
            notificationChannels: ['email']
        },
        htmlUrl: 'https://github.com/facebook/react/pull/12345',
        diffUrl: 'https://github.com/facebook/react/pull/12345.diff',
        patchUrl: 'https://github.com/facebook/react/pull/12345.patch',
        labels: [
            { id: 1, name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
            { id: 2, name: 'concurrent', color: 'ff6b6b', description: 'Related to concurrent features' }
        ],
        assignees: [],
        reviewers: [],
        commits: [],
        baseBranch: 'main',
        headBranch: 'feat/concurrent-features',
        mergeable: true,
        mergeableState: 'clean'
    },
    {
        id: 'pr-2',
        number: 23456,
        title: 'fix: Resolve memory leak in TypeScript compiler',
        body: 'This PR fixes a memory leak that occurs during incremental compilation...',
        state: 'open',
        author: {
            login: 'sandersn',
            id: 823403,
            avatarUrl: 'https://avatars.githubusercontent.com/u/823403?v=4'
        },
        createdAt: '2024-01-14T09:15:00Z',
        updatedAt: '2024-01-15T11:20:00Z',
        changedFiles: 8,
        additions: 156,
        deletions: 89,
        repository: {
            id: '2',
            name: 'typescript',
            owner: 'microsoft',
            fullName: 'microsoft/typescript',
            description: 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output',
            stargazersCount: 98000,
            updatedAt: '2024-01-14T15:20:00Z',
            gitUrl: 'git://github.com/microsoft/typescript.git',
            sshUrl: 'git@github.com:microsoft/typescript.git',
            language: 'TypeScript',
            isPrivate: false,
            enabled: true,
            priority: 'medium',
            notificationChannels: ['email']
        },
        htmlUrl: 'https://github.com/microsoft/typescript/pull/23456',
        diffUrl: 'https://github.com/microsoft/typescript/pull/23456.diff',
        patchUrl: 'https://github.com/microsoft/typescript/pull/23456.patch',
        labels: [
            { id: 3, name: 'bug', color: 'd73a49', description: 'Something isn\'t working' },
            { id: 4, name: 'compiler', color: 'fef2c0', description: 'Related to the TypeScript compiler' }
        ],
        assignees: [],
        reviewers: [],
        commits: [],
        baseBranch: 'main',
        headBranch: 'fix/memory-leak',
        mergeable: true,
        mergeableState: 'clean'
    },
    {
        id: 'pr-3',
        number: 34567,
        title: 'feat: Add container query support to Tailwind CSS',
        body: 'This PR adds support for CSS container queries with @container variants...',
        state: 'open',
        author: {
            login: 'adamwathan',
            id: 4323180,
            avatarUrl: 'https://avatars.githubusercontent.com/u/4323180?v=4'
        },
        createdAt: '2024-01-13T16:45:00Z',
        updatedAt: '2024-01-14T08:30:00Z',
        changedFiles: 12,
        additions: 289,
        deletions: 45,
        repository: {
            id: '3',
            name: 'tailwindcss',
            owner: 'tailwindlabs',
            fullName: 'tailwindlabs/tailwindcss',
            description: 'A utility-first CSS framework for rapid UI development',
            stargazersCount: 78000,
            updatedAt: '2024-01-13T09:45:00Z',
            gitUrl: 'git://github.com/tailwindlabs/tailwindcss.git',
            sshUrl: 'git@github.com:tailwindlabs/tailwindcss.git',
            language: 'JavaScript',
            isPrivate: false,
            enabled: true,
            priority: 'medium',
            notificationChannels: ['email']
        },
        htmlUrl: 'https://github.com/tailwindlabs/tailwindcss/pull/34567',
        diffUrl: 'https://github.com/tailwindlabs/tailwindcss/pull/34567.diff',
        patchUrl: 'https://github.com/tailwindlabs/tailwindcss/pull/34567.patch',
        labels: [
            { id: 5, name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
            { id: 6, name: 'css', color: '1d76db', description: 'CSS related changes' }
        ],
        assignees: [],
        reviewers: [],
        commits: [],
        baseBranch: 'master',
        headBranch: 'feat/container-queries',
        mergeable: true,
        mergeableState: 'clean'
    }
];

// GET /api/pull-requests - Fetch pull requests with optional filtering
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const {
        repository,
        state,
        author,
        page = '1',
        limit = '20'
    } = req.query;

    let filteredPRs = [...mockPullRequests];

    // Filter by repository
    if (repository && typeof repository === 'string') {
        filteredPRs = filteredPRs.filter(pr => pr.repository.id === repository);
    }

    // Filter by state
    if (state && typeof state === 'string') {
        filteredPRs = filteredPRs.filter(pr => pr.state === state);
    }

    // Filter by author
    if (author && typeof author === 'string') {
        filteredPRs = filteredPRs.filter(pr => pr.author.login === author);
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
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
}));

// GET /api/pull-requests/:id - Fetch specific pull request
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const pullRequest = mockPullRequests.find(pr => pr.id === id);

    if (!pullRequest) {
        return res.status(404).json({
            success: false,
            error: 'Pull request not found'
        });
    }

    const response: ApiResponse<PullRequest> = {
        success: true,
        data: pullRequest
    };

    res.json(response);
}));

// GET /api/pull-requests/repository/:repoId - Fetch pull requests for specific repository
router.get('/repository/:repoId', asyncHandler(async (req: Request, res: Response) => {
    const { repoId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const filteredPRs = mockPullRequests.filter(pr => pr.repository.id === repoId);

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
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
}));

export { router as pullRequestsRouter }; 