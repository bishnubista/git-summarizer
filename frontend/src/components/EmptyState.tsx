import React from 'react';
import { GitPullRequest, Filter, Star } from 'lucide-react';
import { FilterType } from '../types';

interface EmptyStateProps {
  filter: FilterType;
  selectedRepo: string | null;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ filter, selectedRepo }) => {
  const getEmptyStateContent = () => {
    if (selectedRepo && filter === 'all') {
      return {
        icon: GitPullRequest,
        title: 'No pull requests found',
        description: 'This repository doesn\'t have any open pull requests at the moment.'
      };
    }

    switch (filter) {
      case 'reviewed':
        return {
          icon: Filter,
          title: 'No reviewed PRs',
          description: 'You haven\'t marked any pull requests as reviewed yet.'
        };
      case 'important':
        return {
          icon: Star,
          title: 'No important PRs',
          description: 'You haven\'t marked any pull requests as important yet.'
        };
      case 'unreviewed':
        return {
          icon: GitPullRequest,
          title: 'All caught up!',
          description: 'All pull requests have been reviewed.'
        };
      default:
        return {
          icon: GitPullRequest,
          title: 'No pull requests found',
          description: 'No pull requests match your current filters.'
        };
    }
  };

  const { icon: Icon, title, description } = getEmptyStateContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md">{description}</p>
    </div>
  );
};