import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import { changeLanguage, getCurrentLanguageName, getStaticLanguages, getNLLBLanguage } from '@/i18n';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const setLanguage = useCallback(async (language: string) => {
    setIsChangingLanguage(true);
    try {
      await changeLanguage(language);
    } finally {
      setIsChangingLanguage(false);
    }
  }, []);

  return {
    t,
    i18n,
    currentLanguage: i18n.language,
    currentLanguageName: getCurrentLanguageName(),
    setLanguage,
    isChangingLanguage,
    staticLanguages: getStaticLanguages(),
    getNLLBLanguage,
  };
};

export default useTranslation;
