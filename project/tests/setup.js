// Test setup file
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock environment variables for testing
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.GITHUB_TOKEN = 'test-github-token';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MCP_SERVER_TOKEN = 'test-mcp-token';