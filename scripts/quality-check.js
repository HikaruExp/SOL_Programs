#!/usr/bin/env node
/**
 * Quality Check Script for Solana Programs Database
 * 
 * This script checks all programs in the database and verifies:
 * 1. GitHub repo exists and is accessible
 * 2. Code viewer can fetch files (repo has recognizable source code)
 * 3. Identify repos showing "No Code Files Found" and why
 * 4. ZIP download works (verify default branch exists)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DATA_FILE = path.join(__dirname, '..', 'data', 'github-solana-programs.json');
const REPORT_FILE = path.join(__dirname, '..', 'data', 'quality-report.json');
const GITHUB_API_BASE = 'https://api.github.com';

// Code file extensions the app looks for
const CODE_EXTENSIONS = ['.rs', '.ts', '.tsx', '.js', '.jsx', '.sol', '.py', '.go', '.c', '.cpp', '.h'];
const PRIORITY_DIRS = ['src', 'programs', 'contracts', 'program', 'anchor'];

// Rate limiting
const REQUEST_DELAY = 1000; // 1 second between requests to avoid rate limits
let requestCount = 0;

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

// Utility: Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility: Fetch with error handling
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      requestCount++;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Solana-Programs-Directory-Quality-Check',
          ...options.headers
        }
      });
      
      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const waitTime = resetTime ? (parseInt(resetTime) * 1000 - Date.now()) : 60000;
        console.log(`Rate limited. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
        await sleep(Math.min(waitTime, 60000)); // Max 1 minute wait
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries) throw error;
      await sleep(2000 * (i + 1));
    }
  }
  throw new Error('Max retries exceeded');
}

// Check if repo exists and get basic info
async function checkRepoExists(owner, repo) {
  try {
    const response = await fetchWithRetry(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
    
    if (response.status === 404) {
      return { exists: false, reason: 'not_found' };
    }
    
    if (response.status === 403) {
      return { exists: false, reason: 'rate_limited' };
    }
    
    if (!response.ok) {
      return { exists: false, reason: 'error', status: response.status };
    }
    
    const data = await response.json();
    return {
      exists: true,
      isPrivate: data.private,
      isArchived: data.archived,
      defaultBranch: data.default_branch,
      stars: data.stargazers_count,
      updatedAt: data.updated_at,
      language: data.language
    };
  } catch (error) {
    return { exists: false, reason: 'error', error: error.message };
  }
}

// Check if repo has code files
async function checkRepoCodeFiles(owner, repo) {
  const files = [];
  const scannedPaths = new Set();
  
  async function scanPath(path = '', depth = 0) {
    if (depth > 3 || files.length >= 20) return;
    if (scannedPaths.has(path)) return;
    scannedPaths.add(path);
    
    try {
      await sleep(REQUEST_DELAY); // Rate limiting
      const response = await fetchWithRetry(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`
      );
      
      if (!response.ok) return;
      
      const contents = await response.json();
      if (!Array.isArray(contents)) return;
      
      for (const item of contents) {
        if (item.type === 'file') {
          const hasCodeExt = CODE_EXTENSIONS.some(ext => item.name.endsWith(ext));
          if (hasCodeExt && item.size <= 100 * 1024) {
            files.push({
              name: item.name,
              path: item.path,
              size: item.size
            });
            if (files.length >= 20) return;
          }
        } else if (item.type === 'dir' && depth < 3) {
          await scanPath(item.path, depth + 1);
          if (files.length >= 20) return;
        }
      }
    } catch (error) {
      // Ignore errors for individual directories
    }
  }
  
  // Scan priority directories first
  for (const dir of PRIORITY_DIRS) {
    await scanPath(dir, 0);
    if (files.length >= 20) break;
  }
  
  // If not enough files, scan root
  if (files.length < 20) {
    await scanPath('', 0);
  }
  
  return files;
}

// Check ZIP download URL
async function checkZipDownload(owner, repo, defaultBranch) {
  const branches = [defaultBranch, 'main', 'master', 'develop'].filter(Boolean);
  
  for (const branch of branches) {
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
    try {
      const response = await fetch(zipUrl, { method: 'HEAD' });
      if (response.ok) {
        return { works: true, branch };
      }
    } catch (error) {
      // Continue to next branch
    }
  }
  
  return { works: false, triedBranches: branches };
}

// Analyze a single repo
async function analyzeRepo(program) {
  const { fullName, owner, name, url, description, stars, language, updated } = program;
  
  console.log(`\nChecking: ${fullName}`);
  
  const issue = {
    fullName,
    url,
    stars,
    language,
    updated,
    issues: [],
    severity: 'none' // none, low, medium, high
  };
  
  // Step 1: Check if repo exists
  console.log('  → Checking repo existence...');
  await sleep(REQUEST_DELAY);
  const repoInfo = await checkRepoExists(owner, name);
  
  if (!repoInfo.exists) {
    if (repoInfo.reason === 'not_found') {
      issue.issues.push('Repository not found (404) - may have been deleted or renamed');
      issue.severity = 'high';
      results.issueCategories.repoNotFound++;
    } else if (repoInfo.reason === 'rate_limited') {
      issue.issues.push('GitHub API rate limit exceeded');
      issue.severity = 'medium';
      results.issueCategories.rateLimited++;
    } else {
      issue.issues.push(`Error checking repository: ${repoInfo.error || 'Unknown error'}`);
      issue.severity = 'medium';
      results.issueCategories.otherError++;
    }
    return issue;
  }
  
  if (repoInfo.isPrivate) {
    issue.issues.push('Repository is now private');
    issue.severity = 'high';
    results.issueCategories.repoPrivate++;
    return issue;
  }
  
  if (repoInfo.isArchived) {
    issue.issues.push('Repository is archived (read-only)');
    issue.severity = 'low';
    results.issueCategories.repoArchived++;
  }
  
  // Step 2: Check for code files
  console.log('  → Checking for code files...');
  const codeFiles = await checkRepoCodeFiles(owner, name);
  
  if (codeFiles.length === 0) {
    issue.issues.push('No code files found - repository may be empty or use non-standard structure');
    issue.severity = issue.severity === 'high' ? 'high' : 'medium';
    results.issueCategories.noCodeFilesFound++;
  } else {
    console.log(`    Found ${codeFiles.length} code files`);
    issue.codeFilesFound = codeFiles.length;
    issue.sampleFiles = codeFiles.slice(0, 3).map(f => f.path);
  }
  
  // Step 3: Check ZIP download
  console.log('  → Checking ZIP download...');
  const zipCheck = await checkZipDownload(owner, name, repoInfo.defaultBranch);
  
  if (!zipCheck.works) {
    issue.issues.push(`ZIP download not working - tried branches: ${zipCheck.triedBranches.join(', ')}`);
    if (issue.severity === 'none') issue.severity = 'low';
    results.issueCategories.zipDownloadIssue++;
  } else {
    issue.zipWorks = true;
    issue.zipBranch = zipCheck.branch;
  }
  
  // Additional metadata
  issue.defaultBranch = repoInfo.defaultBranch;
  issue.repoStars = repoInfo.stars;
  issue.repoLanguage = repoInfo.language;
  issue.lastUpdated = repoInfo.updatedAt;
  
  return issue;
}

// Generate recommendations based on issues
function generateRecommendations() {
  const recommendations = [];
  
  if (results.issueCategories.repoNotFound > 0) {
    recommendations.push({
      category: 'Deleted/Renamed Repositories',
      count: results.issueCategories.repoNotFound,
      action: 'Remove from database or update with new URL',
      priority: 'high'
    });
  }
  
  if (results.issueCategories.repoPrivate > 0) {
    recommendations.push({
      category: 'Private Repositories',
      count: results.issueCategories.repoPrivate,
      action: 'Remove from database - no longer publicly accessible',
      priority: 'high'
    });
  }
  
  if (results.issueCategories.noCodeFilesFound > 0) {
    recommendations.push({
      category: 'No Code Files Found',
      count: results.issueCategories.noCodeFilesFound,
      action: 'Investigate - may need to update scanner to recognize different file patterns or directory structures',
      priority: 'medium',
      note: 'Some repos may be documentation-only, configuration repos, or use non-standard code organization'
    });
  }
  
  if (results.issueCategories.zipDownloadIssue > 0) {
    recommendations.push({
      category: 'ZIP Download Issues',
      count: results.issueCategories.zipDownloadIssue,
      action: 'Update default branch detection - may use non-standard branch names',
      priority: 'low',
      note: 'Try detecting default branch from GitHub API instead of assuming "main"'
    });
  }
  
  if (results.issueCategories.repoArchived > 0) {
    recommendations.push({
      category: 'Archived Repositories',
      count: results.issueCategories.repoArchived,
      action: 'Consider marking as archived in UI or deprioritizing in search results',
      priority: 'low'
    });
  }
  
  return recommendations;
}

// Main function
async function main() {
  console.log('=== Solana Programs Quality Check ===\n');
  
  // Load programs data
  console.log(`Loading programs from: ${DATA_FILE}`);
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const programs = data.repos || [];
  
  console.log(`Total programs to check: ${programs.length}\n`);
  
  // Sample for testing (first 10)
  // Uncomment to test on full dataset
  const sampleSize = programs.length; // Change to smaller number for testing
  const programsToCheck = programs.slice(0, sampleSize);
  
  results.totalProgramsChecked = programsToCheck.length;
  
  // Check each program
  for (let i = 0; i < programsToCheck.length; i++) {
    const program = programsToCheck[i];
    console.log(`\n[${i + 1}/${programsToCheck.length}]`);
    
    try {
      const issue = await analyzeRepo(program);
      
      if (issue.issues.length > 0) {
        results.programsWithIssues.push(issue);
      } else {
        results.programsWorkingCorrectly++;
      }
    } catch (error) {
      console.error(`  ERROR analyzing ${program.fullName}:`, error.message);
      results.programsWithIssues.push({
        fullName: program.fullName,
        url: program.url,
        issues: [`Analysis failed: ${error.message}`],
        severity: 'medium'
      });
      results.issueCategories.otherError++;
    }
    
    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${programsToCheck.length} ---`);
      console.log(`Working: ${results.programsWorkingCorrectly}, Issues: ${results.programsWithIssues.length}`);
    }
  }
  
  // Generate recommendations
  results.recommendations = generateRecommendations();
  
  // Calculate summary statistics
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
  console.log(`  - No code files: ${results.issueCategories.noCodeFilesFound}`);
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
