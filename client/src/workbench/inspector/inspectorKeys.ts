/** Marks the buttons on which the arrow keys also move between lines. */
export const NAVIGATION_ATTRIBUTE = 'data-inspector-navigation';

export type InspectorKeyAction = 'close' | 'previous' | 'next';

export interface InspectorKeyContext {
  key: string;
  hasModifier: boolean;
  /** The key was already handled by something else, such as an open menu. */
  alreadyHandled: boolean;
  /** Another modal dialog (the command palette) is open, so it owns Escape. */
  otherModalOpen: boolean;
  focusInsideDrawer: boolean;
  /** Focus is in a text field, where J and K are letters. */
  focusInTextField: boolean;
  /** Focus is on the drawer itself or on its previous/next buttons, where arrows can move between lines. */
  focusOnNavigation: boolean;
}

/** What a key press does in the inspector, or null when it is not for the inspector. */
export function inspectorKeyAction(context: InspectorKeyContext): InspectorKeyAction | null {
  if (context.alreadyHandled || context.hasModifier) return null;
  if (context.key === 'Escape') return context.otherModalOpen ? null : 'close';
  if (!context.focusInsideDrawer || context.focusInTextField) return null;
  if (context.key === 'k') return 'previous';
  if (context.key === 'j') return 'next';
  if (!context.focusOnNavigation) return null;
  if (context.key === 'ArrowUp') return 'previous';
  return context.key === 'ArrowDown' ? 'next' : null;
}
