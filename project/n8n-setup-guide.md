# n8n Setup Guide for MCP DevOps Server

This guide will help you set up the n8n workflows to work with the MCP DevOps Server.

## Prerequisites

1. n8n instance running (local or cloud)
2. MCP DevOps Server running and accessible
3. Required API keys and tokens

## Step 1: Environment Variables

Set these environment variables in your n8n instance:

```bash
MCP_SERVER_URL=http://localhost:3000
MCP_SERVER_TOKEN=your-mcp-server-token-here
GITHUB_TOKEN=your-github-token
SLACK_WEBHOOK_URL=your-slack-webhook-url
PAGERDUTY_ROUTING_KEY=your-pagerduty-key
```

## Step 2: Create Credentials

### MCP Server Authentication

1. Go to **Settings** > **Credentials** in n8n
2. Click **Create New Credential**
3. Select **HTTP Header Auth**
4. Configure:
   - **Name**: `MCP Server Auth`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_MCP_SERVER_TOKEN`
5. Save the credential

### GitHub Webhook (Optional)

If you want to receive real GitHub webhooks:

1. Create **Generic Credential**
2. Add your GitHub webhook secret
3. Configure webhook URL in your GitHub repository

## Step 3: Import Workflows

1. Copy the JSON content from each workflow file:
   - `main-devops-pipeline.json`
   - `conversational-agent-workflow.json`
   - `monitoring-rollback-workflow.json`
   - `extensibility-demo-workflow.json`

2. In n8n:
   - Go to **Workflows**
   - Click **Import from JSON**
   - Paste the JSON content
   - Click **Import**

## Step 4: Configure Workflows

### Main DevOps Pipeline

1. Open the imported workflow
2. Check each HTTP Request node has:
   - **Authentication**: `MCP Server Auth` credential
   - **URL**: Uses `{{ $env.MCP_SERVER_URL }}`
3. Test the webhook trigger:
   - Copy the webhook URL
   - Send a test POST request

### Conversational Agent Interface

1. Configure the webhook for chat interface
2. Test with a sample message:
   ```json
   {
     "message": "Deploy my-app to staging",
     "user_id": "test-user"
   }
   ```

## Step 5: Test the Setup

### Test Code Review Agent

Send a POST request to the webhook:

```json
{
  "repository": {
    "full_name": "test/repo"
  },
  "number": 123,
  "action": "opened",
  "pull_request": {
    "diff_url": "https://github.com/test/repo/pull/123.diff",
    "base": {
      "sha": "abc123"
    },
    "head": {
      "sha": "def456",
      "ref": "feature-branch"
    }
  }
}
```

### Test Conversational Interface

Send a POST request to the chat webhook:

```json
{
  "message": "Show me the status of my deployments",
  "user_id": "developer-1"
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify `MCP_SERVER_TOKEN` is correct
   - Check credential configuration in n8n
   - Ensure MCP server is running

2. **Connection Errors**
   - Verify `MCP_SERVER_URL` is accessible from n8n
   - Check firewall settings
   - Test server health endpoint: `GET /health`

3. **Workflow Execution Errors**
   - Check n8n execution logs
   - Verify JSON body formatting
   - Test individual nodes

### Debug Mode

Enable debug logging in the MCP server:

```bash
LOG_LEVEL=debug npm run dev
```

### Mock Data Mode

If GitHub integration is not available, the server will automatically use mock data for testing.

## Advanced Configuration

### Custom Agents

To add new agents:

1. Add endpoint in `src/routes/agents.js`
2. Create corresponding n8n HTTP Request node
3. Update workflow connections

### Monitoring Integration

Configure monitoring tools:

1. Set up Prometheus/Grafana endpoints
2. Configure alerting webhooks
3. Update monitoring workflow URLs

### Security

1. Use HTTPS in production
2. Implement proper JWT tokens
3. Set up rate limiting
4. Configure CORS properly

## Support

For issues:

1. Check MCP server logs
2. Review n8n execution history
3. Test individual components
4. Verify all credentials and environment variables

The workflows are designed to be resilient and will provide meaningful error messages when issues occur.