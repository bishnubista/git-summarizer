import { useState, useEffect } from 'react';
import { Repository, PullRequest, PRSummary, AppState } from '../types';

// Mock data
const mockRepositories: Repository[] = [
  {
    id: '1',
    name: 'react',
    owner: 'facebook',
    fullName: 'facebook/react',
    description: 'The library for web and native user interfaces',
    stargazersCount: 223000,
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'typescript',
    owner: 'microsoft',
    fullName: 'microsoft/typescript',
    description: 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output',
    stargazersCount: 98000,
    updatedAt: '2024-01-14T15:20:00Z'
  },
  {
    id: '3',
    name: 'tailwindcss',
    owner: 'tailwindlabs',
    fullName: 'tailwindlabs/tailwindcss',
    description: 'A utility-first CSS framework for rapid UI development',
    stargazersCount: 78000,
    updatedAt: '2024-01-13T09:45:00Z'
  },
  {
    id: '4',
    name: 'next.js',
    owner: 'vercel',
    fullName: 'vercel/next.js',
    description: 'The React Framework for the Web',
    stargazersCount: 120000,
    updatedAt: '2024-01-12T14:10:00Z'
  }
];

const mockPullRequests: PullRequest[] = [
  {
    id: 'pr-1',
    number: 12345,
    title: 'feat: Add new concurrent features for React 19',
    author: {
      login: 'gaearon',
      avatarUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?w=64&h=64&fit=crop&crop=face'
    },
    body: 'This PR introduces new concurrent features that improve React performance significantly...',
    state: 'open',
    createdAt: '2024-01-15T08:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    changedFiles: 15,
    additions: 245,
    deletions: 89,
    repository: mockRepositories[0]
  },
  {
    id: 'pr-2',
    number: 67890,
    title: 'fix: Resolve type inference issues in generic constraints',
    author: {
      login: 'ahejlsberg',
      avatarUrl: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?w=64&h=64&fit=crop&crop=face'
    },
    body: 'Fixes several edge cases where type inference was not working correctly...',
    state: 'open',
    createdAt: '2024-01-14T12:15:00Z',
    updatedAt: '2024-01-14T15:20:00Z',
    changedFiles: 8,
    additions: 123,
    deletions: 45,
    repository: mockRepositories[1]
  },
  {
    id: 'pr-3',
    number: 54321,
    title: 'feat: Add new utility classes for container queries',
    author: {
      login: 'adamwathan',
      avatarUrl: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=64&h=64&fit=crop&crop=face'
    },
    body: 'Introduces container query utilities that allow responsive design based on container size...',
    state: 'open',
    createdAt: '2024-01-13T16:45:00Z',
    updatedAt: '2024-01-13T18:20:00Z',
    changedFiles: 12,
    additions: 189,
    deletions: 23,
    repository: mockRepositories[2]
  }
];

const mockSummaries: PRSummary[] = [
  {
    id: 'summary-1',
    prId: 'pr-1',
    summary: `## Summary
This PR introduces significant improvements to React's concurrent rendering capabilities. The changes focus on optimizing scheduler performance and reducing memory overhead during concurrent updates.

## Key Changes
- **Scheduler Optimization**: Improved task prioritization algorithm
- **Memory Management**: Reduced memory allocations during rendering
- **Developer Experience**: Better error messages for concurrent rendering issues

## Impact
These changes should result in smoother user experiences, especially for applications with heavy concurrent updates like real-time dashboards and gaming interfaces.`,
    keyChanges: [
      'Scheduler performance improvements',
      'Memory optimization',
      'Enhanced error handling',
      'Breaking changes in experimental APIs'
    ],
    impact: 'high',
    isReviewed: false,
    isImportant: true,
    createdAt: '2024-01-15T08:45:00Z'
  },
  {
    id: 'summary-2',
    prId: 'pr-2',
    summary: `## Summary
This PR addresses several type inference edge cases that were causing compilation errors in complex generic scenarios.

## Key Changes
- **Generic Constraints**: Fixed inference with conditional types
- **Mapped Types**: Improved handling of template literal types
- **Performance**: Reduced compilation time for large codebases

## Impact
Developers using advanced TypeScript features will experience fewer compilation errors and faster build times.`,
    keyChanges: [
      'Fixed generic type inference',
      'Improved mapped type handling',
      'Compilation performance boost',
      'Better error messages'
    ],
    impact: 'medium',
    isReviewed: true,
    isImportant: false,
    createdAt: '2024-01-14T12:30:00Z'
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
    createdAt: '2024-01-13T17:00:00Z'
  }
];

export const useAPI = () => {
  const [state, setState] = useState<AppState>({
    repositories: [],
    pullRequests: [],
    summaries: [],
    selectedRepo: null,
    filter: 'all',
    lastSync: null,
    isLoading: true
  });

  const fetchData = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setState(prev => ({
      ...prev,
      repositories: mockRepositories,
      pullRequests: mockPullRequests,
      summaries: mockSummaries,
      lastSync: new Date(),
      isLoading: false
    }));
  };

  const markAsReviewed = async (summaryId: string) => {
    setState(prev => ({
      ...prev,
      summaries: prev.summaries.map(summary =>
        summary.id === summaryId
          ? { ...summary, isReviewed: !summary.isReviewed }
          : summary
      )
    }));
  };

  const markAsImportant = async (summaryId: string) => {
    setState(prev => ({
      ...prev,
      summaries: prev.summaries.map(summary =>
        summary.id === summaryId
          ? { ...summary, isImportant: !summary.isImportant }
          : summary
      )
    }));
  };

  const setSelectedRepo = (repoId: string | null) => {
    setState(prev => ({ ...prev, selectedRepo: repoId }));
  };

  const setFilter = (filter: AppState['filter']) => {
    setState(prev => ({ ...prev, filter }));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    ...state,
    refetch: fetchData,
    markAsReviewed,
    markAsImportant,
    setSelectedRepo,
    setFilter
  };
};