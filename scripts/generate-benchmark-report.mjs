#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const TAG_NAME = process.env.TAG_NAME;

async function loadBenchmarkResults() {
  const resultsDir = "benchmark-results";
  const results = [];

  const dirs = await readdir(resultsDir);

  for (const dir of dirs) {
    const files = await readdir(join(resultsDir, dir));
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await readFile(join(resultsDir, dir, file), 'utf-8');
          const data = JSON.parse(content);

          // Extract driver and WAL mode from directory name
          // Format: benchmark-{driver}-wal-{true|false}
          const match = dir.match(/benchmark-([\w:]+)-wal-(true|false)/);
          if (match) {
            results.push({
              driver: match[1],
              wal: match[2] === 'true',
              data: data
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
    const key = `${result.driver} (WAL: ${result.wal})`;

    if (!result.data.testResults || result.data.testResults.length === 0) {
      continue;
    }

    analysis[key] = {
      driver: result.driver,
      wal: result.wal,
      benchmarks: []
    };

    for (const testResult of result.data.testResults) {
      if (!testResult.assertionResults) continue;

      for (const assertion of testResult.assertionResults) {
        if (assertion.status === 'passed' && assertion.duration) {
          analysis[key].benchmarks.push({
            name: assertion.fullName || assertion.title,
            duration: assertion.duration,
            opsPerSec: assertion.duration > 0 ? 1000000000 / assertion.duration : 0
          });
        }
      }
    }
  }

  return analysis;
}

function generateMarkdownReport(analysis, tagName) {
  let markdown = `# Benchmark Results - ${tagName}\n\n`;
  markdown += `> Generated on ${new Date().toISOString()}\n\n`;

  // Summary table
  markdown += `## Summary\n\n`;
  markdown += `| Driver | WAL Mode | Total Benchmarks |\n`;
  markdown += `|--------|----------|------------------|\n`;

  for (const [key, data] of Object.entries(analysis)) {
    markdown += `| ${data.driver} | ${data.wal ? '✅' : '❌'} | ${data.benchmarks.length} |\n`;
  }

  // Detailed results by benchmark
  markdown += `\n## Detailed Results\n\n`;

  // Group benchmarks by name
  const benchmarksByName = {};
  for (const [key, data] of Object.entries(analysis)) {
    for (const bench of data.benchmarks) {
      if (!benchmarksByName[bench.name]) {
        benchmarksByName[bench.name] = [];
      }
      benchmarksByName[bench.name].push({
        config: key,
        driver: data.driver,
        wal: data.wal,
        ...bench
      });
    }
  }

  for (const [benchName, configs] of Object.entries(benchmarksByName)) {
    markdown += `### ${benchName}\n\n`;
    markdown += `| Configuration | Duration | Ops/sec |\n`;
    markdown += `|---------------|----------|----------|\n`;

    // Sort by duration (fastest first)
    configs.sort((a, b) => a.duration - b.duration);

    for (const config of configs) {
      const opsPerSec = config.opsPerSec >= 1000000
        ? `${(config.opsPerSec / 1000000).toFixed(2)}M`
        : config.opsPerSec >= 1000
        ? `${(config.opsPerSec / 1000).toFixed(2)}K`
        : config.opsPerSec.toFixed(2);

      markdown += `| ${config.driver} (WAL: ${config.wal ? '✅' : '❌'}) | ${formatDuration(config.duration)} | ${opsPerSec} |\n`;
    }

    // Add winner
    const winner = configs[0];
    markdown += `\n🏆 **Winner**: ${winner.driver} (WAL: ${winner.wal ? 'enabled' : 'disabled'}) - ${formatDuration(winner.duration)}\n\n`;
  }

  // Performance insights
  markdown += `## Performance Insights\n\n`;

  // Calculate average performance by driver
  const driverStats = {};
  for (const [key, data] of Object.entries(analysis)) {
    const configKey = `${data.driver}-${data.wal}`;
    if (!driverStats[configKey]) {
      driverStats[configKey] = {
        driver: data.driver,
        wal: data.wal,
        totalDuration: 0,
        count: 0
      };
    }
    for (const bench of data.benchmarks) {
      driverStats[configKey].totalDuration += bench.duration;
      driverStats[configKey].count++;
    }
  }

  const avgPerformance = Object.values(driverStats)
    .map(stat => ({
      ...stat,
      avgDuration: stat.totalDuration / stat.count
    }))
    .sort((a, b) => a.avgDuration - b.avgDuration);

  markdown += `### Average Performance (lower is better)\n\n`;
  markdown += `| Rank | Configuration | Avg Duration |\n`;
  markdown += `|------|---------------|-------------|\n`;

  avgPerformance.forEach((stat, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    markdown += `| ${medal} | ${stat.driver} (WAL: ${stat.wal ? '✅' : '❌'}) | ${formatDuration(stat.avgDuration)} |\n`;
  });

  // WAL impact analysis
  markdown += `\n### WAL Mode Impact\n\n`;
  const walImpact = {};
  for (const stat of Object.values(driverStats)) {
    if (!walImpact[stat.driver]) {
      walImpact[stat.driver] = {};
    }
    walImpact[stat.driver][stat.wal ? 'wal' : 'nowal'] = stat.totalDuration / stat.count;
  }

  for (const [driver, impact] of Object.entries(walImpact)) {
    if (impact.wal && impact.nowal) {
      const diff = ((impact.wal - impact.nowal) / impact.nowal * 100).toFixed(2);
      const faster = impact.wal < impact.nowal ? 'faster' : 'slower';
      markdown += `- **${driver}**: WAL mode is ${Math.abs(diff)}% ${faster} (${formatDuration(impact.wal)} vs ${formatDuration(impact.nowal)})\n`;
    }
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
