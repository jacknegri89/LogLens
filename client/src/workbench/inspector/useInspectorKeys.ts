import { useEffect, type RefObject } from 'react';

import { inspectorKeyAction, NAVIGATION_ATTRIBUTE, type InspectorKeyAction } from './inspectorKeys';

function isTextField(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function readAction(event: KeyboardEvent, drawer: HTMLElement | null): InspectorKeyAction | null {
  const active = document.activeElement;
  return inspectorKeyAction({
    key: event.key,
    hasModifier: event.ctrlKey || event.metaKey || event.altKey,
    alreadyHandled: event.defaultPrevented,
    otherModalOpen: document.querySelector('[aria-modal="true"]') !== null,
    focusInsideDrawer: drawer !== null && active !== null && drawer.contains(active),
    focusInTextField: isTextField(active),
    focusOnNavigation: active === drawer || active?.hasAttribute(NAVIGATION_ATTRIBUTE) === true,
  });
}

/** Escape closes the drawer; J and K (or the arrows on its buttons) move to another line. */
export function useInspectorKeys(
  drawerRef: RefObject<HTMLElement | null>,
  actions: Record<InspectorKeyAction, () => void>,
): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = readAction(event, drawerRef.current);
      if (!action) {
        return;
      }
      event.preventDefault();
      actions[action]();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerRef, actions]);
}
