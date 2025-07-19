import React from 'react';
import { Repository, FilterType } from '../types';
import { Star, Filter, GitBranch } from 'lucide-react';

interface SidebarProps {
  repositories: Repository[];
  selectedRepo: string | null;
  filter: FilterType;
  onRepoSelect: (repoId: string | null) => void;
  onFilterChange: (filter: FilterType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const filterOptions: { key: FilterType; label: string; color: string }[] = [
  { key: 'all', label: 'All PRs', color: 'text-gray-600' },
  { key: 'unreviewed', label: 'Unreviewed', color: 'text-orange-600' },
  { key: 'reviewed', label: 'Reviewed', color: 'text-green-600' },
  { key: 'important', label: 'Important', color: 'text-purple-600' }
];

export const Sidebar: React.FC<SidebarProps> = ({
  repositories,
  selectedRepo,
  filter,
  onRepoSelect,
  onFilterChange,
  isOpen,
  onClose
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-gray-900 border-r border-gray-800
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <GitBranch className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold text-white">PR Summarizer</h1>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Filters
              </h2>
            </div>
            <div className="space-y-2">
              {filterOptions.map(option => (
                <button
                  key={option.key}
                  onClick={() => onFilterChange(option.key)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${filter === option.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Repositories */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Starred Repositories
              </h2>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => onRepoSelect(null)}
                className={`
                  w-full text-left p-3 rounded-lg transition-colors duration-200
                  ${selectedRepo === null
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                  }
                `}
              >
                <div className="font-medium">All Repositories</div>
                <div className="text-sm opacity-70">
                  {repositories.length} repositories
                </div>
              </button>
              
              {repositories.map(repo => (
                <button
                  key={repo.id}
                  onClick={() => onRepoSelect(repo.id)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors duration-200
                    ${selectedRepo === repo.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="font-medium">{repo.name}</div>
                  <div className="text-sm opacity-70">{repo.owner}</div>
                  <div className="flex items-center gap-1 mt-1 text-xs opacity-60">
                    <Star className="w-3 h-3" />
                    {repo.stargazersCount.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};