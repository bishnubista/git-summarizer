import { Octokit } from '@octokit/rest';
import type { Repository, PullRequest, GitHubUser, Label, Commit } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export class GitHubService {
    private octokit: Octokit;
    private rateLimitRemaining: number = 5000;
    private rateLimitReset: Date = new Date();

    constructor() {
        this.octokit = new Octokit({
            auth: config.github.token,
            userAgent: 'AI-GitHub-PR-Summarizer/1.0.0',
            timeZone: 'UTC',
            request: {
                timeout: 30000, // 30 seconds
            }
        });
    }

    /**
     * Check rate limit status and wait if necessary
     */
    private async checkRateLimit(): Promise<void> {
        try {
            const { data } = await this.octokit.rest.rateLimit.get();
            this.rateLimitRemaining = data.rate.remaining;
            this.rateLimitReset = new Date(data.rate.reset * 1000);

            logger.info(`GitHub rate limit: ${this.rateLimitRemaining} requests remaining`);

            if (this.rateLimitRemaining < 10) {
                const waitTime = this.rateLimitReset.getTime() - Date.now();
                if (waitTime > 0) {
                    logger.warn(`Rate limit low, waiting ${Math.ceil(waitTime / 1000)} seconds`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        } catch (error) {
            logger.error('Failed to check rate limit:', error);
        }
    }

    /**
     * Convert GitHub repository data to our Repository interface
     */
    private mapRepository(githubRepo: any): Repository {
        return {
            id: githubRepo.id.toString(),
            name: githubRepo.name,
            owner: githubRepo.owner.login,
            fullName: githubRepo.full_name,
            description: githubRepo.description || undefined,
            stargazersCount: githubRepo.stargazers_count,
            updatedAt: githubRepo.updated_at,
            gitUrl: githubRepo.git_url,
            sshUrl: githubRepo.ssh_url,
            language: githubRepo.language || undefined,
            isPrivate: githubRepo.private,
            enabled: true, // Default to enabled
            priority: githubRepo.stargazers_count > 10000 ? 'high' :
                githubRepo.stargazers_count > 1000 ? 'medium' : 'low',
            notificationChannels: ['email'] // Default notification channel
        };
    }

    /**
     * Convert GitHub user data to our GitHubUser interface
     */
    private mapUser(githubUser: any): GitHubUser {
        return {
            login: githubUser.login,
            id: githubUser.id,
            avatarUrl: githubUser.avatar_url,
            url: githubUser.html_url,
            type: githubUser.type
        };
    }

    /**
     * Convert GitHub pull request data to our PullRequest interface
     */
    private mapPullRequest(githubPR: any, repository: Repository): PullRequest {
        return {
            id: githubPR.id.toString(),
            number: githubPR.number,
            title: githubPR.title,
            body: githubPR.body || '',
            state: githubPR.state,
            author: this.mapUser(githubPR.user),
            createdAt: githubPR.created_at,
            updatedAt: githubPR.updated_at,
            changedFiles: githubPR.changed_files || 0,
            additions: githubPR.additions || 0,
            deletions: githubPR.deletions || 0,
            repository,
            htmlUrl: githubPR.html_url,
            diffUrl: githubPR.diff_url,
            patchUrl: githubPR.patch_url,
            labels: githubPR.labels?.map((label: any): Label => ({
                id: label.id,
                name: label.name,
                color: label.color,
                description: label.description
            })) || [],
            assignees: githubPR.assignees?.map((user: any) => this.mapUser(user)) || [],
            reviewers: githubPR.requested_reviewers?.map((user: any) => this.mapUser(user)) || [],
            commits: [], // Will be populated separately if needed
            baseBranch: githubPR.base?.ref || 'main',
            headBranch: githubPR.head?.ref || 'feature',
            mergeable: githubPR.mergeable,
            mergeableState: githubPR.mergeable_state
        };
    }

    /**
     * Get authenticated user's starred repositories
     */
    async getStarredRepositories(options: {
        page?: number;
        perPage?: number;
        sort?: 'created' | 'updated';
        direction?: 'asc' | 'desc';
    } = {}): Promise<{ repositories: Repository[], totalCount: number, hasNext: boolean }> {
        await this.checkRateLimit();

        try {
            logger.info('Fetching starred repositories from GitHub');

            const { page = 1, perPage = config.github.maxReposPerSync, sort = 'updated', direction = 'desc' } = options;

            const { data: repositories } = await this.octokit.rest.activity.listReposStarredByAuthenticatedUser({
                page,
                per_page: Math.min(perPage, 100), // GitHub max per page is 100
                sort,
                direction
            });

            // Check if there are more pages
            const hasNext = repositories.length === perPage;

            const mappedRepositories = repositories.map(repo => this.mapRepository(repo));

            logger.info(`Fetched ${mappedRepositories.length} starred repositories`);

            return {
                repositories: mappedRepositories,
                totalCount: repositories.length, // Note: GitHub doesn't provide total count for starred repos
                hasNext
            };
        } catch (error: any) {
            logger.error('Failed to fetch starred repositories:', error);

            if (error.status === 401) {
                throw new Error('GitHub authentication failed. Please check your token.');
            } else if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
                throw new Error('GitHub rate limit exceeded. Please try again later.');
            }

            throw new Error(`GitHub API error: ${error.message}`);
        }
    }

    /**
     * Get pull requests for a specific repository
     */
    async getRepositoryPullRequests(
        owner: string,
        repo: string,
        options: {
            state?: 'open' | 'closed' | 'all';
            page?: number;
            perPage?: number;
            sort?: 'created' | 'updated' | 'popularity' | 'long-running';
            direction?: 'asc' | 'desc';
        } = {}
    ): Promise<{ pullRequests: PullRequest[], hasNext: boolean }> {
        await this.checkRateLimit();

        try {
            logger.info(`Fetching pull requests for ${owner}/${repo}`);

            const {
                state = 'open',
                page = 1,
                perPage = config.github.maxPRsPerRepo,
                sort = 'updated',
                direction = 'desc'
            } = options;

            // First get the repository information
            const { data: repoData } = await this.octokit.rest.repos.get({
                owner,
                repo
            });

            const repository = this.mapRepository(repoData);

            // Then get pull requests
            const { data: pullRequests } = await this.octokit.rest.pulls.list({
                owner,
                repo,
                state,
                page,
                per_page: Math.min(perPage, 100),
                sort,
                direction
            });

            const hasNext = pullRequests.length === perPage;
            const mappedPRs = pullRequests.map(pr => this.mapPullRequest(pr, repository));

            logger.info(`Fetched ${mappedPRs.length} pull requests for ${owner}/${repo}`);

            return {
                pullRequests: mappedPRs,
                hasNext
            };
        } catch (error: any) {
            logger.error(`Failed to fetch pull requests for ${owner}/${repo}:`, error);

            if (error.status === 404) {
                throw new Error(`Repository ${owner}/${repo} not found or not accessible.`);
            } else if (error.status === 403) {
                if (error.response?.headers?.['x-ratelimit-remaining'] === '0') {
                    throw new Error('GitHub rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`Access forbidden to repository ${owner}/${repo}.`);
                }
            }

            throw new Error(`GitHub API error: ${error.message}`);
        }
    }

    /**
     * Get all pull requests from starred repositories
     */
    async getAllPullRequestsFromStarredRepos(options: {
        maxRepos?: number;
        maxPRsPerRepo?: number;
        prState?: 'open' | 'closed' | 'all';
    } = {}): Promise<{ pullRequests: PullRequest[], repositories: Repository[] }> {
        const {
            maxRepos = config.github.maxReposPerSync,
            maxPRsPerRepo = config.github.maxPRsPerRepo,
            prState = 'open'
        } = options;

        try {
            // Get starred repositories
            const { repositories } = await this.getStarredRepositories({
                perPage: maxRepos
            });

            logger.info(`Processing ${repositories.length} repositories for pull requests`);

            const allPullRequests: PullRequest[] = [];
            const processedRepos: Repository[] = [];

            // Process repositories in batches to respect rate limits
            for (const repository of repositories.slice(0, maxRepos)) {
                try {
                    const { pullRequests } = await this.getRepositoryPullRequests(
                        repository.owner,
                        repository.name,
                        {
                            state: prState,
                            perPage: maxPRsPerRepo
                        }
                    );

                    allPullRequests.push(...pullRequests);
                    processedRepos.push(repository);

                    logger.info(`Found ${pullRequests.length} PRs in ${repository.fullName}`);

                    // Small delay to be nice to GitHub's API
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    logger.warn(`Skipping repository ${repository.fullName} due to error:`, error);
                    // Continue with other repositories
                }
            }

            logger.info(`Total: ${allPullRequests.length} pull requests from ${processedRepos.length} repositories`);

            return {
                pullRequests: allPullRequests,
                repositories: processedRepos
            };
        } catch (error) {
            logger.error('Failed to fetch pull requests from starred repositories:', error);
            throw error;
        }
    }

    /**
     * Get detailed information about a specific pull request
     */
    async getPullRequestDetails(
        owner: string,
        repo: string,
        pullNumber: number
    ): Promise<{
        pullRequest: PullRequest;
        commits: Commit[];
        files: any[];
    }> {
        await this.checkRateLimit();

        try {
            logger.info(`Fetching detailed info for PR #${pullNumber} in ${owner}/${repo}`);

            // Get PR details, commits, and files in parallel
            const [prResponse, commitsResponse, filesResponse, repoResponse] = await Promise.all([
                this.octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber }),
                this.octokit.rest.pulls.listCommits({ owner, repo, pull_number: pullNumber }),
                this.octokit.rest.pulls.listFiles({ owner, repo, pull_number: pullNumber }),
                this.octokit.rest.repos.get({ owner, repo })
            ]);

            const repository = this.mapRepository(repoResponse.data);
            const pullRequest = this.mapPullRequest(prResponse.data, repository);

            const commits: Commit[] = commitsResponse.data.map(commit => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: {
                    name: commit.commit.author?.name || 'Unknown',
                    email: commit.commit.author?.email || 'unknown@example.com',
                    date: commit.commit.author?.date || new Date().toISOString()
                },
                url: commit.html_url,
                createdAt: commit.commit.author?.date || new Date().toISOString()
            }));

            logger.info(`Fetched ${commits.length} commits and ${filesResponse.data.length} files for PR #${pullNumber}`);

            return {
                pullRequest,
                commits,
                files: filesResponse.data
            };
        } catch (error: any) {
            logger.error(`Failed to fetch PR details for #${pullNumber}:`, error);
            throw new Error(`GitHub API error: ${error.message}`);
        }
    }

    /**
     * Get the authenticated user's information
     */
    async getAuthenticatedUser(): Promise<GitHubUser> {
        await this.checkRateLimit();

        try {
            const { data: user } = await this.octokit.rest.users.getAuthenticated();
            return this.mapUser(user);
        } catch (error: any) {
            logger.error('Failed to fetch authenticated user:', error);
            throw new Error('Failed to authenticate with GitHub. Please check your token.');
        }
    }

    /**
     * Check if the GitHub token is valid
     */
    async validateToken(): Promise<boolean> {
        try {
            await this.getAuthenticatedUser();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current rate limit status
     */
    async getRateLimitStatus(): Promise<{
        remaining: number;
        limit: number;
        reset: Date;
        used: number;
    }> {
        try {
            const { data } = await this.octokit.rest.rateLimit.get();
            return {
                remaining: data.rate.remaining,
                limit: data.rate.limit,
                reset: new Date(data.rate.reset * 1000),
                used: data.rate.used
            };
        } catch (error) {
            logger.error('Failed to get rate limit status:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const githubService = new GitHubService(); 