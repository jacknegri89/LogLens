import '../../styles/workbench-fix.css';
import { CopyAction } from './CopyAction';

interface CodeBlockProps {
  title: string;
  code: string;
  copyLabel: string;
}

/** A titled block of code with a copy button. The code is shown as text, never as markup. */
export function CodeBlock({ title, code, copyLabel }: CodeBlockProps) {
  return (
    <figure className="fix-code">
      <figcaption className="fix-code-bar">
        <span className="fix-code-title">{title}</span>
        <CopyAction text={code} label={copyLabel} />
      </figcaption>
      <pre className="fix-code-body" tabIndex={0} role="region" aria-label={title}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
