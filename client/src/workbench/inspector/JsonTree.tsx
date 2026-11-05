import { useState } from 'react';

import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';

const MAX_CHILDREN = 50;
const MAX_DEPTH = 12;
const OPEN_DEPTH = 2;

function isContainer(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

function PrimitiveValue({ value }: { value: unknown }) {
  let kind: string = typeof value;
  if (value === null) {
    kind = 'null';
  }
  return <span className={`inspect-json-${kind}`}>{JSON.stringify(value)}</span>;
}

/** The keys or items of an object or array, capped so a huge payload cannot flood the page. */
function JsonChildren({ value, depth }: { value: object; depth: number }) {
  const text = useText(INSPECTOR_TEXT);
  const entries = Object.entries(value);
  return (
    <ul className="inspect-json-list">
      {entries.slice(0, MAX_CHILDREN).map(([key, child]) => (
        <JsonNode key={key} name={key} value={child} depth={depth + 1} />
      ))}
      {entries.length > MAX_CHILDREN && (
        <li className="inspect-json-note">{text.jsonMore(entries.length - MAX_CHILDREN)}</li>
      )}
    </ul>
  );
}

function JsonBranch({ name, value, depth }: { name: string; value: object; depth: number }) {
  const text = useText(INSPECTOR_TEXT);
  const [open, setOpen] = useState(depth < OPEN_DEPTH);
  const isArray = Array.isArray(value);
  let openBracket = '{';
  let closeBracket = '}';
  if (isArray) {
    openBracket = '[';
    closeBracket = ']';
  }
  let children = <JsonChildren value={value} depth={depth} />;
  if (depth >= MAX_DEPTH) {
    children = <p className="inspect-json-note">{text.jsonTooDeep}</p>;
  }
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span className="inspect-json-key">{name}</span>
        <span className="inspect-json-hint">
          {openBracket} {text.jsonSummary(Object.keys(value).length, isArray)} {closeBracket}
        </span>
      </summary>
      {open && children}
    </details>
  );
}

function JsonNode({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  let content = (
    <span className="inspect-json-leaf">
      <span className="inspect-json-key">{name}</span>
      <PrimitiveValue value={value} />
    </span>
  );
  if (isContainer(value)) {
    content = <JsonBranch name={name} value={value} depth={depth} />;
  }
  return <li>{content}</li>;
}

/** A parsed JSON value as a collapsible tree. Everything is a text node, never markup. */
export function JsonTree({ value }: { value: unknown }) {
  return (
    <ul className="inspect-json-list inspect-json-root">
      <JsonNode name="$" value={value} depth={0} />
    </ul>
  );
}
