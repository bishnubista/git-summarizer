import React, { useState } from 'react';
import { PullRequest, PRSummary } from '../types';
import { 
  GitPullRequest, 
  User, 
  Calendar, 
  FileText, 
  Plus, 
  Minus,
  Eye,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PRCardProps {
  pullRequest: PullRequest;
  summary: PRSummary;
  onMarkReviewed: (summaryId: string) => void;
  onMarkImportant: (summaryId: string) => void;
}

export const PRCard: React.FC<PRCardProps> = ({
  pullRequest,
  summary,
  onMarkReviewed,
  onMarkImportant
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImpactColor = (impact: PRSummary['impact']) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'low': return 'text-green-400 bg-green-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
      .replace(/^\*\*(.+?)\*\*:/gm, '<strong class="text-blue-400">$1:</strong>')
      .replace(/^\- (.+)$/gm, '<li class="ml-4 text-gray-300">• $1</li>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={pullRequest.author.avatarUrl}
          alt={pullRequest.author.login}
          className="w-10 h-10 rounded-full border-2 border-gray-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-400 font-medium">
              {pullRequest.repository.fullName}
            </span>
            <span className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${getImpactColor(summary.impact)}
            `}>
              {summary.impact} impact
            </span>
          </div>
          <h3 className="text-white font-semibold text-lg leading-tight mb-2">
            {pullRequest.title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <GitPullRequest className="w-4 h-4" />
              #{pullRequest.number}
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {pullRequest.author.login}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(pullRequest.createdAt)}
            </div>
          </div>
        </div>
        
        {/* Status badges */}
        <div className="flex gap-2">
          {summary.isReviewed && (
            <div className="px-2 py-1 bg-green-400/10 text-green-400 rounded-full text-xs font-medium">
              Reviewed
            </div>
          )}
          {summary.isImportant && (
            <div className="px-2 py-1 bg-purple-400/10 text-purple-400 rounded-full text-xs font-medium">
              Important
            </div>
          )}
        </div>
      </div>

      {/* Changes summary */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">{pullRequest.changedFiles} files</span>
        </div>
        <div className="flex items-center gap-1">
          <Plus className="w-4 h-4 text-green-400" />
          <span className="text-green-400">{pullRequest.additions}</span>
        </div>
        <div className="flex items-center gap-1">
          <Minus className="w-4 h-4 text-red-400" />
          <span className="text-red-400">{pullRequest.deletions}</span>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mb-4">
        <div 
          className="prose prose-sm max-w-none text-gray-300"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(summary.summary) }}
        />
      </div>

      {/* Key changes */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Key Changes:</h4>
        <div className="flex flex-wrap gap-2">
          {summary.keyChanges.map((change, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs"
            >
              {change}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={() => onMarkReviewed(summary.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${summary.isReviewed
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            <Eye className="w-4 h-4" />
            {summary.isReviewed ? 'Reviewed' : 'Mark Reviewed'}
          </button>
          
          <button
            onClick={() => onMarkImportant(summary.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${summary.isImportant
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            <Star className="w-4 h-4" />
            {summary.isImportant ? 'Important' : 'Mark Important'}
          </button>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors duration-200"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">PR Description:</h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              {pullRequest.body}
            </p>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <a
                href={`https://github.com/${pullRequest.repository.fullName}/pull/${pullRequest.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
              >
                View on GitHub →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};