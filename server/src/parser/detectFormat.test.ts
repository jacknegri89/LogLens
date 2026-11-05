import { describe, expect, it } from 'vitest';

import { FORMAT_LABEL } from '../content/formatLabels';
import { detectFormat } from './detectFormat';

const JSON_LINES = [
  '{"level":"error","msg":"db down","ts":1}',
  '{"level":"info","msg":"retrying","ts":2}',
].join('\n');
const WINDOWS_EVENT = [
  'Log Name:      System',
  'Source:        Service Control Manager',
  'Event ID:      7034',
].join('\n');
const PYTHON_TRACEBACK = [
  'Traceback (most recent call last):',
  '  File "app.py", line 12, in <module>',
  'KeyError: 42',
].join('\n');
const JAVA_STACK_TRACE = [
  'Exception in thread "main" java.lang.NullPointerException',
  '\tat com.example.App.run(App.java:42)',
].join('\n');
const NODE_ERROR = [
  'Error: connect ECONNREFUSED 127.0.0.1:5432',
  '    at Object.<anonymous> (/app/src/db.js:10:5)',
].join('\n');
const KUBERNETES = 'Warning  BackOff  pod/api-7d  CrashLoopBackOff: restarting failed container';
const DOCKER = [
  '2026-11-03T10:00:00.123456789Z server listening on 3000',
  '2026-11-03T10:00:01.123456789Z request failed',
].join('\n');
const POSTGRES = '2026-11-03 10:00:00.123 UTC [412] ERROR:  relation "users" does not exist';
const ACCESS_LOG = [
  '203.0.113.9 - - [03/Nov/2026:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 512 "-" "curl/8"',
  '203.0.113.9 - - [03/Nov/2026:10:00:01 +0000] "POST /login HTTP/1.1" 502 0 "-" "curl/8"',
].join('\n');
const SYSLOG = [
  'Nov  3 10:00:00 web01 sshd[812]: Failed password for root from 203.0.113.9 port 22',
  'Nov  3 10:00:05 web01 sshd[812]: Failed password for admin from 203.0.113.9 port 22',
].join('\n');
const PLAIN_TEXT = 'The nightly import stopped because the disk was full.';

describe('detectFormat', () => {
  it('handles repeated incomplete Node internal frames', () => {
    const log = ` at ${'(node:internal'.repeat(10_000)}`;
    expect(detectFormat(log)).toBe(FORMAT_LABEL.plainText);
  });

  it('recognises a Node internal frame', () => {
    expect(detectFormat('    at fn (node:internal/modules:10:5)')).toBe(FORMAT_LABEL.nodeError);
  });
  it.each([
    [FORMAT_LABEL.jsonLines, JSON_LINES],
    [FORMAT_LABEL.windowsEvent, WINDOWS_EVENT],
    [FORMAT_LABEL.pythonTraceback, PYTHON_TRACEBACK],
    [FORMAT_LABEL.javaStackTrace, JAVA_STACK_TRACE],
    [FORMAT_LABEL.nodeError, NODE_ERROR],
    [FORMAT_LABEL.dockerKubernetes, KUBERNETES],
    [FORMAT_LABEL.dockerKubernetes, DOCKER],
    [FORMAT_LABEL.postgres, POSTGRES],
    [FORMAT_LABEL.accessLog, ACCESS_LOG],
    [FORMAT_LABEL.syslog, SYSLOG],
    [FORMAT_LABEL.plainText, PLAIN_TEXT],
  ])('recognises %s', (label, log) => {
    expect(detectFormat(log)).toBe(label);
  });

  it('is not fooled by near misses', () => {
    expect(detectFormat('{"level": "error", "msg": "cut off')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('[1, 2, 3]')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('Please log the Event ID in the form')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('The traceback was printed to the console')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('Caused by: the new release')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('Exception handling is covered in chapter 3')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('at the end of the day we ship')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('  at index.js we start the app')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('ERROR: the form is invalid')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('GET /index.html returned 200')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('Nov 3 was a busy day for the team')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('the pod restarted twice today')).toBe(FORMAT_LABEL.plainText);
  });

  it('needs most of the lines to share a line-based format', () => {
    const mostlyProse = ['one', 'two', 'three', JSON_LINES.split('\n')[0]].join('\n');

    expect(detectFormat(mostlyProse)).toBe(FORMAT_LABEL.plainText);
  });

  it('answers plain text for an empty log', () => {
    expect(detectFormat('')).toBe(FORMAT_LABEL.plainText);
    expect(detectFormat('\n  \n')).toBe(FORMAT_LABEL.plainText);
  });

  it('prefers the more specific family when several could fit', () => {
    const javaInContainer = `2026-11-03T10:00:00.123456789Z boot\n${JAVA_STACK_TRACE}`;

    expect(detectFormat(javaInContainer)).toBe(FORMAT_LABEL.javaStackTrace);
  });

  it('looks only at the first 30 non-empty lines', () => {
    const prose = Array.from({ length: 30 }, (_, index) => `note ${index}`).join('\n');

    expect(detectFormat(`${prose}\n${PYTHON_TRACEBACK}`)).toBe(FORMAT_LABEL.plainText);
  });

  it('handles Windows line endings', () => {
    expect(detectFormat(JSON_LINES.replace(/\n/g, '\r\n'))).toBe(FORMAT_LABEL.jsonLines);
  });
});
