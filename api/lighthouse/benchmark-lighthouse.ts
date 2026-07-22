import { promises as fs } from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';

type Frame = {
  framework: string;
  version: string;
  port: number;
};

type Route = {
  label: string;
  path: string;
};

type ParsedArgs = {
  smoke: boolean;
  frameworksArg: string | null;
  platform: 'mobile' | 'desktop' | 'both';
  iterations: number;
  customIterations: boolean;
};

type LighthouseOutputs = {
  jsonPath: string;
  htmlPath: string;
  csvPath: string;
};

const ITERATIONS = 10;
const SMOKE_ITERATIONS = 1;
const RESULTS_ROOT = path.join(__dirname, 'results', 'lighthouse');
const SUPPORTED_PLATFORMS = new Set<ParsedArgs['platform']>(['mobile', 'desktop', 'both']);
const IMAGE_RESOLUTIONS = ['480p', '720p', '1080p', '2k', '4k'] as const;
const VIDEO_RESOLUTIONS = ['720p', '1080p', '2k', '4k'] as const;

const FRAMES: Frame[] = [
  // {
  //   framework: 'angular',
  //   version: 'v17.3.6',
  //   port: 4200,
  // },
  // {
  //   framework: 'angular',
  //   version: 'v19.1',
  //   port: 4201,
  // },
  // {
  //   framework: 'angular',
  //   version: 'latest',
  //   port: 4202,
  // },
  // {
  //   framework: 'astro',
  //   version: 'v4.10.2',
  //   port: 4321,
  // },
  // {
  //   framework: 'astro',
  //   version: 'v5.1.5',
  //   port: 4322,
  // },
  // {
  //   framework: 'astro',
  //   version: 'latest',
  //   port: 4323,
  // },
  { framework: 'nextjs', version: 'v14.2.3', port: 3010 },
  { framework: 'nextjs', version: 'v15.1.4', port: 3011 },
  { framework: 'nextjs', version: 'latest', port: 3012 },
  { framework: 'nuxt', version: 'v3.11.2', port: 3020 },
  { framework: 'nuxt', version: 'v4.2.2', port: 3021 },
  { framework: 'nuxt', version: 'latest', port: 3022 },
];

const ROUTES: Route[] = [
  { label: 'text-only', path: '/text-only' },
  { label: 'list', path: '/list' },
  ...VIDEO_RESOLUTIONS.flatMap((resolution) => [
    { label: `text-videos-${resolution}`, path: `/text-videos/${resolution}` },
  ]),
  ...IMAGE_RESOLUTIONS.flatMap((resolution) => [
    { label: `text-images-${resolution}`, path: `/text-images/${resolution}` },
  ]),
];

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    smoke: false,
    frameworksArg: null,
    platform: 'both',
    iterations: ITERATIONS,
    customIterations: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--smoke') {
      parsed.smoke = true;
      continue;
    }

    if (arg.startsWith('--frameworks=')) {
      parsed.frameworksArg = arg.split('=')[1] || '';
      continue;
    }

    if (arg === '--frameworks') {
      parsed.frameworksArg = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg.startsWith('--platform=')) {
      parsed.platform = (arg.split('=')[1] || '').toLowerCase() as ParsedArgs['platform'];
      continue;
    }

    if (arg === '--platform') {
      parsed.platform = (argv[index + 1] || '').toLowerCase() as ParsedArgs['platform'];
      index += 1;
      continue;
    }

    if (arg.startsWith('--iterations=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('--iterations must be an integer greater than 0');
      }
      parsed.iterations = value;
      parsed.customIterations = true;
      continue;
    }

    if (arg === '--iterations') {
      const value = Number.parseInt(argv[index + 1], 10);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('--iterations must be an integer greater than 0');
      }
      parsed.iterations = value;
      parsed.customIterations = true;
      index += 1;
      continue;
    }

    throw new Error(`Unknown flag: ${arg}`);
  }

  if (!SUPPORTED_PLATFORMS.has(parsed.platform)) {
    throw new Error('--platform must be one of: mobile, desktop, both');
  }

  return parsed;
}

function frameIdentifier(frame: Frame): string {
  return `${frame.framework}-${frame.version}`.toLowerCase();
}

function selectFrames(frameworksArg: string | null): Frame[] {
  if (!frameworksArg || frameworksArg.toLowerCase() === 'all') {
    return FRAMES;
  }

  const tokens = frameworksArg
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error('--frameworks must not be empty');
  }

  const selected: Frame[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const matches = FRAMES.filter((frame) => frame.framework === token || frameIdentifier(frame) === token);

    if (matches.length === 0) {
      throw new Error(`No framework matched token: ${token}`);
    }

    for (const match of matches) {
      const id = frameIdentifier(match);
      if (!seen.has(id)) {
        seen.add(id);
        selected.push(match);
      }
    }
  }

  return selected;
}

function buildPresets(platform: ParsedArgs['platform']) {
  if (platform === 'mobile') {
    return [{ name: 'mobile', lighthousePreset: 'perf' }];
  }

  if (platform === 'desktop') {
    return [{ name: 'desktop', lighthousePreset: 'desktop' }];
  }

  return [
    { name: 'mobile', lighthousePreset: 'perf' },
    { name: 'desktop', lighthousePreset: 'desktop' },
  ];
}

