import React, { useState } from 'react';
import { useAPI } from './hooks/useAPI';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PRCard } from './components/PRCard';
import { EmptyState } from './components/EmptyState';
import { LoadingSpinner } from './components/LoadingSpinner';
import { filterPRs } from './utils/filters';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const {
    repositories,
    pullRequests,
    summaries,
    selectedRepo,
    filter,
    lastSync,
    isLoading,
    refetch,
    markAsReviewed,
    markAsImportant,
    setSelectedRepo,
    setFilter
  } = useAPI();

  const filteredPRs = filterPRs(pullRequests, summaries, filter, selectedRepo);

  const selectedRepoName = selectedRepo 
    ? repositories.find(r => r.id === selectedRepo)?.fullName 
    : null;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar
        repositories={repositories}
        selectedRepo={selectedRepo}
        filter={filter}
        onRepoSelect={setSelectedRepo}
        onFilterChange={setFilter}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col lg:ml-0">
        <Header
          lastSync={lastSync}
          isLoading={isLoading}
          onRefresh={refetch}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* Page title and stats */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {selectedRepoName ? `${selectedRepoName} - ` : ''}
              {filter === 'all' ? 'All Pull Requests' : 
               filter === 'reviewed' ? 'Reviewed Pull Requests' :
               filter === 'important' ? 'Important Pull Requests' :
               'Unreviewed Pull Requests'}
            </h2>
            <p className="text-gray-400">
              {isLoading ? 'Loading...' : `${filteredPRs.length} pull request${filteredPRs.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {/* Content */}
          {isLoading ? (
            <LoadingSpinner />
          ) : filteredPRs.length === 0 ? (
            <EmptyState filter={filter} selectedRepo={selectedRepo} />
          ) : (
            <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
              {filteredPRs.map(pr => {
                const summary = summaries.find(s => s.prId === pr.id);
                if (!summary) return null;
                
                return (
                  <PRCard
                    key={pr.id}
                    pullRequest={pr}
                    summary={summary}
                    onMarkReviewed={markAsReviewed}
                    onMarkImportant={markAsImportant}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;