# 🤖 AI GitHub PR Summarizer

An intelligent dashboard that automatically monitors your starred GitHub repositories, analyzes pull requests using AI, and provides comprehensive summaries to help you stay on top of important developments in the open-source projects you follow.

![Dashboard Preview](https://img.shields.io/badge/Status-Live%20Demo-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![AI](https://img.shields.io/badge/AI%20Powered-OpenAI%20%7C%20Claude-blue)

## ✨ Features

### 🎯 **Smart GitHub Integration**
- **Real-time sync** with your starred repositories
- **Live pull request tracking** from multiple projects
- **Rate-limited API calls** to respect GitHub's limits
- **Comprehensive PR metadata** including files changed, additions/deletions

### 🧠 **AI-Powered Analysis**
- **Multi-LLM support**: OpenAI GPT-4, Claude, Ollama (local)
- **Intelligent fallback mode** works without API keys
- **Impact assessment**: Automatically categorizes PRs as Low/Medium/High impact
- **Review priority scoring** to help prioritize your time
- **Confidence scoring** for AI-generated summaries

### 📊 **Professional Dashboard**
- **Beautiful React frontend** with modern UI components
- **Real-time filtering** by repository, author, impact level
- **Review management** - mark summaries as reviewed/important
- **Statistics and analytics** for tracking your review progress
- **Responsive design** works on desktop and mobile

### ⚡ **Production-Ready Architecture**
- **TypeScript throughout** for type safety
- **Express.js backend** with comprehensive error handling
- **Rate limiting and logging** for production deployment
- **Modular architecture** for easy extensibility
- **Environment-based configuration**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- GitHub Personal Access Token
- (Optional) OpenAI or Claude API key for enhanced summaries

### 1. Clone and Setup
```bash
git clone https://github.com/bishnubista/git-summarizer.git
cd git-summarizer

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure GitHub Integration
```bash
# In backend directory, copy and edit environment file
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
# Required: GitHub Personal Access Token
GITHUB_TOKEN=ghp_your_github_token_here

# Optional: AI providers for enhanced summaries
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-4
LLM_PRIMARY_API_KEY=your_openai_key_here
LLM_MAX_TOKENS=4000
LLM_TEMPERATURE=0.3

# Server configuration
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:5173
```

### 3. Get GitHub Token
1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Generate new token (classic) with these scopes:
   - `repo` (Full control of private repositories)
   - `read:user` (Read access to profile)
   - `user:email` (Access to user email addresses)

### 4. Start the Application
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 5. Access Dashboard
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/ai/setup-guide

## 🤖 AI Configuration (Optional)

The system works with fallback summaries if no AI provider is configured, but for enhanced analysis:

### OpenAI (Recommended)
```env
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-4
LLM_PRIMARY_API_KEY=sk-your-openai-key
```
- **Cost**: ~$0.01-0.05 per summary
- **Quality**: Excellent
- **Get API key**: https://platform.openai.com/api-keys

### Claude (Anthropic)
```env
LLM_PRIMARY_PROVIDER=anthropic
LLM_PRIMARY_MODEL=claude-3-haiku-20240307
LLM_PRIMARY_API_KEY=your-claude-key
```
- **Cost**: ~$0.005-0.02 per summary
- **Quality**: Excellent
- **Get API key**: https://console.anthropic.com/

### Ollama (Free Local)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama2

# Configure
LLM_PRIMARY_PROVIDER=ollama
LLM_PRIMARY_MODEL=llama2
```
- **Cost**: Free (uses local compute)
- **Quality**: Good (varies by model)

## 📚 API Documentation

### Core Endpoints
```bash
# Health check
GET /health

# GitHub integration
GET  /api/repositories          # Your starred repos
GET  /api/pull-requests         # Recent PRs
POST /api/sync                  # Manual sync

# AI summaries
GET  /api/summaries             # All summaries
POST /api/summaries/generate    # Generate new summaries
GET  /api/summaries/stats       # Analytics

# AI service management
GET  /api/ai/status             # Check AI configuration
POST /api/ai/test               # Test AI connection
GET  /api/ai/setup-guide        # Setup instructions
```

### Example Usage
```bash
# Generate summaries for recent PRs
curl -X POST http://localhost:3001/api/summaries/generate \
  -H "Content-Type: application/json" \
  -d '{"maxPRs": 10}'

# Get summaries with filtering
curl "http://localhost:3001/api/summaries?impact=high&reviewed=false"

# Check AI service status
curl http://localhost:3001/api/ai/status
```

## 🏗️ Architecture

```
Frontend (React + TypeScript)     Backend (Node.js + Express)
├── Dashboard UI                  ├── GitHub API Integration
├── PR Summary Display            ├── AI Summarization Service
├── Filtering & Search            ├── Multi-LLM Support
└── Real-time Updates             └── Rate Limiting & Logging
                                      
External APIs
├── GitHub API (Starred repos, PRs)
├── OpenAI API (GPT-4 summaries)
├── Claude API (Anthropic)
└── Ollama (Local LLM)
```

## 🧪 Development

### Backend Development
```bash
cd backend
npm run dev          # Start with auto-reload
npm run build        # Build TypeScript
npm run test         # Run tests
npm run lint         # Check code quality
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing the Integration
```bash
# Test GitHub integration
curl http://localhost:3001/api/repositories

# Test AI summarization
curl -X POST http://localhost:3001/api/ai/summarize-sample

# Check sync status
curl http://localhost:3001/api/sync/status
```

## 🌟 Key Features in Action

### 1. Real GitHub Data
- Automatically syncs with your starred repositories
- Fetches live pull requests with full metadata
- Respects GitHub rate limits (5,000 requests/hour)

### 2. Intelligent Summaries
- **AI Analysis**: Understands code changes and their impact
- **Key Changes**: Extracts main features, bug fixes, refactoring
- **Impact Assessment**: Evaluates potential effects on projects
- **Review Priority**: Suggests which PRs need immediate attention

### 3. Smart Filtering
- Filter by repository, author, impact level
- Mark summaries as reviewed/important
- Search and pagination support
- Real-time updates

### 4. Production Ready
- Comprehensive error handling
- Rate limiting and logging
- Environment-based configuration
- Secure API key management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern TypeScript, React, and Node.js
- AI integration powered by OpenAI, Anthropic, and Ollama
- GitHub API for real-time repository data
- Beautiful UI components and responsive design

---

**Ready to stay on top of your favorite open-source projects?** 🚀

[Get Started](#-quick-start) | [View Demo](http://localhost:5173) | [API Docs](http://localhost:3001/api/ai/setup-guide) 