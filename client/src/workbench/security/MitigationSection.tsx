import { CopyButton } from '../../components/CopyButton';
import { SECURITY_TEXT } from '../../content/workbenchSecurity';
import { useText } from '../../i18n/useText';
import { buildMitigation, type MitigationSnippet } from './scan/mitigation';
import type { ScanResult } from './scan/types';

/** Block commands and firewall rules for what the scan found, each ready to copy. */
export function MitigationSection({ result }: { result: ScanResult }) {
  const text = useText(SECURITY_TEXT).mitigation;
  const snippets = buildMitigation(result);
  if (snippets.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="mitigation-title" className="sec-mitigation">
      <h3 id="mitigation-title" className="sec-subtitle">
        {text.title}
      </h3>
      <p className="sec-intro">{text.intro}</p>
      <p className="sec-caution">{text.caution}</p>
      <div className="sec-snippets">
        {snippets.map((snippet) => (
          <SnippetBlock key={snippet.id} snippet={snippet} />
        ))}
      </div>
    </section>
  );
}

function SnippetBlock({ snippet }: { snippet: MitigationSnippet }) {
  const text = useText(SECURITY_TEXT).mitigation;
  const labels = text.snippets[snippet.id];

  return (
    <figure className="sec-snippet">
      <figcaption className="sec-snippet-head">
        <span className="sec-snippet-title">{labels.title}</span>
        <CopyButton
          text={snippet.code}
          label={text.copy}
          copiedLabel={text.copied}
          className="sec-copy"
        />
      </figcaption>
      <p className="sec-muted">{labels.hint}</p>
      <pre className="sec-code" tabIndex={0}>
        {snippet.code}
      </pre>
    </figure>
  );
}
