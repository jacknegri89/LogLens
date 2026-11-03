import { describe, expect, it } from 'vitest';

import { inspectorKeyAction, type InspectorKeyContext } from './inspectorKeys';

function context(overrides: Partial<InspectorKeyContext>): InspectorKeyContext {
  return {
    key: '',
    hasModifier: false,
    alreadyHandled: false,
    otherModalOpen: false,
    focusInsideDrawer: true,
    focusInTextField: false,
    focusOnNavigation: false,
    ...overrides,
  };
}

describe('inspectorKeyAction', () => {
  it('closes on Escape, even when focus is elsewhere on the page', () => {
    expect(inspectorKeyAction(context({ key: 'Escape', focusInsideDrawer: false }))).toBe('close');
  });

  it('leaves Escape to another open modal or to a handler that already used it', () => {
    expect(inspectorKeyAction(context({ key: 'Escape', otherModalOpen: true }))).toBeNull();
    expect(inspectorKeyAction(context({ key: 'Escape', alreadyHandled: true }))).toBeNull();
  });

  it('moves between lines with K and J while focus is in the drawer', () => {
    expect(inspectorKeyAction(context({ key: 'k' }))).toBe('previous');
    expect(inspectorKeyAction(context({ key: 'j' }))).toBe('next');
  });

  it('ignores J and K outside the drawer, in text fields or with a modifier key', () => {
    expect(inspectorKeyAction(context({ key: 'j', focusInsideDrawer: false }))).toBeNull();
    expect(inspectorKeyAction(context({ key: 'j', focusInTextField: true }))).toBeNull();
    expect(inspectorKeyAction(context({ key: 'j', hasModifier: true }))).toBeNull();
  });

  it('uses the arrows only on the drawer or its navigation buttons', () => {
    expect(inspectorKeyAction(context({ key: 'ArrowDown', focusOnNavigation: true }))).toBe('next');
    expect(inspectorKeyAction(context({ key: 'ArrowUp', focusOnNavigation: true }))).toBe(
      'previous',
    );
    expect(inspectorKeyAction(context({ key: 'ArrowDown' }))).toBeNull();
  });

  it('ignores other keys', () => {
    expect(inspectorKeyAction(context({ key: 'a', focusOnNavigation: true }))).toBeNull();
    expect(inspectorKeyAction(context({ key: 'ArrowLeft', focusOnNavigation: true }))).toBeNull();
  });
});
