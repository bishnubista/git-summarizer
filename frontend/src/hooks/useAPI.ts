import { useState, useEffect } from 'react';
import { Repository, PullRequest, PRSummary, AppState } from '../types';

// API base URL
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to make API requests
const apiRequest = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data; // Extract the data field from the API response
};

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

    try {
      // Fetch repositories, pull requests, and summaries in parallel
      const [repositories, pullRequests, summaries] = await Promise.all([
        apiRequest<Repository[]>('/repositories'),
        apiRequest<PullRequest[]>('/pull-requests'),
        apiRequest<PRSummary[]>('/summaries')
      ]);

      setState(prev => ({
        ...prev,
        repositories,
        pullRequests,
        summaries,
        lastSync: new Date(),
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Keep previous data on error, just stop loading
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const markAsReviewed = async (summaryId: string) => {
    try {
      // Make API call to update review status
      await apiRequest(`/summaries/${summaryId}/reviewed`, {
        method: 'PATCH'
      });

      // Update local state
      setState(prev => ({
        ...prev,
        summaries: prev.summaries.map(summary =>
          summary.id === summaryId
            ? { ...summary, isReviewed: !summary.isReviewed }
            : summary
        )
      }));
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
    }
  };

  const markAsImportant = async (summaryId: string) => {
    try {
      // Make API call to update importance status
      await apiRequest(`/summaries/${summaryId}/important`, {
        method: 'PATCH'
      });

      // Update local state
      setState(prev => ({
        ...prev,
        summaries: prev.summaries.map(summary =>
          summary.id === summaryId
            ? { ...summary, isImportant: !summary.isImportant }
            : summary
        )
      }));
    } catch (error) {
      console.error('Failed to mark as important:', error);
    }
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