import { PullRequest, PRSummary, FilterType } from '../types';

export const filterPRs = (
  pullRequests: PullRequest[],
  summaries: PRSummary[],
  filter: FilterType,
  selectedRepo: string | null
) => {
  // First filter by repository if one is selected
  let filteredPRs = selectedRepo 
    ? pullRequests.filter(pr => pr.repository.id === selectedRepo)
    : pullRequests;

  // Then filter by status
  switch (filter) {
    case 'reviewed':
      return filteredPRs.filter(pr => {
        const summary = summaries.find(s => s.prId === pr.id);
        return summary?.isReviewed;
      });
    case 'important':
      return filteredPRs.filter(pr => {
        const summary = summaries.find(s => s.prId === pr.id);
        return summary?.isImportant;
      });
    case 'unreviewed':
      return filteredPRs.filter(pr => {
        const summary = summaries.find(s => s.prId === pr.id);
        return !summary?.isReviewed;
      });
    case 'all':
    default:
      return filteredPRs;
  }
};

export const getFilterCounts = (
  pullRequests: PullRequest[],
  summaries: PRSummary[],
  selectedRepo: string | null
) => {
  const baseFilter = selectedRepo 
    ? pullRequests.filter(pr => pr.repository.id === selectedRepo)
    : pullRequests;

  return {
    all: baseFilter.length,
    reviewed: baseFilter.filter(pr => {
      const summary = summaries.find(s => s.prId === pr.id);
      return summary?.isReviewed;
    }).length,
    important: baseFilter.filter(pr => {
      const summary = summaries.find(s => s.prId === pr.id);
      return summary?.isImportant;
    }).length,
    unreviewed: baseFilter.filter(pr => {
      const summary = summaries.find(s => s.prId === pr.id);
      return !summary?.isReviewed;
    }).length
  };
};