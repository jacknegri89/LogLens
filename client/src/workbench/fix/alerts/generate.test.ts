import { describe, expect, it } from 'vitest';

import { generateAlert } from './generate';
import { ALERT_TARGET_IDS, sanitizePattern, type AlertSettings } from './settings';

const BASE: AlertSettings = {
  pattern: 'connect ECONNREFUSED 10.0.2.15:5432',
  threshold: 10,
  windowMinutes: 5,
  severity: 'high',
  appName: 'checkout',
  logFile: '/var/log/app.log',
};

const ADVERSARIAL_PATTERNS = [
  '"; rm -rf / #',
  '`id` and $(whoami) and ${HOME}',
  "' ; echo pwned ; '",
  'first line\nsecond: injected\n- item',
  'key: value # comment\n---\n...',
  '*alias &anchor !tag %YAML |>',
  '{{ .Secret }} {{{x}}}',
  '@everyone \\" \\\\   \u0007',
  "it's a \"quoted\" 'mixed' text",
];

const QUOTED_STRING = '"((?:[^"\\\\]|\\\\.)*)"';

/** Reads a double-quoted scalar the way a YAML or JSON parser does. */
function unquote(literal: string): string {
  return JSON.parse('"' + literal + '"') as string;
}

/** The text a shell makes of a run of single-quoted parts and \' escapes. */
function decodeShellWord(word: string): string {
  let decoded = '';
  let index = 0;
  while (index < word.length) {
    if (word[index] === "'") {
      const end = word.indexOf("'", index + 1);
      decoded += word.slice(index + 1, end);
      index = end + 1;
    } else if (word.startsWith("\\'", index)) {
      decoded += "'";
      index += 2;
    } else {
      throw new Error('Unquoted character in a shell word: ' + word[index]);
    }
  }
  return decoded;
}

/** A small structural reader for the generated YAML: keys with a quoted or plain value. */
function readSimpleYaml(text: string): { indent: number; key: string; value: string | null }[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
    .map((line) => {
      const match = line.match(/^( *)(?:- )?([A-Za-z_]+):(?: (.+))?$/);
      if (!match) {
        throw new Error('Not a simple YAML line: ' + line);
      }
      let value: string | null = null;
      if (match[3] !== undefined) {
        value = match[3];
      }
      if (value !== null && value.startsWith('"')) {
        unquote(value.slice(1, -1));
      }
      return { indent: match[1].length, key: match[2], value };
    });
}

function yamlValue(text: string, key: string): string {
  const line = readSimpleYaml(text).find((entry) => entry.key === key);
  return unquote((line?.value ?? '""').slice(1, -1));
}

describe('Prometheus rule', () => {
  const text = generateAlert('prometheus', BASE);

  it('is structurally valid YAML with the expected keys in order', () => {
    expect(readSimpleYaml(text).map((entry) => entry.key)).toEqual([
      'groups',
      'name',
      'rules',
      'alert',
      'expr',
      'for',
      'labels',
      'severity',
      'annotations',
      'summary',
    ]);
  });

  it('counts the pattern with increase over the window and compares with the threshold', () => {
    expect(yamlValue(text, 'expr')).toBe(
      'sum(increase(log_matches_total{pattern="connect ECONNREFUSED 10.0.2.15:5432"}[5m])) > 10',
    );
  });

  it('maps the analysis severity to a known alert severity', () => {
    expect(text).toContain('severity: critical');
    expect(generateAlert('prometheus', { ...BASE, severity: 'low' })).toContain('severity: info');
  });
});

describe('Datadog monitor', () => {
  const monitor = JSON.parse(generateAlert('datadog', BASE));

  it('is valid JSON with a log alert query over the chosen window', () => {
    expect(monitor.type).toBe('log alert');
    expect(monitor.query).toBe(
      'logs("\\"connect ECONNREFUSED 10.0.2.15:5432\\"").index("*").rollup("count").last("5m") > 10',
    );
  });

  it('sets a critical threshold and a lower warning one', () => {
    expect(monitor.options.thresholds).toEqual({ critical: 10, warning: 5 });
  });

  it('leaves out the warning threshold when it would not be below the critical one', () => {
    const single = JSON.parse(generateAlert('datadog', { ...BASE, threshold: 1 }));
    expect(single.options.thresholds).toEqual({ critical: 1 });
  });

  it('rounds the window up to a window Datadog offers', () => {
    const query = JSON.parse(generateAlert('datadog', { ...BASE, windowMinutes: 7 })).query;
    expect(query).toContain('.last("10m")');
  });
});

describe('Loki rule', () => {
  const text = generateAlert('loki', BASE);

  it('uses count_over_time with a line filter on the pattern', () => {
    expect(yamlValue(text, 'expr')).toBe(
      'sum(count_over_time({app="checkout"} |= "connect ECONNREFUSED 10.0.2.15:5432" [5m])) > 10',
    );
  });

  it('is structurally valid YAML', () => {
    expect(readSimpleYaml(text).map((entry) => entry.key)).toContain('expr');
  });
});

