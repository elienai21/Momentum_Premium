import strings from '../i18n/strings.json';

type Dict = typeof strings;
type Lang = keyof Dict;

export function useI18n() {
  const lang = (typeof navigator !== 'undefined' && navigator.language?.startsWith('pt')) ? 'pt-BR' : 'en-US';
  function t(key: keyof Dict['pt-BR']) {
    const table: any = (strings as any)[lang as Lang] || (strings as any)['en-US'];
    return table[key] ?? key;
  }
  return { t, lang: lang as Lang };
}