function createCsvRow(values: Array<string | number | boolean | null | undefined>): string {
  return values
    .map((value) => {
      const normalized = value === undefined || value === null ? '' : String(value);
      if (/[",\n]/.test(normalized)) {
        return `"${normalized.replaceAll('"', '""')}"`;
      }
      return normalized;
    })
    .join(',');
}

function waitForUrl(targetUrl: string, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const retry = (error: Error) => {
      if (Date.now() >= deadline) {
        reject(error);
        return;
      }
      setTimeout(attempt, 750);
    };

    const attempt = () => {
      const request = http.get(targetUrl, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry(new Error(`Received status ${response.statusCode} for ${targetUrl}`));
      });

      request.on('error', retry);
      request.setTimeout(2500, () => request.destroy(new Error(`Timed out waiting for ${targetUrl}`)));
    };

    attempt();
  });
}

function runLighthouse(targetUrl: string, runDir: string, preset: string): Promise<LighthouseOutputs> {
  return new Promise((resolve, reject) => {
    const outputBase = path.join(runDir, 'report');
    const localBinary = path.join(
      __dirname,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'lighthouse.cmd' : 'lighthouse'
    );
    const lighthouseCommand = fsSync.existsSync(localBinary)
      ? localBinary
      : process.platform === 'win32'
        ? 'lighthouse.cmd'
        : 'lighthouse';
    const args = [
      targetUrl,
      '--quiet',
      '--no-enable-error-reporting',
      '--only-categories=performance',
      '--output=json',
      '--output=html',
      '--output=csv',
      `--output-path=${outputBase}`,
      `--preset=${preset}`,
      '--disable-full-page-screenshot',
    ];

    const child = spawn(lighthouseCommand, args, {
      cwd: __dirname,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', (error: Error) => {
      reject(new Error(`Failed to launch Lighthouse (${lighthouseCommand}): ${error.message}`));
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({
          jsonPath: `${outputBase}.report.json`,
          htmlPath: `${outputBase}.report.html`,
          csvPath: `${outputBase}.report.csv`,
        });
        return;
      }
      reject(new Error(`Lighthouse exited with code ${code} for ${targetUrl}`));
    });
  });
}

function metricValue(audits: Record<string, any>, id: string): string | number {
  const audit = audits[id];
  if (!audit) return '';
  const value = audit.numericValue;
  return Number.isFinite(value) ? value : '';
}

function metricScore(categories: Record<string, any>, id: string): string | number {
  const category = categories[id];
  if (!category) return '';
  const value = category.score;
  return Number.isFinite(value) ? value : '';
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { smoke } = args;
  const runId = new Date().toISOString().replaceAll(':', '-');
  const runRoot = path.join(RESULTS_ROOT, runId);
  const summaryPath = path.join(runRoot, 'summary.csv');

  const selectedFrames = args.frameworksArg
    ? selectFrames(args.frameworksArg)
    : smoke
      ? [FRAMES[2]]
      : FRAMES;
  const selectedRoutes = smoke ? [ROUTES.find((route) => route.path === '/list')].filter(Boolean) as Route[] : ROUTES;
  const iterations = args.customIterations ? args.iterations : smoke ? SMOKE_ITERATIONS : ITERATIONS;
  const presets = buildPresets(args.platform);

  await fs.mkdir(runRoot, { recursive: true });
  await fs.writeFile(
    summaryPath,
    createCsvRow([
      'run_id',
      'timestamp',
      'framework',
      'version',
      'port',
      'route',
      'url',
      'preset',
      'iteration',
      'performance_score',
      'first_contentful_paint_ms',
      'largest_contentful_paint_ms',
      'cumulative_layout_shift',
      'total_blocking_time_ms',
      'speed_index_ms',
      'interactive_ms',
      'server_response_time_ms',
      'json_report',
      'html_report',
      'csv_report',
    ]) + '\n',
    'utf8'
  );

  for (const frame of selectedFrames) {
    const baseUrl = `http://localhost:${frame.port}`;
    try {
      await waitForUrl(`${baseUrl}/`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(`\n[skip] ${frame.framework} ${frame.version} on port ${frame.port} is unavailable: ${message}\n`);
      continue;
    }

    for (const route of selectedRoutes) {
      const targetUrl = `${baseUrl}${route.path}`;

      for (const preset of presets) {
        for (let iteration = 1; iteration <= iterations; iteration += 1) {
          const artifactDir = path.join(
            runRoot,
            frame.framework,
            `${frame.framework}-${frame.version}`,
            route.label,
            preset.name,
            `iteration-${String(iteration).padStart(3, '0')}`
          );

          await fs.mkdir(artifactDir, { recursive: true });
          const outputs = await runLighthouse(targetUrl, artifactDir, preset.lighthousePreset);
          const reportJson = JSON.parse(await fs.readFile(outputs.jsonPath, 'utf8')) as { lhr?: any } | any;
          const lhr = reportJson.lhr || reportJson;
          const row = createCsvRow([
            runId,
            lhr.fetchTime || new Date().toISOString(),
            frame.framework,
            frame.version,
            frame.port,
            route.path,
            targetUrl,
            preset.name,
            iteration,
            metricScore(lhr.categories, 'performance'),
            metricValue(lhr.audits, 'first-contentful-paint'),
            metricValue(lhr.audits, 'largest-contentful-paint'),
            metricValue(lhr.audits, 'cumulative-layout-shift'),
            metricValue(lhr.audits, 'total-blocking-time'),
            metricValue(lhr.audits, 'speed-index'),
            metricValue(lhr.audits, 'interactive'),
            metricValue(lhr.audits, 'server-response-time'),
            outputs.jsonPath,
            outputs.htmlPath,
            outputs.csvPath,
          ]);

          await fs.appendFile(summaryPath, `${row}\n`, 'utf8');
          process.stdout.write(
            `\n[${frame.framework} ${frame.version}] ${route.path} | ${preset.name} | iteration ${iteration}/${iterations} complete\n`
          );
        }
      }
    }
  }

  process.stdout.write(`\nBenchmark complete. Summary CSV: ${summaryPath}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});