describe('Sentry rule', () => {
  const rule = JSON.parse(generateAlert('sentry', BASE));

  it('is valid JSON with a frequency condition and a contains filter on the message', () => {
    expect(rule.conditions[0]).toMatchObject({ value: 10, interval: '5m' });
    expect(rule.filters[0]).toMatchObject({
      attribute: 'message',
      match: 'co',
      value: BASE.pattern,
    });
  });

  it('rounds the window up to an interval Sentry offers', () => {
    const wide = JSON.parse(generateAlert('sentry', { ...BASE, windowMinutes: 20 }));
    expect(wide.conditions[0].interval).toBe('1h');
  });
});

describe('cron script', () => {
  const script = generateAlert('cron', BASE);

  it('starts with a shebang and strict mode', () => {
    expect(script.startsWith('#!/usr/bin/env bash\n')).toBe(true);
    expect(script).toContain('set -euo pipefail');
  });

  it('quotes the pattern, the file and counts it as a fixed string', () => {
    expect(script).toContain("PATTERN='connect ECONNREFUSED 10.0.2.15:5432'");
    expect(script).toContain("LOG_FILE='/var/log/app.log'");
    expect(script).toContain('grep -c -F -e "$PATTERN"');
    expect(script).toContain('THRESHOLD=10');
  });

  it('runs on the schedule of the window', () => {
    expect(generateAlert('cron', { ...BASE, windowMinutes: 15 })).toContain('*/15 * * * *');
  });

  it('keeps its state in an owned private directory and refuses symlinks', () => {
    expect(script).toContain(
      'STATE_DIR="${HOME:?HOME must point to a private home directory}/.loglens-alert"',
    );
    expect(script).toContain('mkdir -p -m 700 -- "$STATE_DIR"');
    expect(script).toContain('[ -L "$STATE_DIR" ]');
    expect(script).toContain('[ -L "$STATE_FILE" ]');
    expect(script).toContain('$(stat -c %u "$STATE_DIR")');
    expect(script).toContain('$(stat -c %a "$STATE_DIR")');
  });
});

describe.each(ADVERSARIAL_PATTERNS)('adversarial pattern %j', (rawPattern) => {
  const settings = { ...BASE, pattern: rawPattern };
  const pattern = sanitizePattern(rawPattern);

  it('stays inside the PromQL string and the YAML string of the Prometheus rule', () => {
    const text = generateAlert('prometheus', settings);
    expect(readSimpleYaml(text)).toHaveLength(10);
    const expression = yamlValue(text, 'expr');
    const matcher = expression.match(new RegExp('pattern=' + QUOTED_STRING + '\\}'));
    expect(unquote(matcher?.[1] ?? '\u0000')).toBe(pattern);
    expect(yamlValue(text, 'summary')).not.toMatch(/\{\{/);
  });

  it('stays inside the LogQL string and the YAML string of the Loki rule', () => {
    const text = generateAlert('loki', settings);
    expect(readSimpleYaml(text)).toHaveLength(10);
    const matcher = yamlValue(text, 'expr').match(new RegExp('\\|= ' + QUOTED_STRING + ' \\['));
    expect(unquote(matcher?.[1] ?? '\u0000')).toBe(pattern);
    expect(yamlValue(text, 'summary')).not.toMatch(/\{\{/);
  });

  it('stays inside the search phrase of the Datadog query and never mentions anyone', () => {
    const monitor = JSON.parse(generateAlert('datadog', settings));
    const phrase = monitor.query.match(new RegExp('^logs\\(' + QUOTED_STRING + '\\)\\.index'));
    const quoted = unquote(phrase?.[1] ?? '\u0000');
    expect(unquote(quoted.slice(1, -1))).toBe(pattern);
    expect(monitor.message).not.toMatch(/@|\{\{/);
    expect(Object.keys(monitor)).toEqual(['name', 'type', 'query', 'message', 'tags', 'options']);
  });

  it('keeps the pattern as one JSON string value in the Sentry rule', () => {
    const rule = JSON.parse(generateAlert('sentry', settings));
    expect(rule.filters[0].value).toBe(pattern);
    expect(Object.keys(rule)).toEqual([
      'name',
      'actionMatch',
      'filterMatch',
      'frequency',
      'conditions',
      'filters',
      'actions',
    ]);
  });

  it('keeps the pattern in one single-quoted shell word and adds no line to the script', () => {
    const script = generateAlert('cron', settings);
    const benign = generateAlert('cron', BASE);
    expect(script.split('\n')).toHaveLength(benign.split('\n').length);
    const line = script.split('\n').find((candidate) => candidate.startsWith('PATTERN='));
    expect(decodeShellWord((line ?? '').slice('PATTERN='.length))).toBe(pattern);
    expect(script).not.toContain('pwned\n');
  });
});

describe('settings from the visitor', () => {
  it('cleans the numbers and the names before writing any target', () => {
    const settings = {
      ...BASE,
      threshold: Number.NaN,
      windowMinutes: 0,
      appName: '"}; drop',
      logFile: '$(x)',
    };
    const script = generateAlert('cron', settings);
    expect(script).toContain('THRESHOLD=10');
    expect(script).toContain("LOG_FILE='x'");
    expect(generateAlert('loki', settings)).toContain('{app=\\"');
  });

  it.each(ALERT_TARGET_IDS)('writes something for %s even with an empty pattern', (target) => {
    expect(generateAlert(target, { ...BASE, pattern: '' }).length).toBeGreaterThan(40);
  });
});
