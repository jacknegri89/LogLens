import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { describe, it } from 'node:test';

import { isAtOrAbove, sendLog, summaryMarkdown, tailOfLog } from './send-log.mjs';

function startServer(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

describe('tailOfLog', () => {
  it('keeps a short log as it is', () => {
    assert.equal(tailOfLog('one\ntwo', 100), 'one\ntwo');
  });

  it('keeps the newest characters and starts at a whole line', () => {
    assert.equal(tailOfLog('first line\nsecond line\nthird line', 15), 'third line');
  });
});

describe('isAtOrAbove', () => {
  it('compares severities and never fails when the threshold is none', () => {
    assert.equal(isAtOrAbove('high', 'medium'), true);
    assert.equal(isAtOrAbove('low', 'high'), false);
    assert.equal(isAtOrAbove('critical', 'none'), false);
  });
});

describe('summaryMarkdown', () => {
  it('shows severity, category, title and id, and never the log', () => {
    const markdown = summaryMarkdown({
      severity: 'high',
      category: 'Database',
      title: 'DB down',
      id: 'abc',
    });

    assert.match(markdown, /\*\*Severity:\*\* high/);
    assert.match(markdown, /DB down/);
    assert.doesNotMatch(markdown, /rawLog/);
  });
});

describe('sendLog', () => {
  it('posts the log with the bearer token and returns the analysis', async () => {
    let receivedAuthorization = '';
    let receivedBody = '';
    const server = await startServer((request, response) => {
      receivedAuthorization = request.headers.authorization ?? '';
      let body = '';
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => {
        receivedBody = body;
        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(
          JSON.stringify({
            id: 'a1',
            severity: 'critical',
            category: 'Security Attack',
            title: 'SQLi',
          }),
        );
      });
    });
    const { port } = server.address();

    const result = await sendLog({
      endpoint: `http://127.0.0.1:${port}/api/ingest`,
      token: 'secret-token-0123456789',
      rawLog: 'ERROR boom',
    });
    server.close();

    assert.equal(receivedAuthorization, 'Bearer secret-token-0123456789');
    assert.equal(JSON.parse(receivedBody).rawLog, 'ERROR boom');
    assert.equal(result.severity, 'critical');
  });

  it('reports a refused token without repeating the token', async () => {
    const server = await startServer((request, response) => {
      response.writeHead(401, { 'Content-Type': 'application/json' });
      response.end('{"error":{"message":"Missing or invalid ingest token."}}');
    });
    const { port } = server.address();

    await assert.rejects(
      sendLog({
        endpoint: `http://127.0.0.1:${port}/x`,
        token: 'wrong-token-0123456789',
        rawLog: 'x',
      }),
      (error) => {
        assert.match(error.message, /401/);
        assert.doesNotMatch(error.message, /wrong-token/);
        return true;
      },
    );
    server.close();
  });
});
