import type { ReactNode } from 'react';

interface ToolDrawerProps {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** A drawer of the desk that holds one tool (issue, verdict, share link), with a label plate. */
export function ToolDrawer({ title, hint, className = '', children }: ToolDrawerProps) {
  return (
    <section className={`report-drawer ${className}`}>
      <h3 className="report-drawer-label">{title}</h3>
      {hint && <p className="report-drawer-hint">{hint}</p>}
      {children}
    </section>
  );
}
