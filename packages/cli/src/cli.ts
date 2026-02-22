import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { watch } from 'chokidar';
import {
  initSightglass,
  loadConfig,
  getDbPath,
} from './utils/config.js';
import { SightglassDB } from './storage/db.js';
import {
  collectAllEvents,
  parseJsonlContent,
  findLogDirectories,
} from './collectors/claude-code.js';
import { classifyEvents } from './classifiers/pattern-classifier.js';
import { buildChains, getChainStats } from './analyzers/chain-builder.js';
import { scoreRisks, getRiskStats } from './analyzers/risk-scorer.js';
import { formatTerminalReport, formatChains } from './reporters/terminal.js';
import type { AnalysisReport } from './reporters/terminal.js';
import { formatJsonReport } from './reporters/json.js';
import { pushEvents } from './sync/push.js';
import type { DiscoveryType } from './classifiers/types.js';

const program = new Command();

program
  .name('sightglass')
  .description('Agent supply chain intelligence — see what your AI coding agents actually decide')
  .version('0.1.0');

// ── sightglass init ──

program
  .command('init')
  .description('Initialize Sightglass in the current project')
  .option('--global', 'Install globally instead of project-level')
  .action(async (_opts) => {
    const spinner = ora('Initializing Sightglass...').start();

    try {
      const { dir, config } = initSightglass();

      // Create database
      const db = new SightglassDB(getDbPath());
      db.init();
      db.close();

      spinner.succeed('Sightglass initialized');
      console.log('');
      console.log(chalk.dim(`  Config: ${dir}/config.json`));
      console.log(chalk.dim(`  Database: ${dir}/sightglass.db`));
      console.log('');

      // Show detected agents
      const enabledAgents = Object.entries(config.agents)
        .filter(([_, v]) => v.enabled)
        .map(([k]) => k);

      if (enabledAgents.length > 0) {
        console.log(chalk.green(`  Detected agents: ${enabledAgents.join(', ')}`));
      } else {
        console.log(chalk.yellow('  No agents detected. Install Claude Code, Cursor, or Windsurf.'));
      }

      console.log('');
      console.log(chalk.dim('  Next steps:'));
      console.log(chalk.dim('    sightglass watch --live    Watch agent sessions in real-time'));
      console.log(chalk.dim('    sightglass analyze         Analyze collected sessions'));
      console.log('');
    } catch (err) {
      spinner.fail('Failed to initialize');
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

// ── sightglass watch ──

program
  .command('watch')
  .description('Watch agent sessions in real-time')
  .option('--agent <agent>', 'Watch specific agent (default: all)')
  .option('--live', 'Show live terminal output')
  .action(async (opts) => {
    let config;
    try {
      config = loadConfig();
    } catch {
      console.error(chalk.red('Not initialized. Run: sightglass init'));
      process.exit(1);
    }

    const db = new SightglassDB(getDbPath());
    db.init();

    const logDirs = findLogDirectories();
    if (logDirs.length === 0) {
      console.log(chalk.yellow('No Claude Code log directories found.'));
      console.log(chalk.dim('Run some Claude Code sessions first, then try again.'));
      db.close();
      return;
    }

    console.log(chalk.hex('#c9893a')('  sightglass') + chalk.dim(' watching...'));
    console.log(chalk.dim(`  Monitoring ${logDirs.length} project director${logDirs.length === 1 ? 'y' : 'ies'}`));
    console.log('');

    // Watch for new JSONL files and changes
    const watcher = watch(logDirs.map(d => `${d}/**/*.jsonl`), {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    const processedLines = new Map<string, number>();

    watcher.on('change', (filePath) => {
      try {
        const content = require('node:fs').readFileSync(filePath, 'utf-8') as string;
        const lines = content.split('\n');
        const prevCount = processedLines.get(filePath) ?? 0;
        const newLines = lines.slice(prevCount).filter((l: string) => l.trim());
        processedLines.set(filePath, lines.length);

        if (newLines.length === 0) return;

        const sessionId = require('node:path').basename(filePath, '.jsonl');
        const newContent = newLines.join('\n');
        const events = parseJsonlContent(newContent, sessionId);

        if (events.length > 0) {
          const classified = classifyEvents(events);

          // Store events
          for (const event of events) {
            try { db.insertEvent(event); } catch { /* duplicate */ }
          }

          // Update classifications
          for (const event of classified) {
            try { db.updateEventClassification(event); } catch { /* */ }
          }

          // Live output
          if (opts.live) {
            for (const event of classified) {
              if (event.isInstall) {
                const riskColor = event.abandoned ? chalk.red : chalk.green;
                const classColor = classificationColor(event.classification);
                console.log(
                  chalk.dim(`  ${new Date(event.timestamp).toLocaleTimeString()}`) +
                  ` ${riskColor(event.abandoned ? '\u2717' : '\u2713')}` +
                  ` ${chalk.white(event.packageName ?? event.raw)}` +
                  ` ${classColor(`[${event.classification}]`)}` +
                  ` ${chalk.dim(`${event.confidence}%`)}`,
                );
              }
            }
          }

          // Push to API if enabled
          if (config.privacy.shareAnonymousData) {
            pushEvents(classified, config).catch(() => {});
          }
        }
      } catch {
        // Skip errors in file processing
      }
    });

    watcher.on('add', (filePath) => {
      if (opts.live) {
        const name = require('node:path').basename(filePath);
        console.log(chalk.dim(`  New session: ${name}`));
      }
    });

    // Keep running
    process.on('SIGINT', () => {
      console.log('');
      console.log(chalk.dim('  Stopped watching.'));
      watcher.close();
      db.close();
      process.exit(0);
    });
  });

// ── sightglass analyze ──

program
  .command('analyze')
  .description('Analyze collected sessions')
  .option('--since <date>', 'Analyze events since date (e.g. "today", "2024-01-01")')
  .option('--format <format>', 'Output format: terminal, json', 'terminal')
  .option('--chains', 'Show full decision chains')
  .option('--session <id>', 'Analyze specific session')
  .action(async (opts) => {
    let config;
    try {
      config = loadConfig();
    } catch {
      // No config — try to work without it (for fixture/demo mode)
    }

    // Try to load from DB first
    const dbPath = getDbPath();
    let allEvents;

    try {
      const db = new SightglassDB(dbPath);
      db.init();

      const since = parseSinceDate(opts.since);
      const rows = opts.session
        ? db.getEventsBySession(opts.session)
        : db.getAllEvents(since?.toISOString());

      if (rows.length > 0) {
        // Convert DB rows to RawEvents for classification
        allEvents = rows.map(row => ({
          id: row.id,
          sessionId: row.session_id,
          timestamp: row.timestamp,
          agent: row.agent as 'claude-code',
          action: row.action as 'bash',
          raw: row.raw,
          result: row.result ?? undefined,
          exitCode: row.exit_code ?? undefined,
          cwd: row.cwd ?? undefined,
        }));
      }
      db.close();
    } catch {
      // DB not available
    }

    // If no DB data, try collecting from logs directly
    if (!allEvents) {
      const spinner = ora('Collecting events from agent logs...').start();
      const since = parseSinceDate(opts.since);
      const sessions = collectAllEvents(since ?? undefined);
      allEvents = sessions.flatMap(s => s.events);
      spinner.stop();
    }

    if (allEvents.length === 0) {
      console.log(chalk.yellow('\n  No events found.'));
      console.log(chalk.dim('  Run some AI agent sessions, then try again.\n'));
      return;
    }

    // Classify
    const classified = classifyEvents(allEvents);
    const installEvents = classified.filter(e => e.isInstall);

    // Build chains
    const chains = buildChains(classified);
    const chainStats = getChainStats(chains);

    // Score risks
    const riskAssessments = scoreRisks(classified);
    const riskStats = getRiskStats(riskAssessments);

    // Classification distribution
    const distribution: Record<DiscoveryType, number> = {
      TRAINING_RECALL: 0,
      CONTEXT_INHERITANCE: 0,
      REACTIVE_SEARCH: 0,
      PROACTIVE_SEARCH: 0,
      USER_DIRECTED: 0,
      UNKNOWN: 0,
    };
    for (const event of installEvents) {
      distribution[event.classification]++;
    }

    const alternativesNeverConsidered = installEvents.filter(
      e => !e.abandoned && e.alternatives.length === 0 && e.classification === 'TRAINING_RECALL',
    ).length;

    const report: AnalysisReport = {
      totalEvents: allEvents.length,
      installEvents,
      classificationDistribution: distribution,
      riskAssessments,
      riskStats,
      chains: opts.chains ? chains : undefined,
      chainStats,
      alternativesNeverConsidered,
    };

    // Output
    if (opts.format === 'json') {
      console.log(formatJsonReport(report));
    } else {
      console.log(formatTerminalReport(report));
      if (opts.chains) {
        console.log(formatChains(chains));
      }
    }

    // Push if enabled
    if (config?.privacy?.shareAnonymousData) {
      const result = await pushEvents(classified, config);
      if (result.success) {
        console.log(chalk.dim(`  Pushed ${result.count} anonymized events to sightglass.dev`));
      }
    }
  });

// ── Helpers ──

function parseSinceDate(since?: string): Date | null {
  if (!since) return null;

  if (since === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  if (since === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const parsed = new Date(since);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function classificationColor(type: string): typeof chalk {
  const colors: Record<string, typeof chalk> = {
    TRAINING_RECALL: chalk.hex('#7c7cf0'),
    CONTEXT_INHERITANCE: chalk.hex('#c9893a'),
    REACTIVE_SEARCH: chalk.hex('#c94a4a'),
    PROACTIVE_SEARCH: chalk.hex('#3b8a6e'),
    USER_DIRECTED: chalk.hex('#3b8a6e'),
  };
  return colors[type] ?? chalk.dim;
}

program.parse();
