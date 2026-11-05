import type { FlameNode } from './flamegraph';

export interface FlameRect {
  node: FlameNode;
  /** Row below the node being shown: 0 is the zoomed node itself. */
  depth: number;
  x: number;
  width: number;
}

/** Below this width a block is not drawn; the text table still lists it. */
export const MIN_DRAWN_WIDTH = 2;

function placeChildren(rect: FlameRect, into: FlameRect[]): void {
  const { node } = rect;
  let cursor = rect.x;
  for (const child of node.children) {
    let width = 0;
    if (node.total > 0) {
      width = (rect.width * child.total) / node.total;
    }
    placeNode({ node: child, depth: rect.depth + 1, x: cursor, width }, into);
    cursor += width;
  }
}

function placeNode(rect: FlameRect, into: FlameRect[]): void {
  into.push(rect);
  placeChildren(rect, into);
}

/**
 * Every block of the tree below `top`, with its position in a row of `width` pixels.
 * A child's width is its share of its parent's latency, so rows add up to the full width.
 */
export function layoutFlame(top: FlameNode, width: number): FlameRect[] {
  const rects: FlameRect[] = [];
  placeNode({ node: top, depth: 0, x: 0, width }, rects);
  return rects.filter((rect) => rect.width >= MIN_DRAWN_WIDTH || rect.depth === 0);
}

export function findFlameNode(root: FlameNode, id: string): FlameNode | null {
  if (root.id === id) {
    return root;
  }
  for (const child of root.children) {
    const found = findFlameNode(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}

/** The label cut to the characters that fit in `width` pixels, ending in an ellipsis when cut. */
export function fitLabel(
  label: string,
  width: number,
  characterWidth: number,
  padding = 12,
): string {
  const fits = Math.floor((width - padding) / characterWidth);
  if (fits <= 0) {
    return '';
  }
  if (label.length <= fits) {
    return label;
  }
  if (fits === 1) {
    return '…';
  }
  return `${label.slice(0, fits - 1)}…`;
}
