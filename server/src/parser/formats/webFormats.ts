import type { AttributeValue, LogLevel } from '../normalizedEvent';
import { extractPairs } from '../keyValues';
import { findTimestamp } from '../timestamps';
import type { FormatParser, FormatResult } from './formatTypes';

/** Web server formats: Apache and nginx access logs, nginx and Apache error logs. */

// 10.0.0.5 - alice [10/Oct/2026:13:55:36 +0200] "GET /health HTTP/1.1" 200 2326 "-" "curl/8.4" 0.012
const ACCESS_LOG =
  /^(\S+) (\S+) (\S+) \[([^\]]{1,40})\] "([A-Z]{3,8}) (\S{1,2000}) (HTTP\/[\d.]+)" (\d{3})(?: (\d+|-))?(.*)$/;

function levelForStatus(status: number): LogLevel {
  if (status >= 500) {
    return 'error';
  }
  if (status >= 400) {
    return 'warn';
  }
  return 'info';
}

/** The extra fields that follow the byte count: referer, user agent, request time, key=value pairs. */
function accessLogTail(tail: string): Record<string, AttributeValue> {
  const pairs = extractPairs(tail);
  const quoted = [...tail.matchAll(/"([^"]{0,500})"/g)].map((match) => match[1]);
  if (quoted[0] !== undefined && quoted[0] !== '-') {
    pairs.referer = quoted[0];
  }
  if (quoted[1] !== undefined && quoted[1] !== '-') {
    pairs.userAgent = quoted[1];
  }
  return pairs;
}

/** Apache and nginx access logs in the common and combined formats. */
export const parseAccessLog: FormatParser = (context) => {
  const match = ACCESS_LOG.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, clientIp, , user, time, method, path, protocol, statusText, bytes, tail] = match;
  const status = Number(statusText);
  const pairs: Record<string, AttributeValue> = {
    ...accessLogTail(tail),
    clientIp,
    method,
    path,
    protocol,
    statusCode: status,
  };
  if (user !== '-') {
    pairs.user = user;
  }
  if (bytes !== undefined && bytes !== '-') {
    pairs.bytes = Number(bytes);
  }
  const result: FormatResult = {
    format: 'access-log',
    status: 'parsed',
    level: levelForStatus(status),
    message: `${method} ${path} ${status}`,
    pairs,
  };
  const found = findTimestamp(time, context.timestampOptions);
  if (found) {
    result.timestamp = found.timestamp;
  }
  return result;
};

// 2026/11/03 14:02:00 [error] 1234#0: *5 upstream timed out (110: ...), client: 1.2.3.4, server: x, request: "GET / HTTP/1.1", upstream: "http://10.0.0.5:3000/", host: "x"
const NGINX_ERROR =
  /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(debug|info|notice|warn|error|crit|alert|emerg)\] (\d+)#(\d+): (?:\*(\d+) )?(.*)$/s;
const NGINX_FIELD = /(?:^|, )(client|server|request|upstream|host|referrer): "?([^",]{1,500})"?/g;

/** nginx error log: the message, then `client`, `server`, `request` and `upstream` fields. */
export const parseNginxError: FormatParser = (context) => {
  const match = NGINX_ERROR.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, time, levelWord, processId, , connection, message] = match;
  const pairs: Record<string, AttributeValue> = { pid: Number(processId) };
  if (connection !== undefined) {
    pairs.connection = Number(connection);
  }
  for (const field of message.matchAll(NGINX_FIELD)) {
    let key = field[1];
    if (key === 'host') {
      key = 'httpHost';
    }
    pairs[key] = field[2];
  }
  const result: FormatResult = {
    format: 'nginx-error',
    status: 'parsed',
    service: 'nginx',
    level: webLogLevel(levelWord),
    message: message.split(', client:')[0],
    pairs,
  };
  const found = findTimestamp(time, context.timestampOptions);
  if (found) {
    result.timestamp = found.timestamp;
  }
  return result;
};

