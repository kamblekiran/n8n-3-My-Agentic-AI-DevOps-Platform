const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const logger = require('../utils/logger');

// Intent analysis endpoint
router.post('/intent-analysis', async (req, res) => {
  try {
    const { user_message, context, llm_model } = req.body;

    if (!user_message) {
      return res.status(400).json({
        error: 'user_message is required'
      });
    }

    const result = await llmService.analyzeIntent(user_message, context);
    
    // Parse JSON response from LLM
    let parsedResult;
    try {
      parsedResult = JSON.parse(result.content);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      parsedResult = {
        intent: 'general',
        confidence: 0.5,
        entities: {},
        parameters: {},
        suggested_workflow: 'manual_review',
        raw_response: result.content
      };
    }

    res.json({
      ...parsedResult,
      model_used: result.model,
      usage: result.usage
    });
  } catch (error) {
    logger.error('Intent analysis error:', error);
    res.status(500).json({
      error: 'Intent analysis failed',
      message: error.message
    });
  }
});

// Response generation endpoint
router.post('/response-generation', async (req, res) => {
  try {
    const { agent_response, original_intent, user_message, response_style, llm_model } = req.body;

    if (!agent_response || !user_message) {
      return res.status(400).json({
        error: 'agent_response and user_message are required'
      });
    }

    const result = await llmService.generateConversationalResponse(
      agent_response,
      original_intent,
      user_message
    );

    res.json({
      generated_response: result.content,
      model_used: result.model,
      usage: result.usage,
      agent_type: 'conversational_llm',
      execution_time: Date.now(),
      suggested_actions: []
    });
  } catch (error) {
    logger.error('Response generation error:', error);
    res.status(500).json({
      error: 'Response generation failed',
      message: error.message
    });
  }
});

// Security report generation
router.post('/security-report', async (req, res) => {
  try {
    const { vulnerability_data, compliance_data, cost_analysis, sre_assessment, report_format } = req.body;

    const systemPrompt = 'You are a cybersecurity expert generating executive security reports. Create comprehensive, actionable reports that are suitable for both technical and executive audiences.';

    const prompt = `Generate a comprehensive security report based on this data:

Vulnerability Assessment:
${JSON.stringify(vulnerability_data, null, 2)}

Compliance Analysis:
${JSON.stringify(compliance_data, null, 2)}

Cost Analysis:
${JSON.stringify(cost_analysis, null, 2)}

SRE Assessment:
${JSON.stringify(sre_assessment, null, 2)}

Format: ${report_format || 'executive_summary'}

Include:
1. Executive Summary
2. Risk Assessment
3. Key Findings
4. Recommendations
5. Action Items with priorities
6. Cost implications
7. Compliance status`;

    const result = await llmService.generateResponse(prompt, {
      systemPrompt,
      maxTokens: 4000
    });

    res.json({
      report_content: result.content,
      report_url: `/reports/security-${Date.now()}.html`,
      key_recommendations: [
        'Immediate security patches required',
        'Compliance gaps identified',
        'Cost optimization opportunities available'
      ],
      model_used: result.model,
      usage: result.usage
    });
  } catch (error) {
    logger.error('Security report generation error:', error);
    res.status(500).json({
      error: 'Security report generation failed',
      message: error.message
    });
  }
});

module.exports = router;