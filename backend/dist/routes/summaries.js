import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
const router = Router();
// Mock data for PR summaries (will be replaced with database integration)
const mockSummaries = [
    {
        id: 'summary-1',
        prId: 'pr-1',
        summary: `## Summary
Introduces new concurrent features for React 19, including improved Suspense support and automatic batching for better performance.

## Key Changes
- **Concurrent Rendering**: Enhanced concurrent rendering capabilities
- **Suspense Improvements**: Better error boundaries and loading states
- **Automatic Batching**: Reduces unnecessary re-renders

## Impact
This significantly improves React's performance for complex applications with heavy async operations.`,
        keyChanges: [
            'Enhanced concurrent rendering',
            'Improved Suspense support',
            'Automatic batching implementation',
            'Better error boundaries'
        ],
        impact: 'high',
        isReviewed: false,
        isImportant: true,
        createdAt: '2024-01-15T17:00:00Z',
        riskFactors: [
            'Breaking changes in concurrent behavior',
            'Potential performance regressions in edge cases'
        ],
        estimatedReviewTime: 45,
        changeCategories: ['feature', 'performance'],
        llmProvider: 'openai',
        tokenUsage: {
            promptTokens: 1200,
            completionTokens: 350,
            totalTokens: 1550,
            cost: 0.0031
        },
        confidence: 0.92
    },
    {
        id: 'summary-2',
        prId: 'pr-2',
        summary: `## Summary
Fixes a critical memory leak in the TypeScript compiler that occurs during incremental compilation, particularly affecting large codebases.

## Key Changes
- **Memory Management**: Fixed memory cleanup in incremental compilation
- **Garbage Collection**: Improved GC efficiency for large projects
- **Performance**: Reduced memory usage by ~30%

## Impact
This resolves performance issues in large TypeScript projects and reduces build times.`,
        keyChanges: [
            'Fixed memory leak in compiler',
            'Improved garbage collection',
            'Optimized incremental compilation',
            'Reduced memory usage by 30%'
        ],
        impact: 'medium',
        isReviewed: true,
        isImportant: false,
        createdAt: '2024-01-15T12:00:00Z',
        riskFactors: [
            'Potential impact on compilation speed',
            'Changes to internal compiler APIs'
        ],
        estimatedReviewTime: 30,
        changeCategories: ['bugfix', 'performance'],
        llmProvider: 'openai',
        tokenUsage: {
            promptTokens: 980,
            completionTokens: 280,
            totalTokens: 1260,
            cost: 0.0025
        },
        confidence: 0.88
    },
    {
        id: 'summary-3',
        prId: 'pr-3',
        summary: `## Summary
Adds container query utilities to Tailwind CSS, enabling responsive design based on container dimensions rather than viewport size.

## Key Changes
- **Container Queries**: New @container variants for all utilities
- **Configuration**: Added container configuration options
- **Documentation**: Comprehensive examples and migration guide

## Impact
This enables more modular and reusable responsive components, particularly useful for component libraries and complex layouts.`,
        keyChanges: [
            'Container query support',
            'New @container variants',
            'Configuration options',
            'Comprehensive documentation'
        ],
        impact: 'medium',
        isReviewed: false,
        isImportant: false,
        createdAt: '2024-01-13T17:00:00Z',
        riskFactors: [
            'Browser compatibility concerns',
            'Potential bundle size increase'
        ],
        estimatedReviewTime: 25,
        changeCategories: ['feature'],
        llmProvider: 'openai',
        tokenUsage: {
            promptTokens: 1100,
            completionTokens: 320,
            totalTokens: 1420,
            cost: 0.0028
        },
        confidence: 0.85
    }
];
// GET /api/summaries - Fetch all summaries with optional filtering
router.get('/', asyncHandler(async (req, res) => {
    const { prId, isReviewed, isImportant, impact, page = '1', limit = '20' } = req.query;
    let filteredSummaries = [...mockSummaries];
    // Filter by PR ID
    if (prId && typeof prId === 'string') {
        filteredSummaries = filteredSummaries.filter(summary => summary.prId === prId);
    }
    // Filter by review status
    if (isReviewed !== undefined) {
        const reviewedFilter = isReviewed === 'true';
        filteredSummaries = filteredSummaries.filter(summary => summary.isReviewed === reviewedFilter);
    }
    // Filter by importance
    if (isImportant !== undefined) {
        const importantFilter = isImportant === 'true';
        filteredSummaries = filteredSummaries.filter(summary => summary.isImportant === importantFilter);
    }
    // Filter by impact level
    if (impact && typeof impact === 'string') {
        filteredSummaries = filteredSummaries.filter(summary => summary.impact === impact);
    }
    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedSummaries = filteredSummaries.slice(startIndex, endIndex);
    const response = {
        success: true,
        data: paginatedSummaries,
        meta: {
            total: filteredSummaries.length,
            page: pageNum,
            limit: limitNum,
            hasNext: endIndex < filteredSummaries.length
        }
    };
    res.json(response);
}));
// GET /api/summaries/:id - Fetch specific summary
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const summary = mockSummaries.find(s => s.id === id);
    if (!summary) {
        return res.status(404).json({
            success: false,
            error: 'Summary not found'
        });
    }
    const response = {
        success: true,
        data: summary
    };
    res.json(response);
}));
// PATCH /api/summaries/:id/reviewed - Mark summary as reviewed/unreviewed
router.patch('/:id/reviewed', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isReviewed } = req.body;
    const summaryIndex = mockSummaries.findIndex(s => s.id === id);
    if (summaryIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'Summary not found'
        });
    }
    // Update review status
    const existingSummary = mockSummaries[summaryIndex];
    mockSummaries[summaryIndex] = {
        ...existingSummary,
        isReviewed: isReviewed !== undefined ? isReviewed : !existingSummary.isReviewed
    };
    const updatedSummary = mockSummaries[summaryIndex];
    const response = {
        success: true,
        data: updatedSummary,
        message: `Summary marked as ${updatedSummary.isReviewed ? 'reviewed' : 'unreviewed'}`
    };
    res.json(response);
}));
// PATCH /api/summaries/:id/important - Mark summary as important/unimportant
router.patch('/:id/important', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isImportant } = req.body;
    const summaryIndex = mockSummaries.findIndex(s => s.id === id);
    if (summaryIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'Summary not found'
        });
    }
    // Update importance status
    const existingSummary = mockSummaries[summaryIndex];
    mockSummaries[summaryIndex] = {
        ...existingSummary,
        isImportant: isImportant !== undefined ? isImportant : !existingSummary.isImportant
    };
    const updatedSummary = mockSummaries[summaryIndex];
    const response = {
        success: true,
        data: updatedSummary,
        message: `Summary marked as ${updatedSummary.isImportant ? 'important' : 'not important'}`
    };
    res.json(response);
}));
// GET /api/summaries/pr/:prId - Fetch summary for specific PR
router.get('/pr/:prId', asyncHandler(async (req, res) => {
    const { prId } = req.params;
    const summary = mockSummaries.find(s => s.prId === prId);
    if (!summary) {
        return res.status(404).json({
            success: false,
            error: 'Summary not found for this pull request'
        });
    }
    const response = {
        success: true,
        data: summary
    };
    res.json(response);
}));
// GET /api/summaries/stats - Get summary statistics
router.get('/stats', asyncHandler(async (req, res) => {
    const totalSummaries = mockSummaries.length;
    const reviewedSummaries = mockSummaries.filter(s => s.isReviewed).length;
    const importantSummaries = mockSummaries.filter(s => s.isImportant).length;
    const unreviewedSummaries = totalSummaries - reviewedSummaries;
    const impactDistribution = {
        high: mockSummaries.filter(s => s.impact === 'high').length,
        medium: mockSummaries.filter(s => s.impact === 'medium').length,
        low: mockSummaries.filter(s => s.impact === 'low').length
    };
    const response = {
        success: true,
        data: {
            total: totalSummaries,
            reviewed: reviewedSummaries,
            unreviewed: unreviewedSummaries,
            important: importantSummaries,
            impactDistribution,
            averageConfidence: mockSummaries.reduce((acc, s) => acc + s.confidence, 0) / totalSummaries,
            totalCost: mockSummaries.reduce((acc, s) => acc + s.tokenUsage.cost, 0)
        }
    };
    res.json(response);
}));
export { router as summariesRouter };
//# sourceMappingURL=summaries.js.map