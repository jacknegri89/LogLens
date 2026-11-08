/**
 * Picks the text of the language the reader asked for. English lives next to the logic that
 * uses it; every other language is a table with the same keys. `Record<TranslatedLanguage, ...>`
 * makes a new language a compile error until each table below has an entry for it.
 */
import { DEFAULT_LANGUAGE, type Language, type TranslatedLanguage } from '../types/language';
import {
  OVERVIEW_TEXT,
  type CausalRelation,
  type OverviewText,
  type RelationId,
} from './correlations';
import { OVERVIEW_TEXT_IT, RELATION_EXPLANATION_IT } from './correlations.it';
import { FORMAT_LABEL, type FormatKey } from './formatLabels';
import { FORMAT_LABEL_IT } from './formatLabels.it';
import { INCIDENT_TEXT, type IncidentText } from './incidentText';
import { INCIDENT_TEXT_IT } from './incidentText.it';
import type { LogDetails } from './logDetails';
import { REPORT_TEXT, type ReportText } from './reportText';
import { REPORT_TEXT_IT } from './reportText.it';
import type { Rule, RuleId, RuleText } from './rules';
import { RULE_TEXT_IT } from './rules.it';

const RULE_TEXT: Record<TranslatedLanguage, Record<RuleId, RuleText>> = { it: RULE_TEXT_IT };
const RELATION_EXPLANATION: Record<TranslatedLanguage, Record<RelationId, string>> = {
  it: RELATION_EXPLANATION_IT,
};
const OVERVIEW: Record<TranslatedLanguage, OverviewText> = { it: OVERVIEW_TEXT_IT };
const FORMAT_LABELS: Record<TranslatedLanguage, Record<FormatKey, string>> = {
  it: FORMAT_LABEL_IT,
};
const REPORT: Record<TranslatedLanguage, ReportText> = { it: REPORT_TEXT_IT };
const INCIDENT: Record<TranslatedLanguage, IncidentText> = { it: INCIDENT_TEXT_IT };

/** What the reader is told about a rule: causes and next steps. */
export function ruleText(rule: Rule, language: Language): RuleText {
  if (language === DEFAULT_LANGUAGE) {
    return rule;
  }
  return RULE_TEXT[language][rule.id];
}

/** The causes of a rule: the ones that quote the log when there are, else the fixed ones. */
export function ruleCauses(text: RuleText, details: LogDetails): string[] {
  return text.causesFor?.(details) ?? text.causes;
}

export function relationExplanation(relation: CausalRelation, language: Language): string {
  if (language === DEFAULT_LANGUAGE) {
    return relation.explanation;
  }
  return RELATION_EXPLANATION[language][relation.id];
}

export function overviewText(language: Language): OverviewText {
  if (language === DEFAULT_LANGUAGE) {
    return OVERVIEW_TEXT;
  }
  return OVERVIEW[language];
}

export function formatLabel(key: FormatKey, language: Language): string {
  if (language === DEFAULT_LANGUAGE) {
    return FORMAT_LABEL[key];
  }
  return FORMAT_LABELS[language][key];
}

export function reportText(language: Language): ReportText {
  if (language === DEFAULT_LANGUAGE) {
    return REPORT_TEXT;
  }
  return REPORT[language];
}

/** The words of the incident part of a report: root cause wording, impact, actions, headings. */
export function incidentText(language: Language): IncidentText {
  if (language === DEFAULT_LANGUAGE) {
    return INCIDENT_TEXT;
  }
  return INCIDENT[language];
}
