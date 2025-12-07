import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationContextType {
  t: (key: string, fallback?: string) => string;
  currentLanguage: string;
  setLanguage: (language: string) => void;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Default English UI strings - add more as needed
const defaultStrings: Record<string, string> = {
  // Navigation & Common
  'home': 'Home',
  'profile': 'Profile',
  'settings': 'Settings',
  'messages': 'Messages',
  'matches': 'Matches',
  'logout': 'Logout',
  'save': 'Save',
  'cancel': 'Cancel',
  'submit': 'Submit',
  'loading': 'Loading...',
  'search': 'Search',
  'filter': 'Filter',
  'back': 'Back',
  'next': 'Next',
  'continue': 'Continue',
  'done': 'Done',
  'edit': 'Edit',
  'delete': 'Delete',
  'view': 'View',
  'close': 'Close',
  
  // Auth
  'login': 'Login',
  'signup': 'Sign Up',
  'email': 'Email',
  'password': 'Password',
  'forgotPassword': 'Forgot Password?',
  'createAccount': 'Create Account',
  'alreadyHaveAccount': 'Already have an account?',
  'dontHaveAccount': "Don't have an account?",
  
  // Dashboard
  'welcome': 'Welcome',
  'dashboard': 'Dashboard',
  'onlineUsers': 'Online Users',
  'onlineMen': 'Online Men',
  'premiumUsers': 'Premium Users',
  'regularUsers': 'Regular Users',
  'todayEarnings': "Today's Earnings",
  'totalMatches': 'Total Matches',
  'activeChats': 'Active Chats',
  'recentActivity': 'Recent Activity',
  'quickActions': 'Quick Actions',
  'notifications': 'Notifications',
  'noNotifications': 'No new notifications',
  
  // Profile
  'fullName': 'Full Name',
  'age': 'Age',
  'gender': 'Gender',
  'country': 'Country',
  'state': 'State',
  'bio': 'Bio',
  'interests': 'Interests',
  'occupation': 'Occupation',
  'education': 'Education',
  'language': 'Language',
  'motherTongue': 'Mother Tongue',
  'photos': 'Photos',
  'uploadPhoto': 'Upload Photo',
  'selfie': 'Selfie',
  'verificationPhoto': 'Verification Photo',
  'profilePhotos': 'Profile Photos',
  
  // Chat
  'startChat': 'Start Chat',
  'sendMessage': 'Send Message',
  'typeMessage': 'Type a message...',
  'chatWith': 'Chat with',
  'online': 'Online',
  'offline': 'Offline',
  'lastSeen': 'Last seen',
  'sendGift': 'Send Gift',
  'chatEarnings': 'Chat Earnings',
  
  // Wallet
  'wallet': 'Wallet',
  'balance': 'Balance',
  'withdraw': 'Withdraw',
  'transactions': 'Transactions',
  'earnings': 'Earnings',
  'addFunds': 'Add Funds',
  
  // Shifts
  'shifts': 'Shifts',
  'startShift': 'Start Shift',
  'endShift': 'End Shift',
  'shiftHistory': 'Shift History',
  'scheduleShift': 'Schedule Shift',
  
  // Matching
  'findMatch': 'Find Match',
  'randomChat': 'Random Chat',
  'lookingForChat': 'Looking for a chat partner...',
  'matchFound': 'Match Found!',
  'noMatchesFound': 'No matches found',
  'sameLanguage': 'Same Language',
  'translationAvailable': 'Translation Available',
  
  // Status
  'verified': 'Verified',
  'premium': 'Premium',
  'new': 'New',
  'active': 'Active',
  'pending': 'Pending',
  'approved': 'Approved',
  'rejected': 'Rejected',
  
  // Errors
  'error': 'Error',
  'somethingWentWrong': 'Something went wrong',
  'tryAgain': 'Try Again',
  'networkError': 'Network error',
  
  // Success
  'success': 'Success',
  'savedSuccessfully': 'Saved successfully',
  'updatedSuccessfully': 'Updated successfully',
  
  // Settings
  'appearance': 'Appearance',
  'customizeAppLooks': 'Customize how the app looks',
  'theme': 'Theme',
  'light': 'Light',
  'dark': 'Dark',
  'system': 'System',
  'accentColor': 'Accent Color',
  'manageNotifications': 'Manage your notification preferences',
  'newMatches': 'New Matches',
  'sound': 'Sound',
  'vibration': 'Vibration',
  'promotions': 'Promotions',
  'languageRegion': 'Language & Region',
  'setLanguagePreferences': 'Set your language and translation preferences',
  'appLanguage': 'App Language',
  'languageDescription': 'Select your preferred language for the app interface',
  'autoTranslateMessages': 'Auto-translate Messages',
  'distanceUnit': 'Distance Unit',
  'kilometers': 'Kilometers',
  'miles': 'Miles',
  'privacy': 'Privacy',
  'controlPrivacy': 'Control your privacy and visibility',
  'showOnlineStatus': 'Show Online Status',
  'readReceipts': 'Read Receipts',
  'profileVisibility': 'Profile Visibility',
  'controlProfileVisibility': 'Control how often your profile appears to others in search results',
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'veryHigh': 'Very High',
  'rarelyShown': 'Rarely shown',
  'sometimesShown': 'Sometimes shown',
  'oftenShown': 'Often shown',
  'alwaysPrioritized': 'Always prioritized',
  'unsavedChanges': 'Unsaved changes',
  'saveChanges': 'Save Changes',
  'saving': 'Saving...',
};

// Cache for translations
const translationCache: Record<string, Record<string, string>> = {
  'English': defaultStrings,
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('English');
  const [translations, setTranslations] = useState<Record<string, string>>(defaultStrings);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's language preference on mount
  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check user_languages for mother tongue
        const { data: userLanguages } = await supabase
          .from('user_languages')
          .select('language_name')
          .eq('user_id', user.id)
          .limit(1);

        if (userLanguages && userLanguages.length > 0) {
          const language = userLanguages[0].language_name;
          if (language && language !== 'English') {
            setCurrentLanguage(language);
          }
        }
      } catch (error) {
        console.error('Error loading user language:', error);
      }
    };

    loadUserLanguage();
  }, []);

  // Translate UI when language changes
  useEffect(() => {
    const translateUI = async () => {
      if (currentLanguage === 'English') {
        setTranslations(defaultStrings);
        return;
      }

      // Check cache first
      if (translationCache[currentLanguage]) {
        setTranslations(translationCache[currentLanguage]);
        return;
      }

      setIsLoading(true);
      try {
        const textsToTranslate = Object.values(defaultStrings);
        
        const { data, error } = await supabase.functions.invoke('translate-ui', {
          body: {
            texts: textsToTranslate,
            targetLanguage: currentLanguage,
            sourceLanguage: 'English'
          }
        });

        if (error) {
          console.error('Translation error:', error);
          return;
        }

        if (data?.translations) {
          const keys = Object.keys(defaultStrings);
          const newTranslations: Record<string, string> = {};
          
          keys.forEach((key, index) => {
            newTranslations[key] = data.translations[index] || defaultStrings[key];
          });

          // Cache the translations
          translationCache[currentLanguage] = newTranslations;
          setTranslations(newTranslations);
        }
      } catch (error) {
        console.error('Error translating UI:', error);
      } finally {
        setIsLoading(false);
      }
    };

    translateUI();
  }, [currentLanguage]);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[key] || fallback || defaultStrings[key] || key;
  }, [translations]);

  const setLanguage = useCallback((language: string) => {
    setCurrentLanguage(language);
    // Save preference to localStorage for persistence
    localStorage.setItem('app_language', language);
  }, []);

  return (
    <TranslationContext.Provider value={{ t, currentLanguage, setLanguage, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
