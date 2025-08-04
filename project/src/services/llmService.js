const { Anthropic } = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');
const axios = require('axios');
const logger = require('../utils/logger');

class LLMService {
  constructor() {
    // Initialize Anthropic client
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    this.defaultModel = process.env.DEFAULT_LLM_MODEL || 'claude-3-sonnet-20240229';
  }

  async generateResponseWithProvider(prompt, options = {}) {
    const {
      model = this.defaultModel,
      maxTokens = 4000,
      temperature = 0.7,
      systemPrompt = null,
      provider = 'auto'
    } = options;

    // Determine provider based on model or explicit provider setting
    let useProvider = provider;
    if (provider === 'auto') {
      if (model.includes('claude') || model.includes('anthropic')) {
        useProvider = 'anthropic';
      } else if (model.includes('gpt') || model.includes('openai')) {
        useProvider = 'openai';
      } else {
        useProvider = this.anthropic ? 'anthropic' : 'openai';
      }
    }

    try {
      if (useProvider === 'anthropic' && this.anthropic) {
        return await this.generateWithAnthropic(prompt, { model, maxTokens, temperature, systemPrompt });
      } else if (useProvider === 'openai' && this.openai) {
        return await this.generateWithOpenAI(prompt, { model, maxTokens, temperature, systemPrompt });
      } else {
        throw new Error(`Provider ${useProvider} not available or not configured`);
      }
    } catch (error) {
      logger.error(`LLM generation error with ${useProvider}:`, error);
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }

  async generateWithAnthropic(prompt, options = {}) {
    const {
      model = 'claude-3-sonnet-20240229',
      maxTokens = 4000,
      temperature = 0.7,
      systemPrompt = null
    } = options;

    const messages = [{ role: 'user', content: prompt }];
    
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages
    });

