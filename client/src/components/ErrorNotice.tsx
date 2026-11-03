import { ERROR_TEXT } from '../content/errors';

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
  return (
    <div role="alert" className={`error-slip ${className}`}>
      <span className="error-stamp" aria-hidden="true">
        {ERROR_TEXT.stamp}
      </span>
      <p className="error-title">{title}</p>
      <p className="error-message">{message}</p>
    </div>
  );
}
