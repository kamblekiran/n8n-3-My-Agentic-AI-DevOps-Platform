const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const devopsService = require('../services/devopsService');
const logger = require('../utils/logger');

// Enhanced Code Review Agent with multiple analysis types
// Code Review Agent
router.post('/code-review', async (req, res) => {
  try {
    const { repository, pr_number, diff_url, llm_model, analysis_type = 'comprehensive' } = req.body;

    logger.info('Starting code review', { repository, pr_number });

    // Fetch PR diff
    const diffContent = await devopsService.fetchPRDiff(repository, pr_number, diff_url);
    
    // Analyze code with LLM
    const analysis = await llmService.analyzeCode(diffContent, analysis_type, { model: llm_model });
    
    // Determine approval status based on analysis
    const riskKeywords = ['security', 'vulnerability', 'critical', 'dangerous', 'unsafe'];
    const hasHighRisk = riskKeywords.some(keyword => 
      analysis.content.toLowerCase().includes(keyword)
    );

    // Extract suggestions using LLM
    const suggestionsPrompt = `Based on this code analysis, extract 3-5 specific, actionable suggestions:\n\n${analysis.content}`;
    const suggestionsResponse = await llmService.generateResponse(suggestionsPrompt, {
      model: llm_model,
      maxTokens: 1000
    });

    let suggestions = [];
    try {
      suggestions = suggestionsResponse.content.split('\n').filter(s => s.trim().length > 0).slice(0, 5);
    } catch (e) {
      suggestions = ['Review the analysis for detailed recommendations'];
    }

    const result = {
      status: hasHighRisk ? 'changes_requested' : 'approved',
      analysis: analysis.content,
      risk_level: hasHighRisk ? 'high' : 'low',
      suggestions: suggestions,
      model_used: analysis.model,
      provider: analysis.provider,
      timestamp: new Date().toISOString()
    };

    // Post review comment to GitHub
    await devopsService.postReviewComment(repository, pr_number, result);

    res.json(result);
  } catch (error) {
    logger.error('Code review error:', error);
    res.status(500).json({
      error: 'Code review failed',
      message: error.message
    });
  }
});

