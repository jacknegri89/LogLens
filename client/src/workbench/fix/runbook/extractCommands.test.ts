import { describe, expect, it } from 'vitest';

import { parseRunbookStep } from './extractCommands';

describe('parseRunbookStep', () => {
  it('extracts a command written in backticks and removes the backticks from the text', () => {
    const step = parseRunbookStep('Check the port with `lsof -i :5432` before restarting.');
    expect(step.commands).toEqual(['lsof -i :5432']);
    expect(step.text).toBe('Check the port with lsof -i :5432 before restarting.');
  });

  it('extracts a command that follows "for example:" inside brackets', () => {
    const step = parseRunbookStep(
      'Block the source IP at the firewall (for example: iptables -A INPUT -s <IP> -j DROP) and add a WAF rule.',
    );
    expect(step.commands).toEqual(['iptables -A INPUT -s <IP> -j DROP']);
  });

  it('extracts a command that follows "run" and stops before "and"', () => {
    const step = parseRunbookStep(
      'Run kubectl logs deploy/api --tail=100 and look for the first error.',
    );
    expect(step.commands).toEqual(['kubectl logs deploy/api --tail=100']);
  });

  it('extracts a command that starts the step and stops at the end of the sentence', () => {
    const step = parseRunbookStep('docker compose ps. Then read the status column.');
    expect(step.commands).toEqual(['docker compose ps']);
    const withDash = parseRunbookStep('docker-compose ps -a. Then read the status column.');
    expect(withDash.commands).toEqual(['docker-compose ps -a']);
  });

  it('keeps dots inside the command (addresses, files)', () => {
    const step = parseRunbookStep('Run ping 10.0.2.15 and compare with nslookup db.internal.');
    expect(step.commands).toEqual(['ping 10.0.2.15']);
  });

  it('keeps quoted arguments together', () => {
    const step = parseRunbookStep('Use grep -i "connection refused, retry" app.log.');
    expect(step.commands).toEqual(['grep -i "connection refused, retry" app.log']);
  });

  it('extracts several commands once each', () => {
    const step = parseRunbookStep('Run `git log -5` then `git log -5` and `git diff HEAD~1`.');
    expect(step.commands).toEqual(['git log -5', 'git diff HEAD~1']);
  });

  it('does not take plain prose as a command', () => {
    const step = parseRunbookStep(
      'Check that the target service is running and listening on the expected port.',
    );
    expect(step.commands).toEqual([]);
  });

  it('does not take a list of tool names as a command', () => {
    const step = parseRunbookStep('Try to connect by hand from the same machine (psql, nc, curl).');
    expect(step.commands).toEqual([]);
  });

  it('does not take a capitalised product name at the start of a sentence as a command', () => {
    expect(parseRunbookStep('Docker containers restart on failure.').commands).toEqual([]);
  });

  it('ignores a single word in backticks', () => {
    const step = parseRunbookStep('Compare `DATABASE_URL` with the real host.');
    expect(step.commands).toEqual([]);
    expect(step.text).toBe('Compare DATABASE_URL with the real host.');
  });

  it('ignores an unmatched backtick and an empty pair', () => {
    expect(parseRunbookStep('Open the `config file and read it').commands).toEqual([]);
    expect(parseRunbookStep('Nothing `` here').commands).toEqual([]);
  });

  it('reads a fenced block written with triple backticks', () => {
    const step = parseRunbookStep('Then run ```systemctl status nginx``` to see it.');
    expect(step.commands).toEqual(['systemctl status nginx']);
    expect(step.text).toBe('Then run systemctl status nginx to see it.');
  });

  it('removes a leading shell prompt from a command', () => {
    expect(parseRunbookStep('Run `$ npm run build`.').commands).toEqual(['npm run build']);
  });

  it('understands the Italian triggers', () => {
    const step = parseRunbookStep(
      'Esegui journalctl -u api --since "10 min ago" e cerca l’errore.',
    );
    expect(step.commands).toEqual(['journalctl -u api --since "10 min ago"']);
  });

  it('returns no command for an empty step', () => {
    expect(parseRunbookStep('')).toEqual({ text: '', commands: [] });
  });

  it('caps the commands of one step', () => {
    const many = Array.from({ length: 12 }, (_, index) => '`git show ' + index + '`').join(' ');
    expect(parseRunbookStep(many).commands).toHaveLength(5);
  });

  it('keeps a command with HTML-looking text as plain text for the caller to render safely', () => {
    const step = parseRunbookStep('Run `curl -d "<script>alert(1)</script>" http://localhost`.');
    expect(step.commands).toEqual(['curl -d "<script>alert(1)</script>" http://localhost']);
  });
});
