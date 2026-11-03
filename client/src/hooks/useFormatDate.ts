import { formatDate } from '../lib/format';
import { useLanguage } from '../i18n/useLanguage';

/** `formatDate` already set to the page language, so a component only passes the date. */
export function useFormatDate(): (iso: string) => string {
  const { language } = useLanguage();
  return (iso) => formatDate(iso, language);
}
