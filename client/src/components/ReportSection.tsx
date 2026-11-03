import type { ReactNode } from 'react';

interface ReportSectionProps {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** A numbered divider of the case file (the number comes from a CSS counter), then its content. */
export function ReportSection({ title, hint, className = '', children }: ReportSectionProps) {
  return (
    <section className={`report-section ${className}`}>
      <h3 className="report-heading">{title}</h3>
      {hint && <p className="report-hint">{hint}</p>}
      {children}
    </section>
  );
}