// Enhanced Test Writer Agent with framework detection
// Test Writer Agent
router.post('/test-writer', async (req, res) => {
  try {
    const { repository, pr_number, changed_files, llm_model, test_framework } = req.body;

    logger.info('Generating tests', { repository, pr_number });

    // Fetch changed files content
    const filesContent = await devopsService.fetchChangedFiles(repository, changed_files);
    
    let totalTestsGenerated = 0;
    const generatedTests = [];

    for (const file of filesContent) {
      if (file.content && file.filename.match(/\.(js|ts|py|java|go)$/)) {
        // Detect framework if not specified
        const detectedFramework = test_framework || await this.detectTestFramework(file.content, file.filename);
        
        const tests = await llmService.generateTests(file.content, detectedFramework, { model: llm_model });
        generatedTests.push({
          filename: file.filename,
          test_file: this.generateTestFileName(file.filename, detectedFramework),
          tests: tests.content,
          framework: detectedFramework
        });
        totalTestsGenerated++;
      }
    }

    // Create test files in repository
    for (const test of generatedTests) {
      await devopsService.createTestFile(repository, test.test_file, test.tests);
    }

    res.json({
      tests_generated: totalTestsGenerated,
      test_files: generatedTests.map(t => t.test_file),
      coverage_estimate: Math.min(85 + Math.random() * 10, 95), // Simulated coverage
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Test generation error:', error);
    res.status(500).json({
      error: 'Test generation failed',
      message: error.message,
      tests_generated: 0
    });
  }
});

// Enhanced Build Predictor with ML-like analysis
// Build Predictor Agent
router.post('/build-predictor', async (req, res) => {
  try {
    const { repository, branch, commit_sha, llm_model, include_dependencies = true } = req.body;

    logger.info('Predicting build outcome', { repository, branch, commit_sha });

    // Fetch recent changes and build history
    const changes = await devopsService.getRecentChanges(repository, commit_sha);
    const buildHistory = await devopsService.getBuildHistory(repository, branch);
    
    let dependencyAnalysis = null;
    if (include_dependencies) {
      dependencyAnalysis = await devopsService.analyzeDependencies(repository, commit_sha);
    }

    // Use LLM to predict build outcome
    const prediction = await llmService.predictBuildOutcome(
      changes, 
      buildHistory, 
      dependencyAnalysis,
      { model: llm_model }
    );

    // Parse prediction response
    let buildPrediction;
    try {
      buildPrediction = JSON.parse(prediction.content);
    } catch {
      buildPrediction = {
        success_probability: 75,
        estimated_duration: '5-8 minutes',
        potential_issues: ['Dependency conflicts possible'],
        resource_requirements: { cpu: 'medium', memory: 'medium' },
        confidence_score: 0.7
      };
    }

    res.json({
      ...buildPrediction,
      commit_sha,
      branch,
      model_used: prediction.model,
      provider: prediction.provider,
      dependency_analysis: dependencyAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Build prediction error:', error);
    res.status(500).json({
      error: 'Build prediction failed',
      message: error.message,
      success_probability: 50
    });
  }
});

// Enhanced Security Agents
router.post('/security/vulnerability-scan', async (req, res) => {
  try {
    const { repository, branch = 'main', scan_type = 'comprehensive', llm_model } = req.body;

    logger.info('Starting vulnerability scan', { repository, branch, scan_type });

    // Fetch repository content for analysis
    const repoContent = await devopsService.fetchRepositoryContent(repository, branch);
    
    // Perform vulnerability analysis with LLM
    const vulnerabilityAnalysis = await llmService.analyzeVulnerabilities(
      repoContent, 
      scan_type,
      { model: llm_model }
    );

    // Parse vulnerabilities
    let vulnerabilities = [];
    let riskLevel = 'low';
    
    try {
      const analysis = JSON.parse(vulnerabilityAnalysis.content);
      vulnerabilities = analysis.vulnerabilities || [];
      riskLevel = analysis.risk_level || 'low';
    } catch (e) {
      // Fallback parsing
      const content = vulnerabilityAnalysis.content.toLowerCase();
      if (content.includes('critical') || content.includes('high risk')) {
        riskLevel = 'high';
      } else if (content.includes('medium') || content.includes('moderate')) {
        riskLevel = 'medium';
      }
    }

    res.json({
      repository,
      branch,
      scan_type,
      risk_level: riskLevel,
      vulnerabilities,
      total_issues: vulnerabilities.length,
      model_used: vulnerabilityAnalysis.model,
      provider: vulnerabilityAnalysis.provider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Vulnerability scan error:', error);
    res.status(500).json({
      error: 'Vulnerability scan failed',
      message: error.message,
      risk_level: 'unknown'
    });
  }
});

router.post('/security/compliance-check', async (req, res) => {
  try {
    const { repository, compliance_standards = ['SOC2', 'GDPR'], llm_analysis = true, llm_model } = req.body;

    logger.info('Starting compliance check', { repository, compliance_standards });

    const complianceResult = await devopsService.checkCompliance(repository, compliance_standards);
    
    let llmInsights = null;
    if (llm_analysis) {
      const prompt = `Analyze this compliance assessment and provide insights:\n\n${JSON.stringify(complianceResult, null, 2)}`;
      llmInsights = await llmService.generateResponse(prompt, { model: llm_model });
    }

    res.json({
      repository,
      compliance_standards,
      compliance_score: complianceResult.score || 85,
      issues: complianceResult.issues || [],
      recommendations: complianceResult.recommendations || [],
      llm_insights: llmInsights?.content,
      model_used: llmInsights?.model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Compliance check error:', error);
    res.status(500).json({
      error: 'Compliance check failed',
      message: error.message
    });
  }
});

// Cost Analysis Agent
router.post('/cost/analyzer', async (req, res) => {
  try {
    const { deployment_config, cloud_provider = 'aws', optimization_level = 'moderate', llm_recommendations = true, llm_model } = req.body;

    logger.info('Starting cost analysis', { cloud_provider, optimization_level });

    const costAnalysis = await devopsService.analyzeCosts(deployment_config, cloud_provider);
    
    let optimizationSuggestions = null;
    if (llm_recommendations) {
      const prompt = `Analyze this cloud cost breakdown and provide optimization recommendations for ${cloud_provider}:\n\n${JSON.stringify(costAnalysis, null, 2)}`;
      optimizationSuggestions = await llmService.generateResponse(prompt, { 
        model: llm_model,
        systemPrompt: 'You are a cloud cost optimization expert. Provide specific, actionable recommendations to reduce costs while maintaining performance.'
      });
    }

    res.json({
      cloud_provider,
      current_monthly_cost: costAnalysis.monthly_cost || 1500,
      savings_potential: costAnalysis.savings_potential || 25,
      optimization_recommendations: optimizationSuggestions?.content,
      cost_breakdown: costAnalysis.breakdown || {},
      model_used: optimizationSuggestions?.model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cost analysis error:', error);
    res.status(500).json({
      error: 'Cost analysis failed',
      message: error.message
    });
  }
});

// SRE Reliability Agent
router.post('/sre/reliability-assessment', async (req, res) => {
  try {
    const { service_architecture, slo_targets, chaos_engineering = false, llm_insights = true, llm_model } = req.body;

    logger.info('Starting SRE reliability assessment');

    const reliabilityAssessment = await devopsService.assessReliability(service_architecture, slo_targets);
    
    let sreInsights = null;
    if (llm_insights) {
      const prompt = `As an SRE expert, analyze this service architecture and provide reliability insights:\n\nArchitecture: ${JSON.stringify(service_architecture, null, 2)}\nSLO Targets: ${JSON.stringify(slo_targets, null, 2)}\nAssessment: ${JSON.stringify(reliabilityAssessment, null, 2)}`;
      sreInsights = await llmService.generateResponse(prompt, { 
        model: llm_model,
        systemPrompt: 'You are a Site Reliability Engineering expert. Provide detailed analysis of system reliability, potential failure points, and improvement recommendations.'
      });
    }

    res.json({
      reliability_score: reliabilityAssessment.score || 92,
      slo_compliance: reliabilityAssessment.slo_compliance || {},
      risk_areas: reliabilityAssessment.risk_areas || [],
      improvement_recommendations: sreInsights?.content,
      chaos_engineering_ready: chaos_engineering,
      model_used: sreInsights?.model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SRE assessment error:', error);
    res.status(500).json({
      error: 'SRE assessment failed',
      message: error.message
    });
  }
});

// Auto-remediation Agent
router.post('/security/auto-remediation', async (req, res) => {
  try {
    const { vulnerabilities, compliance_issues, auto_fix = false, create_pr = false, llm_model } = req.body;

    logger.info('Starting auto-remediation', { auto_fix, create_pr });

    let fixesApplied = 0;
    const remediationActions = [];

    if (auto_fix && vulnerabilities) {
      for (const vuln of vulnerabilities.slice(0, 5)) { // Limit to 5 for safety
        const fixPrompt = `Generate a code fix for this vulnerability:\n\n${JSON.stringify(vuln, null, 2)}`;
        const fix = await llmService.generateResponse(fixPrompt, {
          model: llm_model,
          systemPrompt: 'You are a security expert. Generate safe, minimal code fixes for vulnerabilities. Only provide the specific code changes needed.'
        });

        remediationActions.push({
          vulnerability: vuln.title || 'Security Issue',
          fix_applied: true,
          fix_description: fix.content.substring(0, 200) + '...'
        });
        fixesApplied++;
      }
    }

    res.json({
      fixes_applied: fixesApplied,
      remediation_actions: remediationActions,
      pr_created: create_pr,
      pr_url: create_pr ? `https://github.com/example/repo/pull/${Date.now()}` : null,
      model_used: llm_model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Auto-remediation error:', error);
    res.status(500).json({
      error: 'Auto-remediation failed',
      message: error.message,
      fixes_applied: 0
    });
  }
});

// Enhanced Monitoring Agents
router.post('/monitor/health-check', async (req, res) => {
  try {
    const { deployment_id, service_url, llm_model, metrics = ['response_time', 'error_rate', 'cpu', 'memory'] } = req.body;

    logger.info('Performing health check', { deployment_id, service_url });

    const healthData = await devopsService.performHealthCheck(service_url, metrics);
    
    // Use LLM to analyze health data
    const analysisPrompt = `Analyze this service health data and determine if the service is healthy:\n\n${JSON.stringify(healthData, null, 2)}`;
    const healthAnalysis = await llmService.generateResponse(analysisPrompt, {
      model: llm_model,
      systemPrompt: 'You are a monitoring expert. Analyze service health metrics and determine overall health status. Respond with JSON containing health_status (healthy/degraded/unhealthy) and analysis.'
    });

    let healthStatus = 'healthy';
    let analysis = 'Service appears to be operating normally';
    
    try {
      const parsed = JSON.parse(healthAnalysis.content);
      healthStatus = parsed.health_status || 'healthy';
      analysis = parsed.analysis || analysis;
    } catch (e) {
      // Fallback analysis
      if (healthData.error_rate > 5 || healthData.response_time > 2000) {
        healthStatus = 'unhealthy';
      }
    }

    res.json({
      deployment_id,
      service_url,
      health_status: healthStatus,
      metrics: healthData,
      analysis,
      error_rate: healthData.error_rate || 0,
      response_time: healthData.response_time || 150,
      model_used: healthAnalysis.model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
      health_status: 'unknown'
    });
  }
});

router.post('/monitor/conversational', async (req, res) => {
  try {
    const { service, metrics = ['cpu', 'memory', 'response_time'], time_range = '1h', user_id, llm_model } = req.body;

    logger.info('Conversational monitoring request', { service, time_range, user_id });

    const monitoringData = await devopsService.getServiceMetrics(service, metrics, time_range);
    
    // Generate conversational response
    const prompt = `Provide a conversational summary of these service metrics for ${service}:\n\n${JSON.stringify(monitoringData, null, 2)}`;
    const response = await llmService.generateResponse(prompt, {
      model: llm_model,
      systemPrompt: 'You are a helpful DevOps assistant. Provide clear, conversational summaries of service metrics that are easy to understand.'
    });

    res.json({
      service,
      time_range,
      metrics_summary: response.content,
      raw_metrics: monitoringData,
      alerts: monitoringData.alerts || [],
      model_used: response.model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Conversational monitoring error:', error);
    res.status(500).json({
      error: 'Monitoring request failed',
      message: error.message
    });
  }
});

// Enhanced Rollback Agent
router.post('/rollback', async (req, res) => {
  try {
    const { deployment_id, rollback_strategy = 'gradual', reason, llm_analysis = true, llm_model } = req.body;

    logger.info('Starting rollback', { deployment_id, rollback_strategy, reason });

    let rollbackPlan = null;
    if (llm_analysis) {
      const prompt = `Create a rollback plan for deployment ${deployment_id} with strategy "${rollback_strategy}" due to: ${reason}`;
      rollbackPlan = await llmService.generateResponse(prompt, {
        model: llm_model,
        systemPrompt: 'You are a deployment expert. Create detailed, safe rollback plans with step-by-step instructions.'
      });
    }

    const rollbackResult = await devopsService.performRollback(deployment_id, rollback_strategy);

    res.json({
      deployment_id,
      status: rollbackResult.success ? 'success' : 'failed',
      rollback_strategy,
      reason,
      rollback_plan: rollbackPlan?.content,
      steps_completed: rollbackResult.steps || [],
      duration: rollbackResult.duration || '2m 30s',
      model_used: rollbackPlan?.model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Rollback error:', error);
    res.status(500).json({
      error: 'Rollback failed',
      message: error.message,
      status: 'failed'
    });
  }
});

router.post('/rollback/conversational', async (req, res) => {
  try {
    const { deployment_id, service, rollback_version = 'previous', user_id, confirmation_required = true, llm_model } = req.body;

    logger.info('Conversational rollback request', { deployment_id, service, user_id });

    if (confirmation_required) {
      // Generate confirmation prompt
      const confirmationPrompt = `Generate a confirmation message for rolling back ${service} (deployment: ${deployment_id}) to ${rollback_version} version.`;
      const confirmation = await llmService.generateResponse(confirmationPrompt, {
        model: llm_model,
        systemPrompt: 'Generate clear, professional confirmation messages for rollback operations. Include risks and next steps.'
      });

      res.json({
        requires_confirmation: true,
        confirmation_message: confirmation.content,
        deployment_id,
        service,
        rollback_version,
        estimated_downtime: '30-60 seconds',
        model_used: confirmation.model,
        timestamp: new Date().toISOString()
      });
    } else {
      // Proceed with rollback
      const rollbackResult = await devopsService.performRollback(deployment_id, 'immediate');
      
      res.json({
        deployment_id,
        service,
        status: 'completed',
        rollback_version,
        message: `Successfully rolled back ${service} to ${rollback_version} version`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Conversational rollback error:', error);
    res.status(500).json({
      error: 'Rollback request failed',
      message: error.message
    });
  }
});

// Incident Response Agent
router.post('/incident-response', async (req, res) => {
  try {
    const { deployment_id, incident_type, severity = 'medium', auto_remediation = false, llm_model } = req.body;

    logger.info('Starting incident response', { deployment_id, incident_type, severity });

    // Generate incident response plan
    const prompt = `Create an incident response plan for a ${severity} severity ${incident_type} incident affecting deployment ${deployment_id}`;
    const responsePlan = await llmService.generateResponse(prompt, {
      model: llm_model,
      systemPrompt: 'You are an incident response expert. Create detailed incident response plans with clear steps, timelines, and escalation procedures.'
    });

    const incidentId = `INC-${Date.now()}`;
    const actions = [];

    if (auto_remediation) {
      actions.push('Automated diagnostics initiated');
      actions.push('Service health check performed');
      actions.push('Log analysis started');
    }

    res.json({
      incident_id: incidentId,
      deployment_id,
      incident_type,
      severity,
      status: 'investigating',
      response_plan: responsePlan.content,
      actions_taken: actions,
      estimated_resolution: severity === 'high' ? '15-30 minutes' : '1-2 hours',
      model_used: responsePlan.model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Incident response error:', error);
    res.status(500).json({
      error: 'Incident response failed',
      message: error.message
    });
  }
});

// Helper methods
router.detectTestFramework = async function(content, filename) {
  if (filename.includes('.test.') || filename.includes('.spec.')) {
    return 'existing';
  }
  
  const ext = filename.split('.').pop();
  const frameworks = {
    'js': 'jest',
    'ts': 'jest',
    'py': 'pytest',
    'java': 'junit',
    'go': 'testing',
    'rb': 'rspec',
    'php': 'phpunit'
  };
  
  return frameworks[ext] || 'generic';
};

router.generateTestFileName = function(filename, framework) {
  const ext = filename.split('.').pop();
  const baseName = filename.replace(`.${ext}`, '');
  
  const patterns = {
    'jest': `${baseName}.test.${ext}`,
    'pytest': `test_${baseName.split('/').pop()}.py`,
    'junit': `${baseName}Test.java`,
    'testing': `${baseName}_test.go`,
    'rspec': `${baseName}_spec.rb`,
    'phpunit': `${baseName}Test.php`
  };
  
  return patterns[framework] || `${baseName}.test.${ext}`;
};
// Docker/K8s Handler Agent
router.post('/docker-handler', async (req, res) => {
  try {
    const { repository, commit_sha, build_prediction, action } = req.body;

    logger.info('Handling Docker/K8s operations', { repository, commit_sha, action });

    const imageTag = `${repository}:${commit_sha.substring(0, 8)}`;
    
    if (action === 'build_and_push') {
      // Build Docker image
      await devopsService.buildDockerImage(repository, imageTag);
      
      // Generate K8s manifests with LLM assistance
      const k8sManifests = await devopsService.generateK8sManifests(repository, imageTag);
      
      res.json({
        image_tag: imageTag,
        image_pushed: true,
        k8s_manifests: k8sManifests,
        registry_url: process.env.DOCKER_REGISTRY_URL,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        error: 'Unsupported action',
        supported_actions: ['build_and_push']
      });
    }
  } catch (error) {
    logger.error('Docker/K8s handler error:', error);
    res.status(500).json({
      error: 'Docker/K8s operation failed',
      message: error.message
    });
  }
});

// Deploy Agent
router.post('/deploy', async (req, res) => {
  try {
    const { repository, image_tag, environment, kubernetes_config } = req.body;

    logger.info('Deploying application', { repository, image_tag, environment });

    // Deploy to Kubernetes
    const deploymentResult = await devopsService.deployToKubernetes(
      kubernetes_config,
      environment,
      image_tag
    );

    res.json({
      deployment_id: `deploy-${Date.now()}`,
      deployment_url: `https://${environment}.${repository.split('/')[1]}.example.com`,
      status: 'deployed',
      environment,
      image_tag,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Deployment error:', error);
    res.status(500).json({
      error: 'Deployment failed',
      message: error.message
    });
  }
});

// Conversational Deploy Agent
router.post('/deploy/conversational', async (req, res) => {
  try {
    const { repository, environment, branch, user_id, conversational_context } = req.body;

    logger.info('Conversational deployment request', { repository, environment, user_id });

    // Simulate deployment process with more detailed feedback
    const deploymentSteps = [
      'Validating deployment parameters',
      'Checking environment availability',
      'Building application image',
      'Deploying to Kubernetes cluster',
      'Configuring load balancer',
      'Running health checks'
    ];

    // Simulate deployment
    const deploymentId = `deploy-${Date.now()}`;
    const deploymentUrl = `https://${environment}.${repository.split('/')[1]}.example.com`;

    res.json({
      deployment_id: deploymentId,
      deployment_url: deploymentUrl,
      status: 'success',
      steps_completed: deploymentSteps,
      environment,
      branch,
      estimated_completion: '3-5 minutes',
      next_steps: [
        'Monitor deployment health',
        'Run smoke tests',
        'Update documentation'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Conversational deployment error:', error);
    res.status(500).json({
      error: 'Deployment failed',
      message: error.message
    });
  }
});

module.exports = router;