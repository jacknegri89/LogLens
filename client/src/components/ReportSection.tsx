import type { ReactNode } from 'react';

/** A titled block of the report, with a rule under the title. */
export function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 border-b-2 border-chalk-dim pb-2 text-sm font-extrabold tracking-widest uppercase [font-stretch:125%]">
        {title}
      </h3>
      {children}
    </section>
  );
}
