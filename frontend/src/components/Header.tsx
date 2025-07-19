import React from 'react';
import { RefreshCw, Menu, Clock } from 'lucide-react';

interface HeaderProps {
  lastSync: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastSync,
  isLoading,
  onRefresh,
  onMenuToggle
}) => {
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-white">PR Dashboard</h1>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Last sync: {formatLastSync(lastSync)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`
            flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
            font-medium transition-all duration-200
            ${isLoading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-700 active:bg-blue-800'
            }
          `}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Syncing...' : 'Refresh'}
        </button>
      </div>
    </header>
  );
};