    return {
      content: response.content[0].text,
      model: model,
      usage: response.usage,
      provider: 'anthropic'
    };
  }

  async generateWithOpenAI(prompt, options = {}) {
    const {
      model = 'gpt-4',
      maxTokens = 4000,
      temperature = 0.7,
      systemPrompt = null
    } = options;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    });

    return {
      content: response.choices[0].message.content,
      model: model,
      usage: response.usage,
      provider: 'openai'
    };
  }

  async generateResponse(prompt, options = {}) {
    logger.info('Generating LLM response', { 
      model: options.model || this.defaultModel, 
      promptLength: prompt.length 
    });

    const result = await this.generateResponseWithProvider(prompt, options);
    logger.info('LLM response generated successfully', { provider: result.provider });
    return result;
  }

  async analyzeCode(code, analysisType = 'general') {
    const systemPrompts = {
      security: 'You are a security expert. Analyze the provided code for security vulnerabilities, potential exploits, and security best practices.',
      performance: 'You are a performance optimization expert. Analyze the code for performance issues, bottlenecks, and optimization opportunities.',
      quality: 'You are a code quality expert. Review the code for maintainability, readability, design patterns, and best practices.',
      testing: 'You are a testing expert. Analyze the code and suggest comprehensive test cases, edge cases, and testing strategies.',
      general: 'You are a senior software engineer. Provide a comprehensive code review covering security, performance, quality, and testing aspects.',
      comprehensive: 'You are a senior software engineer and security expert. Provide a detailed analysis covering security vulnerabilities, performance issues, code quality, maintainability, and testing recommendations.'
    };

    const prompt = `Please analyze the following code:

\`\`\`
${code}
\`\`\`

Provide detailed analysis and recommendations.`;

    return await this.generateResponseWithProvider(prompt, {
      systemPrompt: systemPrompts[analysisType] || systemPrompts.general,
      maxTokens: 3000,
      ...options
    });
  }

  async generateTests(code, testFramework = 'jest', options = {}) {
    const systemPrompt = `You are a test automation expert. Generate comprehensive unit tests for the provided code using ${testFramework}. Include edge cases, error scenarios, and integration test suggestions.`;

    const prompt = `Generate comprehensive tests for this code:

\`\`\`
${code}
\`\`\`

Requirements:
- Use ${testFramework} framework
- Include unit tests with good coverage
- Test edge cases and error scenarios
- Provide clear test descriptions
- Include setup and teardown if needed`;

    return await this.generateResponseWithProvider(prompt, {
      systemPrompt,
      maxTokens: 3000,
      ...options
    });
  }

  async predictBuildOutcome(changes, buildHistory = [], dependencyAnalysis = null, options = {}) {
    const systemPrompt = 'You are a DevOps expert specializing in build prediction and CI/CD optimization. Analyze code changes and build history to predict build outcomes and suggest optimizations.';

    let prompt = `Analyze these code changes and predict the build outcome:

Changes:
${JSON.stringify(changes, null, 2)}

Recent build history:
${JSON.stringify(buildHistory.slice(-10), null, 2)}`;

    if (dependencyAnalysis) {
      prompt += `\n\nDependency Analysis:
${JSON.stringify(dependencyAnalysis, null, 2)}`;
    }

    prompt += `

Provide:
1. Build success probability (0-100%)
2. Potential failure points
3. Estimated build time
4. Resource requirements
5. Optimization suggestions
6. Confidence score (0.0-1.0)

Respond in JSON format.`;

    return await this.generateResponseWithProvider(prompt, {
      systemPrompt,
      maxTokens: 2000,
      ...options
    });
  }

  async analyzeVulnerabilities(repoContent, scanType = 'comprehensive', options = {}) {
    const systemPrompt = 'You are a cybersecurity expert specializing in code vulnerability analysis. Analyze the provided code for security vulnerabilities, potential exploits, and security best practices.';

    const contentSummary = repoContent.slice(0, 10).map(file => ({
      name: file.name,
      path: file.path,
      content: file.content.substring(0, 2000) // Limit content for analysis
    }));

    const prompt = `Perform a ${scanType} security vulnerability scan on this repository content:

${JSON.stringify(contentSummary, null, 2)}

Analyze for:
1. SQL injection vulnerabilities
2. Cross-site scripting (XSS) issues
3. Authentication and authorization flaws
4. Insecure data handling
5. Dependency vulnerabilities
6. Configuration security issues
7. Input validation problems
8. Cryptographic issues

Respond in JSON format with:
{
  "risk_level": "low|medium|high|critical",
  "vulnerabilities": [
    {
      "title": "Vulnerability name",
      "severity": "low|medium|high|critical",
      "description": "Description",
      "file": "affected file",
      "line": "line number if applicable",
      "recommendation": "how to fix"
    }
  ],
  "summary": "Overall security assessment"
}`;

    return await this.generateResponseWithProvider(prompt, {
      systemPrompt,
      maxTokens: 4000,
      ...options
    });
  }

  async analyzeIntent(userMessage, context = {}, options = {}) {
    const systemPrompt = 'You are an intent analysis expert for DevOps operations. Analyze user messages to determine their intent and extract relevant entities for automation workflows.';

    const prompt = `Analyze this user message and extract intent and entities:

Message: "${userMessage}"
Context: ${JSON.stringify(context)}

Return a JSON response with:
{
  "intent": "deploy|monitor|rollback|build|test|security|general",
  "confidence": 0.0-1.0,
  "entities": {
    "repository": "repo name if mentioned",
    "environment": "staging|production|development",
    "service": "service name if mentioned",
    "branch": "branch name if mentioned",
    "action": "specific action requested"
  },
  "parameters": {},
  "suggested_workflow": "workflow recommendation"
}`;

    return await this.generateResponseWithProvider(prompt, {
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.3,
      ...options
    });
  }

  async generateConversationalResponse(agentResponse, originalIntent, userMessage, options = {}) {
    const systemPrompt = 'You are a helpful DevOps assistant. Convert technical agent responses into natural, conversational language that is easy to understand while maintaining technical accuracy.';

    const prompt = `Convert this technical response into a conversational format:

Original user message: "${userMessage}"
Intent: ${originalIntent}
Agent response: ${JSON.stringify(agentResponse)}

Generate a natural, helpful response that:
1. Acknowledges the user's request
2. Explains what was done in simple terms
3. Provides key results or status
4. Suggests next steps if applicable
5. Maintains a friendly, professional tone`;

    return await this.generateResponseWithProvider(prompt, {
      systemPrompt,
      maxTokens: 1500,
      temperature: 0.8,
      ...options
    });
  }
}

module.exports = new LLMService();