import { describe, expect, it } from 'vitest';

import { RulesProvider } from './rulesProvider';

const provider = new RulesProvider();

describe('RulesProvider findings', () => {
  it('adds findings when the log holds two distinct problems', async () => {
    const excerpt = [
      'ERROR write failed: no space left on device',
      'Nov 3 10:00:00 web01 sshd[1]: Failed password for root from 203.0.113.9',
    ].join('\n');

    const report = await provider.analyze({ excerpt, severityHint: 'low' });

    expect(report.findings).toHaveLength(2);
    expect(report.category).toBe('Infrastructure');
  });

  it('leaves findings out when the log holds one problem', async () => {
    const report = await provider.analyze({
      excerpt: 'ERROR write failed: no space left on device',
      severityHint: 'low',
    });

    expect(report.findings).toBeUndefined();
  });
});
