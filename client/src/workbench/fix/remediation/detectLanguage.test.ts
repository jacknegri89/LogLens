import { describe, expect, it } from 'vitest';

import { detectCodeLanguage } from './detectLanguage';
import type { CodeLanguageId } from './types';

const SAMPLES: [CodeLanguageId, string][] = [
  [
    'node',
    'Error: connect ECONNREFUSED 10.0.2.15:5432\n    at TCPConnectWrap.afterConnect (node:net:1555:16)\n    at connect (/app/src/db.js:12:9)',
  ],
  [
    'python',
    'Traceback (most recent call last):\n  File "/app/main.py", line 42, in handler\nValueError: bad',
  ],
  [
    'java',
    'Exception in thread "main" java.lang.NullPointerException\n\tat com.shop.OrderService.find(OrderService.java:88)',
  ],
  [
    'go',
    'panic: runtime error: nil pointer dereference\ngoroutine 1 [running]:\nmain.main()\n\t/app/main.go:21 +0x1d',
  ],
  [
    'rust',
    "thread 'main' panicked at src/main.rs:4:5:\ncalled `Option::unwrap()` on a `None` value",
  ],
  ['php', 'PHP Fatal error:  Uncaught Error: Call to undefined function in /var/www/index.php:7'],
  [
    'ruby',
    "app/models/user.rb:14:in `city': undefined method `upcase' for nil:NilClass (NoMethodError)",
  ],
  [
    'csharp',
    'System.NullReferenceException: Object reference not set\n   at Shop.Orders.Find(Int32 id) in C:\\src\\Orders.cs:line 31',
  ],
];

describe('detectCodeLanguage', () => {
  it.each(SAMPLES)('recognises %s from its stack trace', (expected, log) => {
    expect(detectCodeLanguage(log)).toBe(expected);
  });

  it('returns null for a log without any stack trace', () => {
    expect(detectCodeLanguage('INFO server started\nWARN disk at 91%')).toBeNull();
  });

  it('returns null for an empty log', () => {
    expect(detectCodeLanguage('')).toBeNull();
  });

  it('picks the language with the most frames in a mixed log', () => {
    const log = [
      'File "/a.py", line 1, in x',
      'at handler (/srv/a.js:1:1)',
      'at other (/srv/b.js:2:2)',
      'at third (/srv/c.js:3:3)',
    ].join('\n');
    expect(detectCodeLanguage(log)).toBe('node');
  });

  it('ignores stack traces that appear after the scanned part of a huge log', () => {
    const log = 'INFO ok\n'.repeat(20_000) + 'File "/late.py", line 1, in x';
    expect(detectCodeLanguage(log)).toBeNull();
  });
});
