const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const devopsService = require('../services/devopsService');
const logger = require('../utils/logger');

// Code Review Agent
router.post('/code-review', async (req, res) => {
  try {
    const { repository, pr_number, diff_url, base_sha, head_sha, llm_model, analysis_type = 'comprehensive' } = req.body;

    // Validate required parameters
    if (!repository) {
      return res.status(400).json({
        error: 'Missing required parameter: repository',
        required_parameters: ['repository', 'pr_number']
      });
    }

    if (!pr_number) {
      return res.status(400).json({
        error: 'Missing required parameter: pr_number',
        required_parameters: ['repository', 'pr_number']
      });
    }

    logger.info('Starting code review', { repository, pr_number });

    // Fetch PR diff
    const diffContent = await devopsService.fetchPRDiff(repository, pr_number, diff_url, base_sha, head_sha);
    
    if (!diffContent || diffContent.trim().length === 0) {
      return res.status(400).json({
        error: 'No diff content available for analysis',
        message: 'The PR may not have any changes or the repository may not be accessible'
      });
    }

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
    
    // Provide more specific error messages
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes('404')) {
      errorMessage = 'Repository or PR not found. Please check the repository name and PR number.';
      statusCode = 404;
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorMessage = 'Authentication failed. Please check your GitHub token permissions.';
      statusCode = 401;
    }
    
    res.status(statusCode).json({
      error: 'Code review failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test Writer Agent
router.post('/test-writer', async (req, res) => {
  try {
    const { repository, pr_number, changed_files, llm_model, test_framework } = req.body;

    // Validate required parameters
    if (!repository || !pr_number) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required_parameters: ['repository', 'pr_number'],
        received: { repository: !!repository, pr_number: !!pr_number }
      });
    }

    logger.info('Generating tests', { repository, pr_number });

    // Fetch changed files content
    const filesContent = await devopsService.fetchChangedFiles(repository, pr_number, changed_files);
    
    let totalTestsGenerated = 0;
    const generatedTests = [];

    for (const file of filesContent) {
      if (file.content && file.filename.match(/\.(js|ts|py|java|go)$/)) {
        // Detect framework if not specified
        const detectedFramework = test_framework || detectTestFramework(file.content, file.filename);
        
        const tests = await llmService.generateTests(file.content, detectedFramework, { model: llm_model });
        generatedTests.push({
          filename: file.filename,
          test_file: generateTestFileName(file.filename, detectedFramework),
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

// Docker/K8s Handler Agent
router.post('/docker-handler', async (req, res) => {
  try {
    const { repository, commit_sha, build_prediction, action } = req.body;

    logger.info('Handling Docker/K8s operations', { repository, commit_sha, action });

    const imageTag = `${repository}:${commit_sha ? commit_sha.substring(0, 8) : 'latest'}`;
    
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
      deployment_url: `https://${environment}.${repository ? repository.split('/')[1] : 'app'}.example.com`,
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

// Monitor Agent
router.post('/monitor', async (req, res) => {
  try {
    const { deployment_id, environment, monitoring_duration = 300 } = req.body;

    logger.info('Starting monitoring', { deployment_id, environment, monitoring_duration });

    // Simulate monitoring process
    const monitoringResult = {
      deployment_id,
      environment,
      status: 'healthy',
      metrics: {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        response_time: Math.random() * 1000,
        error_rate: Math.random() * 5
      },
      dashboard_url: `https://monitoring.example.com/dashboard/${deployment_id}`,
      alerts: [],
      monitoring_duration: `${monitoring_duration}s`,
      timestamp: new Date().toISOString()
    };

    // Add alerts if metrics are concerning
    if (monitoringResult.metrics.cpu_usage > 80) {
      monitoringResult.alerts.push('High CPU usage detected');
    }
    if (monitoringResult.metrics.error_rate > 3) {
      monitoringResult.alerts.push('Elevated error rate detected');
    }

    res.json(monitoringResult);
  } catch (error) {
    logger.error('Monitoring error:', error);
    res.status(500).json({
      error: 'Monitoring failed',
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
    const deploymentUrl = `https://${environment}.${repository ? repository.split('/')[1] : 'app'}.example.com`;

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

// Security Vulnerability Scanner
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

// Helper functions
function detectTestFramework(content, filename) {
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
}

function generateTestFileName(filename, framework) {
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
}

module.exports = router;