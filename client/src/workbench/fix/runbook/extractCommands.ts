export interface RunbookStep {
  /** The step as written, without the backticks around inline code. */
  text: string;
  /** Commands found in the step, in order of appearance, each one once. */
  commands: string[];
}

/** Command-line tools that are rarely a plain English word, so "docker logs api" is a command. */
const COMMAND_VERBS = [
  'kubectl',
  'docker-compose',
  'docker',
  'helm',
  'terraform',
  'curl',
  'wget',
  'psql',
  'mysql',
  'redis-cli',
  'systemctl',
  'journalctl',
  'grep',
  'tail',
  'npm',
  'npx',
  'yarn',
  'pnpm',
  'pip',
  'git',
  'openssl',
  'nslookup',
  'dig',
  'ping',
  'netstat',
  'lsof',
  'iptables',
  'ufw',
  'ssh',
  'scp',
  'chmod',
  'chown',
  'ulimit',
  'sudo',
  'nc',
  'df',
  'du',
  'ps',
  'kill',
];

const BACKTICK_SPAN = /`([^`\n]+)`/g;
const MAX_COMMANDS_PER_STEP = 5;
const MAX_COMMAND_LENGTH = 300;

/** A command starts a step, follows a colon or an opening bracket, or follows "run", "use"... */
const VERB_START = new RegExp(
  '(?:^|[:(]\\s*|\\b(?:[Rr]un|[Ee]xecute|[Tt]ype|[Uu]se|[Ee]segui|[Ll]ancia|[Uu]sa|[Dd]igita)\\s+)' +
    '((?:' +
    COMMAND_VERBS.join('|') +
    ')\\s[^\\n]*)',
  'g',
);

const STOP_WORD = /^\s(?:and|then|or|e|poi|oppure)\s/;

function tokenCount(command: string): number {
  return command.trim().split(/\s+/).length;
}

function endsClause(text: string, index: number): boolean {
  const character = text[index];
  const next = text[index + 1];
  if (character === '.' || character === ',') return next === undefined || next === ' ';
  return STOP_WORD.test(text.slice(index, index + 9));
}

/** The command at the start of the text: it stops at the closing bracket or the end of the clause. */
function cutCommand(text: string): string {
  let depth = 0;
  let quote = '';
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth++;
    } else if (character === ')') {
      if (depth === 0) return text.slice(0, index);
      depth--;
    } else if (endsClause(text, index)) {
      return text.slice(0, index);
    }
  }
  return text;
}

function cleanCommand(candidate: string): string {
  return candidate
    .trim()
    .replace(/^\$\s+/, '')
    .replace(/[;:,.]+$/, '')
    .trim();
}

function isUsable(command: string): boolean {
  return tokenCount(command) >= 2 && command.length <= MAX_COMMAND_LENGTH;
}

function backtickCommands(step: string): string[] {
  return [...step.matchAll(BACKTICK_SPAN)].map((match) => cleanCommand(match[1]));
}

function verbCommands(step: string): string[] {
  const withoutCode = step.replace(BACKTICK_SPAN, ' ');
  return [...withoutCode.matchAll(VERB_START)].map((match) => cleanCommand(cutCommand(match[1])));
}

/** Reads one debug step: its readable text and the commands a person can copy from it. */
export function parseRunbookStep(step: string): RunbookStep {
  const normalized = step.replace(/`{2,}/g, '`');
  const found = [...backtickCommands(normalized), ...verbCommands(normalized)].filter(isUsable);
  return {
    text: normalized.replace(BACKTICK_SPAN, '$1'),
    commands: [...new Set(found)].slice(0, MAX_COMMANDS_PER_STEP),
  };
}
