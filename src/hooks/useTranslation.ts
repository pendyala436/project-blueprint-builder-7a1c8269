import { useTranslation as useContextTranslation } from '@/contexts/TranslationContext';

export const useTranslation = () => {
  const context = useContextTranslation();
  
  return {
    t: context.t,
    currentLanguage: context.currentLanguage,
    currentLanguageName: context.currentLanguage,
    setLanguage: context.setLanguage,
    isChangingLanguage: context.isLoading,
    staticLanguages: ['English'],
    getNLLBLanguage: () => undefined,
  };
};

export default useTranslation;