function webLogLevel(word: string): LogLevel {
  if (word === 'crit' || word === 'alert' || word === 'emerg') {
    return 'fatal';
  }
  if (word === 'notice') {
    return 'info';
  }
  if (word === 'warn' || word === 'error' || word === 'info' || word === 'debug') {
    return word;
  }
  return 'unknown';
}

// [Sat Nov 03 14:02:00.123456 2026] [core:error] [pid 123] [client 1.2.3.4:5678] message
const APACHE_ERROR =
  /^\[(?:[A-Z][a-z]{2}) ([A-Z][a-z]{2}) (\d{2}) (\d{2}:\d{2}:\d{2})(?:\.\d+)? (\d{4})\] \[(?:[\w.-]+:)?(\w+)\](?: \[pid (\d+)(?::tid \d+)?\])?(?: \[client ([^\]]+)\])? (.*)$/s;

/** Apache error log: a bracketed date with the weekday and the year, the module and the level. */
export const parseApacheError: FormatParser = (context) => {
  const match = APACHE_ERROR.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, month, day, clock, year, levelWord, processId, client, message] = match;
  const result: FormatResult = {
    format: 'apache-error',
    status: 'parsed',
    service: 'apache',
    level: webLogLevel(levelWord.toLowerCase()),
    message,
    pairs: {},
  };
  const found = findTimestamp(
    `${year}/${monthNumber(month)}/${day} ${clock}`,
    context.timestampOptions,
  );
  if (found) {
    result.timestamp = found.timestamp;
  }
  const pairs: Record<string, AttributeValue> = {};
  if (processId !== undefined) {
    pairs.pid = Number(processId);
  }
  if (client !== undefined) {
    pairs.clientIp = client;
  }
  result.pairs = pairs;
  return result;
};

function monthNumber(name: string): string {
  const names = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ];
  const index = names.indexOf(name.toLowerCase());
  return String(index + 1).padStart(2, '0');
}

/** The column names announced by a `#Fields:` directive in a record, or null when it has none. */
export function w3cFieldsOf(lines: string[]): string[] | null {
  const directive = lines.find((line) => line.startsWith('#Fields:'));
  if (directive === undefined) {
    return null;
  }
  return directive.slice('#Fields:'.length).trim().split(/\s+/);
}

const W3C_MAX_COLUMNS = 60;

/**
 * W3C extended logs (IIS): every column is named by the last `#Fields:` directive, so the line
 * is read by name: date and time (UTC), method, address, status.
 */
export const parseW3cExtended: FormatParser = (context) => {
  const fields = context.w3cFields;
  if (fields === undefined || context.firstLine.startsWith('#')) {
    return null;
  }
  const values = context.firstLine.trim().split(/\s+/, W3C_MAX_COLUMNS);
  if (values.length !== fields.length) {
    return null;
  }
  const row: Record<string, string> = {};
  fields.forEach((name, index) => {
    row[name] = values[index];
  });
  const status = Number(row['sc-status']);
  const pairs: Record<string, AttributeValue> = {};
  if (Number.isInteger(status) && status >= 100 && status <= 599) {
    pairs.statusCode = status;
  }
  const stem = row['cs-uri-stem'];
  const method = row['cs-method'];
  if (stem !== undefined) {
    pairs.path = stem;
  }
  if (method !== undefined) {
    pairs.method = method;
  }
  if (row['c-ip'] !== undefined) {
    pairs.clientIp = row['c-ip'];
  }
  if (row['time-taken'] !== undefined) {
    pairs.timeTakenMs = Number(row['time-taken']);
  }
  const result: FormatResult = {
    format: 'w3c',
    status: 'parsed',
    message: `${method ?? ''} ${stem ?? ''} ${row['sc-status'] ?? ''}`.trim(),
    pairs,
  };
  if (pairs.statusCode !== undefined) {
    result.level = levelForStatus(Number(pairs.statusCode));
  }
  if (row.date !== undefined && row.time !== undefined) {
    // W3C logs are in UTC unless the server says otherwise.
    const found = findTimestamp(`${row.date}T${row.time}Z`, context.timestampOptions);
    if (found) {
      result.timestamp = found.timestamp;
    }
  }
  return result;
};
