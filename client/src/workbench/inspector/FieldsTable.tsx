import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';

const MAX_FIELDS = 100;

function FieldRows({ entries }: { entries: ReadonlyArray<[string, string]> }) {
  const text = useText(INSPECTOR_TEXT);
  return (
    <table className="inspect-table">
      <thead>
        <tr>
          <th scope="col">{text.fieldKey}</th>
          <th scope="col">{text.fieldValue}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <th scope="row">{key}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The parsed key/value pairs of the line. */
export function FieldsTable({ fields }: { fields: Record<string, string> }) {
  const text = useText(INSPECTOR_TEXT);
  const entries = Object.entries(fields);
  return (
    <section aria-labelledby="inspector-fields-title">
      <h3 id="inspector-fields-title" className="inspect-heading">
        {text.fieldsTitle(entries.length)}
      </h3>
      {entries.length === 0 ? (
        <p className="inspect-muted">{text.noFields}</p>
      ) : (
        <FieldRows entries={entries.slice(0, MAX_FIELDS)} />
      )}
      {entries.length > MAX_FIELDS && (
        <p className="inspect-muted">{text.moreFields(entries.length - MAX_FIELDS)}</p>
      )}
    </section>
  );
}
