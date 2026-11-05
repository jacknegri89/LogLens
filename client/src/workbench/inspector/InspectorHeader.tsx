import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { NAVIGATION_ATTRIBUTE } from './inspectorKeys';
import type { LineNavigation } from './useLineNavigation';

interface InspectorHeaderProps {
  lineNumber: number;
  bookmarked: boolean;
  navigation: LineNavigation;
  onToggleBookmark: () => void;
}

interface IconButtonProps {
  symbol: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  navigation?: boolean;
}

function IconButton({ symbol, label, onClick, disabled, pressed, navigation }: IconButtonProps) {
  let navigationAttribute = {};
  if (navigation) {
    navigationAttribute = { [NAVIGATION_ATTRIBUTE]: '' };
  }
  let clickHandler: (() => void) | undefined = onClick;
  if (disabled) {
    clickHandler = undefined;
  }
  return (
    <button
      type="button"
      className="inspect-icon"
      aria-label={label}
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      onClick={clickHandler}
      {...navigationAttribute}
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

/** Title, previous/next, bookmark star and close. */
export function InspectorHeader(props: InspectorHeaderProps) {
  const text = useText(INSPECTOR_TEXT);
  let bookmarkSymbol = '☆';
  let bookmarkLabel = text.bookmarkAdd;
  if (props.bookmarked) {
    bookmarkSymbol = '★';
    bookmarkLabel = text.bookmarkRemove;
  }
  return (
    <header className="inspect-header">
      <h2 id="inspector-title" className="inspect-title">
        {text.title(props.lineNumber)}
      </h2>
      <div className="inspect-toolbar">
        <IconButton
          symbol="↑"
          label={text.previous}
          onClick={props.navigation.actions.previous}
          disabled={!props.navigation.hasPrevious}
          navigation
        />
        <IconButton
          symbol="↓"
          label={text.next}
          onClick={props.navigation.actions.next}
          disabled={!props.navigation.hasNext}
          navigation
        />
        <IconButton
          symbol={bookmarkSymbol}
          label={bookmarkLabel}
          pressed={props.bookmarked}
          onClick={props.onToggleBookmark}
        />
        <IconButton symbol="✕" label={text.close} onClick={props.navigation.actions.close} />
      </div>
    </header>
  );
}
