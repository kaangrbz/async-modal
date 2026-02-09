import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import hi from './hi.json';
import it from './it.json';
import ja from './ja.json';
import ko from './ko.json';
import pt from './pt.json';
import ru from './ru.json';
import tr from './tr.json';
import zh from './zh.json';

const locales = { ar, de, en, es, fr, hi, it, ja, ko, pt, ru, tr, zh };

/**
 * Returns locale data for the given language code. Falls back to English if not found.
 * @param {string} lang - Language code (e.g. 'en', 'tr', 'es')
 * @returns {Object} Locale object
 */
export function getLocale(lang) {
  return locales[lang] || locales['en'];
}
