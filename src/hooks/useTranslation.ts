import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { changeLanguage, getCurrentLanguageName, isLanguageAvailable, getAvailableLanguages } from '@/i18n';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  const setLanguage = useCallback((language: string) => {
    changeLanguage(language);
  }, []);

  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    currentLanguageName: getCurrentLanguageName(),
    setLanguage,
    isLanguageAvailable,
    availableLanguages: getAvailableLanguages(),
  };
};

export default useTranslation;
