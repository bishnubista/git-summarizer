import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
        <span className="text-gray-400">Loading pull requests...</span>
      </div>
    </div>
  );
};