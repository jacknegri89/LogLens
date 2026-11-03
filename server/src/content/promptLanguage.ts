import type { Language } from '../types/language';

/** The sections of the GitHub issue the model writes, in the order it must write them. */
export interface IssueHeadings {
  title: string;
  severity: string;
  category: string;
  component: string;
  whatHappened: string;
  evidence: string;
  cause: string;
  mitigation: string;
}

/** What the prompt says about the language of the answer. */
export interface PromptLanguage {
  /** The name of the language, in English, as the prompt writes it. */
  name: string;
  headings: IssueHeadings;
}

export const PROMPT_LANGUAGE: Record<Language, PromptLanguage> = {
  en: {
    name: 'English',
    headings: {
      title: 'Title',
      severity: 'Severity',
      category: 'Category',
      component: 'Affected component',
      whatHappened: 'What happened',
      evidence: 'Evidence',
      cause: 'Probable cause (RCA)',
      mitigation: 'Mitigation',
    },
  },
  it: {
    name: 'Italian',
    headings: {
      title: 'Titolo',
      severity: 'Severità',
      category: 'Categoria',
      component: 'Componente impattato',
      whatHappened: 'Cosa è successo',
      evidence: 'Evidenze',
      cause: 'Causa probabile (RCA)',
      mitigation: 'Mitigazione',
    },
  },
};
