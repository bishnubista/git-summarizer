# GitHub API Setup Guide

## 🔑 Creating a GitHub Personal Access Token

To use real GitHub data instead of mock data, you need to create a GitHub Personal Access Token (PAT).

### Step 1: Create a GitHub Personal Access Token

1. **Go to GitHub Settings**: 
   - Visit https://github.com/settings/tokens
   - Or navigate: GitHub Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**:
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a descriptive name: `AI PR Summarizer - Local Development`

3. **Set Expiration**:
   - Choose expiration (recommend 90 days for development)

4. **Select Scopes** (Required permissions):
   ```
   ✅ repo (Full control of private repositories)
   ✅ read:user (Read access to profile)
   ✅ user:email (Access to user email addresses)
   ```

5. **Generate Token**:
   - Click "Generate token"
   - **⚠️ Copy the token immediately** - you won't see it again!

### Step 2: Update Environment Configuration

1. **Update your `.env` file**:
   ```bash
   # Replace the demo token with your real GitHub token
   GITHUB_TOKEN=ghp_your_actual_token_here
   
   # Keep other settings
   ENCRYPTION_KEY=demo_key_32_characters_long_test
   JWT_SECRET=demo_jwt_secret_32_characters_long
   NODE_ENV=development
   PORT=3001
   CORS_ORIGINS=http://localhost:5173
   
   # GitHub Configuration
   MAX_REPOS_PER_SYNC=10
   MAX_PRS_PER_REPO=5
   LOG_LEVEL=info
   ```

### Step 3: Restart the Backend

```bash
cd backend
npm run dev
```

## 🧪 Testing the Integration

### Test 1: Verify Token Authentication
```bash
curl http://localhost:3001/api/repositories/user
```
**Expected**: Your GitHub user information

### Test 2: Get Your Starred Repositories
```bash
curl http://localhost:3001/api/repositories
```
**Expected**: List of your actual starred repositories

### Test 3: Get Pull Requests
```bash
curl http://localhost:3001/api/pull-requests
```
**Expected**: Real pull requests from your starred repositories

### Test 4: Trigger Real Sync
```bash
curl -X POST http://localhost:3001/api/sync
```
**Expected**: Sync status with real repository processing

### Test 5: Monitor Sync Progress
```bash
curl http://localhost:3001/api/sync/status
```
**Expected**: Real-time sync progress with actual repository names

## 📊 Rate Limits

- **GitHub API Rate Limit**: 5,000 requests/hour for authenticated users
- **Check Rate Limit**: `curl http://localhost:3001/api/repositories/rate-limit`

## 🐛 Troubleshooting

### Error: "GitHub authentication failed"
- ❌ **Issue**: Invalid or expired token
- ✅ **Solution**: Generate a new GitHub token with correct scopes

### Error: "Repository not found or not accessible"
- ❌ **Issue**: Private repository without proper access
- ✅ **Solution**: Ensure token has `repo` scope for private repositories

### Error: "Rate limit exceeded"
- ❌ **Issue**: Too many API requests
- ✅ **Solution**: Wait for rate limit reset or reduce sync frequency

### No Repositories Found
- ❌ **Issue**: No starred repositories
- ✅ **Solution**: Star some repositories on GitHub first

## 🚀 What's Different Now?

### Before (Mock Data):
- ✅ Fixed 4 repositories (React, TypeScript, Tailwind, Next.js)
- ✅ 3 static pull requests
- ✅ Simulated data

### After (Real GitHub API):
- 🎉 **Your actual starred repositories**
- 🎉 **Real pull requests from those repos**
- 🎉 **Live sync with GitHub**
- 🎉 **Rate limit monitoring**
- 🎉 **Error handling for private repos**

## 🔮 Next Steps

Once GitHub integration is working, we can implement:
1. **AI Summarization** - Real LLM integration for PR summaries
2. **Database Storage** - Persist data between sessions  
3. **Webhook Integration** - Real-time updates
4. **Advanced Filtering** - Search and filter your PRs
5. **Notifications** - Get notified of new PRs

## 🎯 Quick Start Commands

```bash
# 1. Update your .env with real GitHub token
# 2. Restart backend
cd backend && npm run dev

# 3. Test in another terminal
curl http://localhost:3001/api/repositories/user
curl http://localhost:3001/api/repositories
curl -X POST http://localhost:3001/api/sync
curl http://localhost:3001/api/sync/status
```

🎉 **Your AI GitHub PR Summarizer is now connected to real GitHub data!** 