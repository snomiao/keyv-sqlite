#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const TAG_NAME = process.env.TAG_NAME;

function parseBenchmarkOutput(content) {
  const benchmarks = [];
  const lines = content.split('\n');

  let currentSuite = '';

  for (const line of lines) {
    // Parse suite names like "sqlite select"
    const suiteMatch = line.match(/^\s+([^│]+)\s+$/);
    if (suiteMatch && !line.includes('│')) {
      currentSuite = suiteMatch[1].trim();
      continue;
    }

    // Parse benchmark lines like "  · select normal  1,234.56 ops/sec  ±0.12%"
    const benchMatch = line.match(/^\s+[·✓]\s+(.+?)\s+[\d,]+(?:\.\d+)?\s+(ns|μs|ms|s)\/iter\s+\([\d,]+(?:\.\d+)?\s+(?:ns|μs|ms|s)\s*…\s*[\d,]+(?:\.\d+)?\s+(?:ns|μs|ms|s)\)/);
    if (benchMatch) {
      benchmarks.push({
        name: `${currentSuite} - ${benchMatch[1].trim()}`,
        rawLine: line.trim()
      });
    }
  }

  return benchmarks;
}

async function loadBenchmarkResults() {
  const resultsDir = "benchmark-results";
  const results = [];

  const dirs = await readdir(resultsDir);

  for (const dir of dirs) {
    const files = await readdir(join(resultsDir, dir));
    for (const file of files) {
      if (file.endsWith('.txt')) {
        try {
          const content = await readFile(join(resultsDir, dir, file), 'utf-8');

          // Extract runtime, driver and WAL mode from directory name
          // Format: benchmark-{runtime}-{driver}-wal-{true|false}
          const match = dir.match(/benchmark-(node|bun)-([\w:]+)-wal-(true|false)/);
          if (match) {
            results.push({
              runtime: match[1],
              driver: match[2],
              wal: match[3] === 'true',
              content: content,
              benchmarks: parseBenchmarkOutput(content)
            });
          }
        } catch (error) {
          console.error(`Failed to parse ${file}:`, error.message);
        }
      }
    }
  }

  return results;
}

function formatDuration(ns) {
  if (ns < 1000) return `${ns.toFixed(2)} ns`;
  if (ns < 1000000) return `${(ns / 1000).toFixed(2)} μs`;
  if (ns < 1000000000) return `${(ns / 1000000).toFixed(2)} ms`;
  return `${(ns / 1000000000).toFixed(2)} s`;
}

function analyzeBenchmarks(results) {
  const analysis = {};

  for (const result of results) {
    const key = `${result.runtime}/${result.driver} (WAL: ${result.wal})`;

    analysis[key] = {
      runtime: result.runtime,
      driver: result.driver,
      wal: result.wal,
      benchmarks: result.benchmarks.map(b => ({
        name: b.name,
        rawLine: b.rawLine
      })),
      rawOutput: result.content
    };
  }

  return analysis;
}

function generateMarkdownReport(analysis, tagName) {
  let markdown = `# Benchmark Results - ${tagName}\n\n`;
  markdown += `> Generated on ${new Date().toISOString()}\n\n`;

  // Summary table
  markdown += `## Summary\n\n`;
  markdown += `| Runtime | Driver | WAL Mode | Total Benchmarks |\n`;
  markdown += `|---------|--------|----------|------------------|\n`;

  for (const [_key, data] of Object.entries(analysis)) {
    markdown += `| ${data.runtime} | ${data.driver} | ${data.wal ? '✅' : '❌'} | ${data.benchmarks.length} |\n`;
  }

  // Detailed results by configuration
  markdown += `\n## Detailed Results\n\n`;

  for (const [_key, data] of Object.entries(analysis)) {
    markdown += `### ${data.runtime}/${data.driver} (WAL: ${data.wal ? '✅' : '❌'})\n\n`;
    markdown += `\`\`\`\n`;

    // Include benchmark lines from raw output
    for (const bench of data.benchmarks) {
      markdown += `${bench.rawLine}\n`;
    }

    markdown += `\`\`\`\n\n`;
  }

  // Configurations tested
  markdown += `## Configurations Tested\n\n`;

  for (const [_key, data] of Object.entries(analysis)) {
    markdown += `- **${data.runtime}/${data.driver}** (WAL: ${data.wal ? 'enabled' : 'disabled'}) - ${data.benchmarks.length} benchmarks\n`;
  }

  markdown += `\n---\n\n`;
  markdown += `*Benchmark run configuration: All SQLite backends × WAL mode (enabled/disabled)*\n`;
  markdown += `*Tagged version: \`${tagName}\`*\n`;

  return markdown;
}

async function createGitHubIssue(title, body) {
  const [owner, repo] = GITHUB_REPOSITORY.split('/');

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      title,
      body,
      labels: ['benchmark', 'performance']
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create issue: ${response.status} ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('📊 Loading benchmark results...');
  const results = await loadBenchmarkResults();

  if (results.length === 0) {
    console.error('❌ No benchmark results found!');
    process.exit(1);
  }

  console.log(`✅ Loaded ${results.length} benchmark results`);

  console.log('📈 Analyzing benchmarks...');
  const analysis = analyzeBenchmarks(results);

  console.log('📝 Generating markdown report...');
  const report = generateMarkdownReport(analysis, TAG_NAME);

  console.log('\n' + report);

  console.log('\n🚀 Creating GitHub issue...');
  const issue = await createGitHubIssue(
    `Benchmark Results - ${TAG_NAME}`,
    report
  );

  console.log(`✅ Issue created: ${issue.html_url}`);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
