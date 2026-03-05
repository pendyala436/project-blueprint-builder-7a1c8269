// I18nProvider stub - no longer wraps children in translation context
// Kept for backwards compatibility but does nothing
import React, { memo } from 'react';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = memo(({ children }) => (
  <>{children}</>
));
I18nProvider.displayName = 'I18nProvider';
export default I18nProvider;
