#!/usr/bin/env node
/**
 * Sample Quality Check - Tests a representative sample of repos
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'github-solana-programs.json');
const REPORT_FILE = path.join(__dirname, '..', 'data', 'quality-report.json');
const GITHUB_API_BASE = 'https://api.github.com';

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkRepo(program) {
  const { fullName, owner, name, url, stars, language, updated } = program;
  
  try {
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
    
    // Check for recognizable code language
    const validLanguages = ['Rust', 'TypeScript', 'JavaScript', 'Solidity', 'Python', 'Go', 'C', 'C++'];
    const hasRecognizableCode = data.language && validLanguages.includes(data.language);
    
    if (!hasRecognizableCode && !data.archived) {
      issue.issues.push(`Primary language is "${data.language}" - may not contain recognizable Solana program code`);
      if (issue.severity === 'none') issue.severity = 'low';
      results.issueCategories.noCodeFilesFound++;
    }
    
    // Check ZIP download
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
      issue.issues.push(`Could not verify ZIP download`);
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

async function main() {
  console.log('=== Solana Programs Quality Check ===\n');
  
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const programs = data.repos || [];
  
  // Take representative samples from different star counts
  const highStars = programs.filter(p => p.stars >= 500).slice(0, 10);
  const midStars = programs.filter(p => p.stars >= 100 && p.stars < 500).slice(0, 15);
  const lowStars = programs.filter(p => p.stars < 100).slice(0, 25);
  
  const samples = [...highStars, ...midStars, ...lowStars];
  
  console.log(`Total programs: ${programs.length}`);
  console.log(`Checking sample of ${samples.length} repos:`);
  console.log(`  - High stars (>=500): ${highStars.length}`);
  console.log(`  - Mid stars (100-499): ${midStars.length}`);
  console.log(`  - Low stars (<100): ${lowStars.length}\n`);
  
  results.totalProgramsChecked = samples.length;
  
  for (let i = 0; i < samples.length; i++) {
    const program = samples[i];
    console.log(`[${i + 1}/${samples.length}] ${program.fullName}...`);
    
    const result = await checkRepo(program);
    await sleep(500); // Small delay
    
    if (result.issues.length > 0) {
      results.programsWithIssues.push(result);
      console.log(`  ✗ ${result.issues[0]}`);
    } else {
      results.programsWorkingCorrectly++;
      console.log(`  ✓ Working correctly`);
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
  console.log(`\nFull report saved to: ${REPORT_FILE}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
