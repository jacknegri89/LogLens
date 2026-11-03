import { ERROR_TEXT } from '../content/errors';
import { useText } from '../i18n/useText';

/** A failure message on a paper slip with a red ink stamp, readable on any background. */
export function ErrorNotice({
  title,
  message,
  className = '',
}: {
  title: string;
  message: string;
  className?: string;
}) {
  const text = useText(ERROR_TEXT);
  return (
    <div role="alert" className={`error-slip ${className}`}>
      <span className="error-stamp" aria-hidden="true">
        {text.stamp}
      </span>
      <p className="error-title">{title}</p>
      <p className="error-message">{message}</p>
    </div>
  );
}
