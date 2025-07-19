export interface Repository {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  description?: string;
  stargazersCount: number;
  updatedAt: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  body: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  repository: Repository;
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
}

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