import { CopyButton } from '../../components/CopyButton';
import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { isExpired } from './decode/jwt';
import type {
  Base64Details,
  DecodedDetails,
  EpochDetails,
  JwtDetails,
  UrlEncodedDetails,
} from './decode/types';
import { TimeFacts } from './TimeFacts';

const COPY_CLASS = 'btn-paper px-3 py-1 text-xs font-bold tracking-wide uppercase';

function CodeBlock({ label, code }: { label: string; code: string }) {
  const text = useText(INSPECTOR_TEXT);
  return (
    <section>
      <h4 className="inspect-subtitle">{label}</h4>
      <pre className="inspect-code">{code}</pre>
      <CopyButton
        text={code}
        label={text.copyDecoded}
        copiedLabel={text.copied}
        className={COPY_CLASS}
      />
    </section>
  );
}

function JwtExpiry({ details, now }: { details: JwtDetails; now: number }) {
  const text = useText(INSPECTOR_TEXT);
  if (details.expiresAtMilliseconds === null) return <p>{text.jwtNoExpiry}</p>;
  const expired = isExpired(details.expiresAtMilliseconds, now);
  return (
    <p className={expired ? 'inspect-alert' : undefined}>
      {expired ? text.jwtExpired : text.jwtNotExpired}
    </p>
  );
}

function JwtView({ details, now }: { details: JwtDetails; now: number }) {
  const text = useText(INSPECTOR_TEXT);
  return (
    <>
      <p className="inspect-notice">{text.jwtNotice}</p>
      <p>
        {text.jwtAlgorithm}: <code>{details.algorithm}</code>
      </p>
      <JwtExpiry details={details} now={now} />
      {details.claims.map((claim) => (
        <section key={claim.name}>
          <h4 className="inspect-subtitle">{text.claimNames[claim.name]}</h4>
          <TimeFacts epochMilliseconds={claim.epochMilliseconds} nowMilliseconds={now} />
        </section>
      ))}
      <CodeBlock label={text.jwtHeader} code={details.headerJson} />
      {details.payloadJson ? (
        <CodeBlock label={text.jwtPayload} code={details.payloadJson} />
      ) : (
        <p>{text.jwtNoPayload}</p>
      )}
    </>
  );
}

function Base64View({ details }: { details: Base64Details }) {
  const text = useText(INSPECTOR_TEXT);
  return <CodeBlock label={text.decodedText} code={details.json ?? details.text} />;
}

function UrlView({ details }: { details: UrlEncodedDetails }) {
  const text = useText(INSPECTOR_TEXT);
  return (
    <>
      <CodeBlock label={text.decodedText} code={details.text} />
      {details.pairs.length > 0 && (
        <section>
          <h4 className="inspect-subtitle">{text.queryPairs}</h4>
          <dl className="inspect-facts">
            {details.pairs.map(([key, value], position) => (
              <div key={`${key}-${position}`} className="contents">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}

function EpochView({ details, now }: { details: EpochDetails; now: number }) {
  const text = useText(INSPECTOR_TEXT);
  return (
    <>
      <p>{text.epochUnits[details.unit]}</p>
      <TimeFacts epochMilliseconds={details.epochMilliseconds} nowMilliseconds={now} />
    </>
  );
}

/** What a token says, as plain text. Nothing decoded is ever treated as markup. */
export function TokenDetails({ details, now }: { details: DecodedDetails; now: number }) {
  switch (details.kind) {
    case 'jwt':
      return <JwtView details={details} now={now} />;
    case 'base64':
      return <Base64View details={details} />;
    case 'urlencoded':
      return <UrlView details={details} />;
    case 'epoch':
      return <EpochView details={details} now={now} />;
  }
}
