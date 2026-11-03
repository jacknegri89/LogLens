import type { Language } from '../types/language';

/** The four sections of the final report, in the order the model must write them. */
export interface ReportSections {
  security: string;
  infrastructure: string;
  noise: string;
  nextSteps: string;
}

/** What the prompt says about the language of the answer. */
export interface PromptLanguage {
  /** The name of the language, in English, as the prompt writes it. */
  name: string;
  /** The headings of the report. Italian is the owner's wording; English is its translation. */
  sections: ReportSections;
}

export const PROMPT_LANGUAGE: Record<Language, PromptLanguage> = {
  en: {
    name: 'English',
    sections: {
      security: '## 🚨 SECURITY INCIDENTS DETECTED',
      infrastructure: '## ⚙️ INFRASTRUCTURE OUTAGES / PERFORMANCE',
      noise: '## 🟢 BACKGROUND NOISE IGNORED',
      nextSteps: '## 🚀 CORRECT NEXT STEPS',
    },
  },
  it: {
    name: 'Italian',
    sections: {
      security: '## 🚨 INCIDENTI DI SICUREZZA RILEVATI',
      infrastructure: '## ⚙️ DISSERVIZI INFRASTRUTTURALI / PERFORMANCE',
      noise: '## 🟢 RUMORE DI FONDO IGNORATO',
      nextSteps: '## 🚀 PROSSIMI PASSI (NEXT STEPS) CORRETTI',
    },
  },
};
