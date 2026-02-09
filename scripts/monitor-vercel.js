#!/usr/bin/env node
/**
 * Monitor Vercel Deployments
 * Polls Vercel API for build status and reports errors
 */

const DEPLOY_CHECK_INTERVAL = 30000; // 30 seconds
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'sol-programs-clean';

async function getLatestDeployment() {
  try {
    const response = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1`, {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.deployments?.[0] || null;
  } catch (error) {
    console.error('Error fetching deployments:', error.message);
    return null;
  }
}

async function getDeploymentLogs(deploymentId) {
  try {
    const response = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events`, {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('Error fetching logs:', error.message);
    return [];
  }
}

async function monitorDeployment() {
  console.log('🔍 Monitoring Vercel deployments...\n');
  
  const deployment = await getLatestDeployment();
  
  if (!deployment) {
    console.log('❌ No deployments found');
    return;
  }
  
  console.log(`📦 Latest Deployment:`);
  console.log(`   ID: ${deployment.uid}`);
  console.log(`   State: ${deployment.state}`);
  console.log(`   URL: ${deployment.url}`);
  console.log(`   Created: ${new Date(deployment.created).toLocaleString()}`);
  console.log(`   Target: ${deployment.target}\n`);
  
  if (deployment.state === 'ERROR') {
    console.log('❌ Deployment failed! Fetching error logs...\n');
    const logs = await getDeploymentLogs(deployment.uid);
    
    const errorLogs = logs.filter(log => 
      log.type === 'error' || 
      log.text?.toLowerCase().includes('error') ||
      log.text?.toLowerCase().includes('failed')
    );
    
    if (errorLogs.length > 0) {
      console.log('🚨 Error Logs:');
      errorLogs.forEach(log => {
        console.log(`   [${new Date(log.created).toLocaleTimeString()}] ${log.text}`);
      });
    } else {
      console.log('⚠️  No specific error logs found');
    }
    
    return { status: 'ERROR', deployment, logs: errorLogs };
  }
  
  if (deployment.state === 'READY') {
    console.log('✅ Deployment successful!');
    return { status: 'READY', deployment };
  }
  
  if (deployment.state === 'BUILDING' || deployment.state === 'QUEUED') {
    console.log('⏳ Deployment in progress...');
    return { status: 'IN_PROGRESS', deployment };
  }
  
  return { status: deployment.state, deployment };
}

// Continuous monitoring
async function startMonitoring() {
  console.log('🚀 Starting continuous Vercel deployment monitoring\n');
  
  let lastStatus = null;
  let lastDeploymentId = null;
  
  while (true) {
    try {
      const result = await monitorDeployment();
      
      // Alert on state changes
      if (result.deployment.uid !== lastDeploymentId || result.status !== lastStatus) {
        if (result.status === 'ERROR') {
          console.log('\n🔔 ALERT: Deployment failed!');
          // Here you could send Telegram notification
        } else if (result.status === 'READY') {
          console.log('\n🔔 Deployment ready:', result.deployment.url);
        }
        
        lastStatus = result.status;
        lastDeploymentId = result.deployment.uid;
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, DEPLOY_CHECK_INTERVAL));
    } catch (error) {
      console.error('Monitor error:', error);
      await new Promise(resolve => setTimeout(resolve, DEPLOY_CHECK_INTERVAL));
    }
  }
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'once') {
    monitorDeployment().then(() => process.exit(0));
  } else {
    startMonitoring();
  }
}

module.exports = { monitorDeployment, startMonitoring };
