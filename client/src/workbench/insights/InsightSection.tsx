import { useId, type ReactNode } from 'react';

import '../../styles/workbench-insights.css';

interface InsightSectionProps {
  title: string;
  children: ReactNode;
}

/** A titled block of the Insights view; the heading names the region for screen readers. */
export function InsightSection({ title, children }: InsightSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="insights-section">
      <h2 id={headingId} className="insights-heading evidence-label">
        {title}
      </h2>
      {children}
    </section>
  );
}
