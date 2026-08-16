import { useLanguage } from '../../i18n/LanguageContext';
import styles from './languageToggle.module.css';

// ES | EN switch for the writer portal.
//
// A two-position switch rather than a dropdown: there are exactly two options,
// both are always visible, and the writer can see which one is active without
// opening anything. Rendered as a radio group so the two sides are announced
// as one choice and arrow keys move between them.
const LanguageToggle = ({ className = '' }) => {
  const { lang, setLang, t } = useLanguage();

  const options = [
    { value: 'es', label: t('lang.es'), title: t('lang.switchToSpanish') },
    { value: 'en', label: t('lang.en'), title: t('lang.switchToEnglish') },
  ];

  return (
    <div className={`${styles.toggle} ${className}`} role="radiogroup" aria-label={t('lang.label')} data-active={lang}>
      {/* Slides under whichever side is active. */}
      <span className={styles.thumb} aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={lang === o.value}
          className={`${styles.option} ${lang === o.value ? styles.optionActive : ''}`}
          onClick={() => setLang(o.value)}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
