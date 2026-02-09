#!/usr/bin/env node
/**
 * Fast Quality Check Script for Solana Programs Database
 * 
 * This script checks programs in parallel with rate limiting
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DATA_FILE = path.join(__dirname, '..', 'data', 'github-solana-programs.json');
const REPORT_FILE = path.join(__dirname, '..', 'data', 'quality-report.json');
const GITHUB_API_BASE = 'https://api.github.com';

// Code file extensions the app looks for
const CODE_EXTENSIONS = ['.rs', '.ts', '.tsx', '.js', '.jsx', '.sol', '.py', '.go', '.c', '.cpp', '.h'];

// Results tracking
const results = {
  totalProgramsChecked: 0,
  programsWorkingCorrectly: 0,
  programsWithIssues: [],
  issueCategories: {
    repoNotFound: 0,
    repoPrivate: 0,
    repoArchived: 0,
    noCodeFilesFound: 0,
    zipDownloadIssue: 0,
    rateLimited: 0,
    otherError: 0
  },
  recommendations: []
};

// Batch processing
const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 2000;

// Utility: Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check a single repo (simplified version)
async function checkRepo(program) {
  const { fullName, owner, name, url, stars, language, updated } = program;
  
  try {
    // Check repo existence via GitHub API
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${name}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Solana-Programs-Quality-Check'
      }
    });
    
    const issue = {
      fullName,
      url,
      stars,
      language,
      updated,
      issues: [],
      severity: 'none'
    };
    
    if (response.status === 404) {
      issue.issues.push('Repository not found (404) - may have been deleted or renamed');
      issue.severity = 'high';
      results.issueCategories.repoNotFound++;
      return issue;
    }
    
    if (response.status === 403) {
      issue.issues.push('GitHub API rate limit exceeded or access forbidden');
      issue.severity = 'medium';
      results.issueCategories.rateLimited++;
      return issue;
    }
    
    if (!response.ok) {
      issue.issues.push(`GitHub API error: ${response.status}`);
      issue.severity = 'medium';
      results.issueCategories.otherError++;
      return issue;
    }
    
    const data = await response.json();
    
    if (data.private) {
      issue.issues.push('Repository is now private');
      issue.severity = 'high';
      results.issueCategories.repoPrivate++;
      return issue;
    }
    
    if (data.archived) {
      issue.issues.push('Repository is archived (read-only)');
      issue.severity = 'low';
      results.issueCategories.repoArchived++;
    }
    
    // Check for code files by looking at language
    const hasRecognizableCode = data.language && [
      'Rust', 'TypeScript', 'JavaScript', 'Solidity', 'Python', 'Go', 'C', 'C++'
    ].includes(data.language);
    
    if (!hasRecognizableCode && !data.archived) {
      // Might still have code in other directories - flag for manual review
      issue.issues.push(`Primary language is "${data.language}" - may not contain recognizable Solana program code`);
      issue.severity = 'low';
      results.issueCategories.noCodeFilesFound++;
    }
    
    // Check default branch for ZIP download
    const defaultBranch = data.default_branch || 'main';
    const zipUrl = `https://github.com/${owner}/${name}/archive/refs/heads/${defaultBranch}.zip`;
    
    try {
      const zipResponse = await fetch(zipUrl, { method: 'HEAD' });
      if (!zipResponse.ok) {
        issue.issues.push(`ZIP download not working for branch: ${defaultBranch}`);
        if (issue.severity === 'none') issue.severity = 'low';
        results.issueCategories.zipDownloadIssue++;
      } else {
        issue.zipWorks = true;
        issue.defaultBranch = defaultBranch;
      }
    } catch (e) {
      issue.issues.push(`Could not verify ZIP download: ${e.message}`);
      if (issue.severity === 'none') issue.severity = 'low';
    }
    
    issue.repoStars = data.stargazers_count;
    issue.repoLanguage = data.language;
    issue.lastUpdated = data.updated_at;
    
    return issue;
    
  } catch (error) {
    return {
      fullName,
      url,
      issues: [`Check failed: ${error.message}`],
      severity: 'medium'
    };
  }
}

// Process a batch of programs
async function processBatch(programs) {
  const promises = programs.map(program => checkRepo(program));
  return await Promise.all(promises);
}

// Main function
async function main() {
  console.log('=== Solana Programs Quality Check (Fast Mode) ===\n');
  
  // Load programs data
  console.log(`Loading programs from: ${DATA_FILE}`);
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const programs = data.repos || [];
  
  console.log(`Total programs to check: ${programs.length}\n`);
  
  // Use full dataset
  const programsToCheck = programs;
  results.totalProgramsChecked = programsToCheck.length;
  
  // Process in batches
  for (let i = 0; i < programsToCheck.length; i += BATCH_SIZE) {
    const batch = programsToCheck.slice(i, i + BATCH_SIZE);
    console.log(`\n[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(programsToCheck.length / BATCH_SIZE)}] Checking ${batch.length} repos...`);
    
    const batchResults = await processBatch(batch);
    
    for (const result of batchResults) {
      if (result.issues.length > 0) {
        results.programsWithIssues.push(result);
        console.log(`  ✗ ${result.fullName}: ${result.issues[0]}`);
      } else {
        results.programsWorkingCorrectly++;
        console.log(`  ✓ ${result.fullName}`);
      }
    }
    
    // Progress
    console.log(`  Progress: ${Math.min(i + BATCH_SIZE, programsToCheck.length)}/${programsToCheck.length} (${((Math.min(i + BATCH_SIZE, programsToCheck.length) / programsToCheck.length) * 100).toFixed(1)}%)`);
    
    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < programsToCheck.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  // Generate recommendations
  results.recommendations = [
    ...(results.issueCategories.repoNotFound > 0 ? [{
      category: 'Deleted/Renamed Repositories',
      count: results.issueCategories.repoNotFound,
      action: 'Remove from database or update with new URL',
      priority: 'high'
    }] : []),
    ...(results.issueCategories.repoPrivate > 0 ? [{
      category: 'Private Repositories',
      count: results.issueCategories.repoPrivate,
      action: 'Remove from database - no longer publicly accessible',
      priority: 'high'
    }] : []),
    ...(results.issueCategories.noCodeFilesFound > 0 ? [{
      category: 'No Recognizable Code',
      count: results.issueCategories.noCodeFilesFound,
      action: 'Review - may need scanner updates for non-standard code patterns',
      priority: 'medium'
    }] : []),
    ...(results.issueCategories.zipDownloadIssue > 0 ? [{
      category: 'ZIP Download Issues',
      count: results.issueCategories.zipDownloadIssue,
      action: 'Update default branch detection logic',
      priority: 'low'
    }] : []),
    ...(results.issueCategories.repoArchived > 0 ? [{
      category: 'Archived Repositories',
      count: results.issueCategories.repoArchived,
      action: 'Consider marking as archived in UI',
      priority: 'low'
    }] : [])
  ];
  
  // Summary statistics
  results.summary = {
    workingPercentage: ((results.programsWorkingCorrectly / results.totalProgramsChecked) * 100).toFixed(2),
    issuePercentage: ((results.programsWithIssues.length / results.totalProgramsChecked) * 100).toFixed(2),
    highSeverityIssues: results.programsWithIssues.filter(p => p.severity === 'high').length,
    mediumSeverityIssues: results.programsWithIssues.filter(p => p.severity === 'medium').length,
    lowSeverityIssues: results.programsWithIssues.filter(p => p.severity === 'low').length
  };
  
  // Write report
  fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n\n=== QUALITY CHECK COMPLETE ===');
  console.log(`\nTotal programs checked: ${results.totalProgramsChecked}`);
  console.log(`Working correctly: ${results.programsWorkingCorrectly} (${results.summary.workingPercentage}%)`);
  console.log(`With issues: ${results.programsWithIssues.length} (${results.summary.issuePercentage}%)`);
  console.log(`\nIssue breakdown:`);
  console.log(`  - Repo not found: ${results.issueCategories.repoNotFound}`);
  console.log(`  - Repo private: ${results.issueCategories.repoPrivate}`);
  console.log(`  - Repo archived: ${results.issueCategories.repoArchived}`);
  console.log(`  - No recognizable code: ${results.issueCategories.noCodeFilesFound}`);
  console.log(`  - ZIP download issues: ${results.issueCategories.zipDownloadIssue}`);
  console.log(`  - Rate limited: ${results.issueCategories.rateLimited}`);
  console.log(`  - Other errors: ${results.issueCategories.otherError}`);
  console.log(`\nSeverity:`);
  console.log(`  - High: ${results.summary.highSeverityIssues}`);
  console.log(`  - Medium: ${results.summary.mediumSeverityIssues}`);
  console.log(`  - Low: ${results.summary.lowSeverityIssues}`);
  console.log(`\nRecommendations:`);
  results.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec.category} (${rec.count} repos) - ${rec.action}`);
  });
  console.log(`\nFull report saved to: ${REPORT_FILE}`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
