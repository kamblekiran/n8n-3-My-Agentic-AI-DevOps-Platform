# MCP DevOps Server
9f56d84e-8320-487e-9b95-968c0532092c
A centralized Model Context Protocol (MCP) server that integrates LLM intelligence with DevOps tools and workflows. This server is designed to work seamlessly with n8n workflows for agentic DevOps automation.

## Features

### 🤖 AI-Powered Agents
- **Code Review Agent**: Automated code analysis with security, performance, and quality insights
- **Test Writer Agent**: Intelligent test generation for multiple programming languages
- **Build Predictor Agent**: ML-based build outcome prediction and optimization
- **Deploy Agent**: Automated deployment with conversational interface
- **Monitor Agent**: Intelligent health monitoring and anomaly detection
- **Security Agent**: Comprehensive vulnerability scanning and compliance checking
- **Rollback Agent**: Smart rollback decisions with impact analysis

### 🧠 LLM Integration
- Support for multiple LLM providers (Anthropic Claude, OpenAI GPT)
- Intent analysis for conversational DevOps
- Natural language response generation
- Context-aware decision making
- Automated report generation

### 🔧 DevOps Tool Integration
- GitHub API integration
- Docker image building and registry management
- Kubernetes deployment automation
- Monitoring and alerting (Slack, PagerDuty)
- Audit logging and compliance tracking

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
Copy `.env.example` to `.env` and configure your API keys and integrations:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude
- `GITHUB_TOKEN`: GitHub personal access token
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications
- Other service credentials as needed

### 3. Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

### 4. Health Check
```bash
curl http://localhost:3000/health
```

## API Endpoints

### Agent Endpoints
- `POST /agent/code-review` - Automated code review
- `POST /agent/test-writer` - Generate tests for code changes
- `POST /agent/build-predictor` - Predict build outcomes
- `POST /agent/docker-handler` - Docker operations
- `POST /agent/deploy` - Deploy applications
- `POST /agent/deploy/conversational` - Conversational deployment

### LLM Endpoints
- `POST /llm/intent-analysis` - Analyze user intent
- `POST /llm/response-generation` - Generate conversational responses
- `POST /llm/security-report` - Generate security reports

### Monitoring Endpoints
- `GET /monitoring/deployments` - Get active deployments

### Notification Endpoints
- `POST /notifications/slack` - Send Slack notifications
- `POST /notifications/pagerduty` - Send PagerDuty alerts

### Logging Endpoints
- `POST /logging/conversation` - Log conversations
- `POST /logging/audit` - Log audit events

## n8n Integration

This server is designed to work with the provided n8n workflows:

1. **Main DevOps Pipeline** (`n8n-workflows/main-devops-pipeline.json`)
2. **Conversational Agent Interface** (`n8n-workflows/conversational-agent-workflow.json`)
3. **Monitoring & Rollback** (`n8n-workflows/monitoring-rollback-workflow.json`)
4. **Security & Extensibility Demo** (`n8n-workflows/extensibility-demo-workflow.json`)

### Setting up n8n Integration

1. Import the workflow JSON files into your n8n instance
2. Configure the HTTP Request nodes to point to your MCP server
3. Set the `MCP_SERVER_TOKEN` environment variable in n8n
4. Configure webhook URLs and credentials

### Example n8n HTTP Request Configuration
```json
{
  "method": "POST",
  "url": "http://your-mcp-server:3000/agent/code-review",
  "headers": {
    "Authorization": "Bearer {{ $env.MCP_SERVER_TOKEN }}",
    "Content-Type": "application/json"
  }
}
```

## Authentication

The server uses Bearer token authentication. For development, you can use the `MCP_SERVER_TOKEN` from your `.env` file. For production, implement proper JWT token generation and validation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   n8n Workflows │────│  MCP Server     │────│  LLM Services   │
│                 │    │                 │    │  (Claude/GPT)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐  ┌───────▼────────┐
            │  DevOps Tools  │  │  Notifications │
            │  (GitHub, K8s, │  │  (Slack, PD)   │
            │   Docker)      │  │                │
            └────────────────┘  └────────────────┘
```

## Extending the Server

### Adding New Agents

1. Create a new route in `src/routes/agents.js`
2. Implement the agent logic with LLM integration
3. Add corresponding DevOps service methods if needed
4. Update the n8n workflows to use the new agent

### Adding New LLM Providers

1. Extend `src/services/llmService.js`
2. Add provider-specific configuration
3. Implement provider-specific API calls
4. Update environment variables

### Adding New DevOps Tools

1. Extend `src/services/devopsService.js`
2. Add tool-specific API integrations
3. Create corresponding agent endpoints
4. Update workflows to use new tools

## Security Considerations

- Always use HTTPS in production
- Implement proper JWT token validation
- Use environment variables for sensitive data
- Enable rate limiting and request validation
- Regularly update dependencies
- Implement proper logging and monitoring

## Monitoring and Observability

The server includes comprehensive logging using Winston:
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development mode

Key metrics to monitor:
- API response times
- LLM API usage and costs
- Agent success/failure rates
- Authentication failures
- Rate limit hits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
