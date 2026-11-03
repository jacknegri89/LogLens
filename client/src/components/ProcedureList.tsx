/** The probable causes: leads to check, each with a big hollow number. */
export function CauseList({ causes }: { causes: string[] }) {
  return (
    <ul className="report-procedure" data-kind="causes">
      {causes.map((cause, index) => (
        <li key={index}>{cause}</li>
      ))}
    </ul>
  );
}

/** The debug steps: a numbered procedure, one big solid number per step. */
export function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="report-procedure" data-kind="steps">
      {steps.map((step, index) => (
        <li key={index}>{step}</li>
      ))}
    </ol>
  );
}
