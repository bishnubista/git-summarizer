import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { Repository, ApiResponse } from '../types/index.js';

const router = Router();

// Mock data for now (will be replaced with real GitHub API integration)
const mockRepositories: Repository[] = [
    {
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
    {
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
    {
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
    {
        id: '4',
        name: 'next.js',
        owner: 'vercel',
        fullName: 'vercel/next.js',
        description: 'The React Framework for the Web',
        stargazersCount: 120000,
        updatedAt: '2024-01-12T14:10:00Z',
        gitUrl: 'git://github.com/vercel/next.js.git',
        sshUrl: 'git@github.com:vercel/next.js.git',
        language: 'JavaScript',
        isPrivate: false,
        enabled: true,
        priority: 'high',
        notificationChannels: ['email']
    }
];

// GET /api/repositories - Fetch all starred repositories
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    // TODO: Replace with real GitHub API integration
    // const githubService = new GitHubService();
    // const repositories = await githubService.getStarredRepositories();

    const response: ApiResponse<Repository[]> = {
        success: true,
        data: mockRepositories,
        meta: {
            total: mockRepositories.length,
            page: 1,
            limit: 50,
            hasNext: false
        }
    };

    res.json(response);
}));

// GET /api/repositories/:id - Fetch specific repository
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const repository = mockRepositories.find(repo => repo.id === id);

    if (!repository) {
        res.status(404).json({
            success: false,
            error: 'Repository not found'
        });
        return;
    }

    const response: ApiResponse<Repository> = {
        success: true,
        data: repository
    };

    res.json(response);
}));

// PATCH /api/repositories/:id - Update repository settings
router.patch('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates = req.body;

    const repositoryIndex = mockRepositories.findIndex(repo => repo.id === id);

    if (repositoryIndex === -1) {
        res.status(404).json({
            success: false,
            error: 'Repository not found'
        });
        return;
    }

    // Update repository (in real implementation, this would update the database)
    mockRepositories[repositoryIndex] = {
        ...mockRepositories[repositoryIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    const updatedRepository = mockRepositories[repositoryIndex]!;

    const response: ApiResponse<Repository> = {
        success: true,
        data: updatedRepository,
        message: 'Repository updated successfully'
    };

    res.json(response);
}));

// POST /api/repositories/sync - Trigger manual repository sync
router.post('/sync', asyncHandler(async (req: Request, res: Response) => {
    // TODO: Implement GitHub API sync
    // const syncService = new SyncService();
    // const result = await syncService.syncRepositories();

    const response: ApiResponse<any> = {
        success: true,
        message: 'Repository sync completed',
        data: {
            repositoriesChecked: mockRepositories.length,
            newRepositories: 0,
            updatedRepositories: 0,
            timestamp: new Date().toISOString()
        }
    };

    res.json(response);
}));

export { router as repositoriesRouter }; 