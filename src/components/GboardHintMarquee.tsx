import { useTranslation } from "@/contexts/TranslationContext";

const GboardHintMarquee = () => {
  const { t } = useTranslation();
  
  const hintText = t('gboardHint', '💡 Use Gboard & select your mother tongue for best typing experience');
  
  return (
    <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-1.5">
        <span className="text-xs text-primary font-medium mx-8">{hintText}</span>
        <span className="text-xs text-primary font-medium mx-8">{hintText}</span>
        <span className="text-xs text-primary font-medium mx-8">{hintText}</span>
        <span className="text-xs text-primary font-medium mx-8">{hintText}</span>
      </div>
    </div>
  );
};

export default GboardHintMarquee;
