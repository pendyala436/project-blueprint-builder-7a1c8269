import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationContextType {
  t: (key: string, fallback?: string) => string;
  translateDynamic: (text: string) => Promise<string>;
  translateDynamicBatch: (texts: string[]) => Promise<string[]>;
  currentLanguage: string;
  setLanguage: (language: string) => void;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Storage keys
const TRANSLATIONS_CACHE_KEY = 'translations_cache';
const DYNAMIC_CACHE_KEY = 'dynamic_translations_cache';
const LANGUAGE_KEY = 'app_language';

// Default English UI strings - comprehensive app-wide translations
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
  'refresh': 'Refresh',
  'all': 'All',
  'confirm': 'Confirm',
  'yes': 'Yes',
  'no': 'No',
  'ok': 'OK',
  'retry': 'Retry',
  'add': 'Add',
  'remove': 'Remove',
  'update': 'Update',
  'create': 'Create',
  'select': 'Select',
  'send': 'Send',
  'receive': 'Receive',
  'apply': 'Apply',
  'reset': 'Reset',
  'clear': 'Clear',
  'to': 'To',
  'from': 'From',
  'of': 'of',
  'readyToConnect': 'Ready to make new connections today?',
  
  // Auth Screen
  'login': 'Login',
  'signup': 'Sign Up',
  'email': 'Email',
  'emailAddress': 'Email Address',
  'enterYourEmail': 'Enter your email',
  'password': 'Password',
  'enterYourPassword': 'Enter your password',
  'forgotPassword': 'Forgot Password?',
  'createAccount': 'Create an Account',
  'alreadyHaveAccount': 'Already have an account?',
  'dontHaveAccount': "Don't have an account?",
  'welcomeBack': 'Welcome back!',
  'loginSuccessful': 'Login successful.',
  'loginFailed': 'Login failed',
  'loggingIn': 'Logging in...',
  'newHere': 'New here?',
  'findYourPurrfectMatch': 'Find your purrfect match',
  'resetPassword': 'Reset Password',
  'sendResetLink': 'Send Reset Link',
  'resetLinkSent': 'Reset link sent!',
  'checkYourEmail': 'Check Your Email',
  'weSentResetLink': "We've sent a password reset link to your email address",
  'enterEmailForReset': "Enter your email address and we'll send you a link to reset your password",
  'linkExpiresIn': 'The link expires in 30 minutes',
  'didntReceiveEmail': "Didn't receive the email? Check your spam folder or",
  'rememberPassword': 'Remember your password?',
  'backToLogin': 'Back to Login',
  'emailNotFound': 'Email not found',
  'noAccountFound': 'No account found with this email address. Please check and try again.',
  'failedToSendResetLink': 'Failed to send reset link',
  'sending': 'Sending...',
  'passwordRequired': 'Password is required',
  'passwordMinLength': 'Password must be at least 8 characters',
  
  // Dashboard
  'welcome': 'Welcome',
  'dashboard': 'Dashboard',
  'onlineUsers': 'Online Users',
  'onlineMen': 'Online Men',
  'onlineWomen': 'Online Women',
  'premiumUsers': 'Premium Users',
  'regularUsers': 'Regular Users',
  'todayEarnings': "Today's Earnings",
  'totalMatches': 'Total Matches',
  'activeChats': 'Active Chats',
  'recentActivity': 'Recent Activity',
  'quickActions': 'Quick Actions',
  'notifications': 'Notifications',
  'noNotifications': 'No new notifications',
  'rechargeWallet': 'Recharge Wallet',
  'walletBalance': 'Wallet Balance',
  'myWallet': 'My Wallet',
  'availableBalance': 'Available Balance',
  'startExploring': 'Start Exploring',
  'startExploringToGetMatches': 'Start exploring to get matches and notifications!',
  'boostYourProfile': 'Boost your profile!',
  'getMoreMatchesWithPremium': 'Get more matches with premium features',
  'upgrade': 'Upgrade',
  'yourLanguage': 'Your Language',
  'youWillBeConnectedWith': "You'll be connected with women who speak",
  'messagesAutoTranslated': 'Messages are auto-translated.',
  'indianPaymentMethods': 'Indian Payment Methods',
  'internationalPaymentMethods': 'International Payment Methods',
  'selectAmount': 'Select Amount',
  'yourCurrency': 'Your currency',
  'pricesShownInLocal': 'Prices shown in your local currency (stored as INR)',
  'addedToWallet': 'added to your wallet',
  'rechargeFailed': 'Recharge Failed',
  'pleaseTryAgain': 'Please try again later',
  
  // Profile
  'fullName': 'Full Name',
  'enterYourFullName': 'Enter your full name',
  'age': 'Age',
  'yearsOld': 'years old',
  'gender': 'Gender',
  'male': 'Male',
  'female': 'Female',
  'nonBinary': 'Non-Binary',
  'preferNotToSay': 'Prefer not to say',
  'country': 'Country',
  'state': 'State',
  'bio': 'Bio',
  'interests': 'Interests',
  'occupation': 'Occupation',
  'education': 'Education',
  'language': 'Language',
  'motherTongue': 'Mother Tongue',
  'alsoSpeaks': 'Also speaks',
  'photos': 'Photos',
  'uploadPhoto': 'Upload Photo',
  'selfie': 'Selfie',
  'selfieForVerification': 'Selfie for Verification',
  'verificationPhoto': 'Verification Photo',
  'profilePhotos': 'Profile Photos',
  'additionalPhotos': 'Additional Photos',
  'addPhotos': 'Add Your Photos',
  'takeSelfie': 'Take a Selfie',
  'positionFaceInCircle': 'Position your face in the circle',
  'takeASelfieForVerification': 'Take a selfie for verification, then add more photos',
  'retake': 'Retake',
  'verify': 'Verify',
  'verifying': 'Verifying',
  'addUpToPhotos': 'Add up to 5 more photos to your profile',
  'maxPhotosReached': 'Maximum photos reached',
  'invalidFileType': 'Invalid file type',
  'pleaseUploadImage': 'Please upload an image file (JPG, PNG, etc.)',
  'fileTooLarge': 'File too large',
  'pleaseUploadSmaller': 'Please upload an image smaller than 10MB',
  'cameraAccessDenied': 'Camera access denied',
  'allowCameraAccess': 'Please allow camera access to take a selfie',
  'aiVerificationInProgress': 'AI Verification in progress...',
  'selfieNotVerified': 'Selfie not verified',
  'pleaseVerifySelfie': 'Please verify your selfie before continuing',
  'verificationIssue': 'Verification issue',
  'tryTakingClearerSelfie': 'Please try taking a clearer selfie',
  'verificationFailed': 'Verification failed',
  
  // Basic Info
  'tellUsAboutYou': 'Tell us about you',
  'helpUsPersonalize': 'Help us personalize your experience',
  'phoneNumber': 'Phone Number',
  'enterPhoneNumber': 'Enter phone number',
  'dateOfBirth': 'Date of Birth',
  'selectYourBirthday': 'Select your birthday',
  'pleaseCompleteAllFields': 'Please complete all fields',
  'allInfoRequired': 'All information is required to continue.',
  'lookingGreat': 'Looking great!',
  'basicInfoSaved': 'Your basic info has been saved.',
  'emailRequired': 'Email is required',
  'pleaseEnterValidEmail': 'Please enter a valid email',
  'fullNameRequired': 'Full name is required',
  'nameMustBeAtLeast': 'Name must be at least 2 characters',
  'nameMustBeLessThan': 'Name must be less than 50 characters',
  'pleaseEnterValidName': 'Please enter a valid name',
  'dateOfBirthRequired': 'Date of birth is required',
  'mustBeAtLeast18': 'You must be at least 18 years old',
  'pleaseEnterValidDob': 'Please enter a valid date of birth',
  'pleaseSelectGender': 'Please select your gender',
  'phoneRequired': 'Phone number is required',
  'pleaseEnterValidPhone': 'Please enter a valid phone number',
  
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
  'currentlyOnline': 'Currently Online',
  'currentlyOffline': 'Currently Offline',
  'availableToChatNow': 'Available to chat now',
  'lastActive': 'Last active',
  'addFriend': 'Add Friend',
  'removeFriend': 'Remove Friend',
  'blockUser': 'Block User',
  'unblockUser': 'Unblock User',
  'reportUser': 'Report User',
  'friendAdded': 'Friend added!',
  'friendRemoved': 'Friend removed',
  'userBlocked': 'User blocked',
  'userUnblocked': 'User unblocked',
  'confirmBlock': 'Are you sure you want to block this user?',
  'youWontReceiveMessages': 'You will no longer receive messages from them.',
  'blockedByUser': 'You have been blocked by this user',
  'cannotSendMessage': 'Cannot send message',
  
  // Wallet
  'wallet': 'Wallet',
  'balance': 'Balance',
  'withdraw': 'Withdraw',
  'transactions': 'Transactions',
  'earnings': 'Earnings',
  'addFunds': 'Add Funds',
  'transactionHistory': 'Transaction History',
  'rechargeSuccessful': 'Recharge Successful!',
  'withdrawalInitiated': 'Withdrawal initiated!',
  'totalEarned': 'Total Earned',
  'pendingWithdrawals': 'Pending Withdrawals',
  'withdrawFunds': 'Withdraw Funds',
  'requestWithdrawal': 'Request Withdrawal',
  'minimumBalance': 'Minimum balance',
  'insufficientBalance': 'Insufficient Balance',
  'youNeedMore': 'You need more to withdraw',
  'requestSubmitted': 'Request Submitted',
  'withdrawalRequestSubmitted': 'Your withdrawal request has been submitted for approval',
  'noEarningsYet': 'No earnings yet',
  'startChattingToEarn': 'Start chatting to earn money!',
  'noWithdrawalRequests': 'No withdrawal requests',
  'amountInr': 'Amount (INR)',
  'enterAmount': 'Enter amount',
  'choosePayoutMethod': 'Choose Payout Method',
  'payoneer': 'Payoneer',
  'wise': 'Wise',
  'cashfree': 'Cashfree',
  'globalPayout': 'Global payout for all countries',
  'fastCheapTransfers': 'Fast & cheap international transfers',
  'instantInrPayout': 'Instant INR payout for India',
  'worldwide': 'Worldwide',
  'indiaOnly': 'India Only',
  'chatEarning': 'Chat Earning',
  'giftEarning': 'Gift Earning',
  'bonusEarning': 'Bonus Earning',
  'pending': 'Pending',
  'approved': 'Approved',
  'completed': 'Completed',
  'rejected': 'Rejected',
  'paymentMethod': 'Payment Method',
  'withdrawalMethod': 'Withdrawal Method',
  'selectPaymentMethod': 'Select payment method',
  'selectWithdrawalMethod': 'Select withdrawal method',
  'upi': 'UPI',
  'bankTransfer': 'Bank Transfer',
  'paytmWallet': 'Paytm Wallet',
  'instantTransferToUpi': 'Instant transfer to UPI ID',
  'neftImpsToBank': 'NEFT/IMPS to bank account',
  'transferToPaytm': 'Transfer to Paytm',
  'enterUpiId': 'Enter UPI ID',
  'accountNumber': 'Account Number',
  'ifscCode': 'IFSC Code',
  'accountHolderName': 'Account Holder Name',
  'paytmNumber': 'Paytm Number',
  'willBeCreditedIn24Hours': 'Will be credited within 24 hours',
  'rechargeAmounts': 'Recharge Amounts',
  'withdrawalAmounts': 'Withdrawal Amounts',
  'cardsApplePayGooglePay': 'Cards, Apple Pay, Google Pay',
  'countriesSupported': 'countries supported',
  'upiCardsNetbanking': 'UPI, Cards, Netbanking',
  'globalPayments': 'Global Payments',
  'internationalTransfers': 'International Transfers',
  
  // Shifts
  'shifts': 'Shifts',
  'startShift': 'Start Shift',
  'endShift': 'End Shift',
  'shiftHistory': 'Shift History',
  'scheduleShift': 'Schedule Shift',
  'shiftManagement': 'Shift Management',
  'onShift': 'On Shift',
  'offDuty': 'Off Duty',
  'currentShift': 'Current Shift',
  'noActiveShift': 'No active shift',
  'startYourShift': 'Start your shift to begin earning',
  'shiftStarted': 'Shift started!',
  'shiftEnded': 'Shift ended!',
  'workedHours': 'You worked hours',
  'earnedAmount': 'and earned',
  'today': 'Today',
  'thisWeek': 'This Week',
  'thisMonth': 'This Month',
  'totalShifts': 'Total Shifts',
  'totalHours': 'Total Hours',
  'avgPerHour': 'Avg Per Hour',
  'scheduledShifts': 'Scheduled Shifts',
  'upcomingShifts': 'Upcoming Shifts',
  'bookShift': 'Book Shift',
  'bookShiftForToday': 'Book shift for today',
  'cancelShift': 'Cancel Shift',
  'shiftCancelled': 'Shift cancelled',
  'applyLeave': 'Apply Leave',
  'leaveApplied': 'Leave applied',
  'leaveAutoApproved': 'Leave auto-approved by AI',
  'selectDate': 'Select date',
  'leaveReason': 'Leave reason',
  'leaveType': 'Leave type',
  'casualLeave': 'Casual leave',
  'sickLeave': 'Sick leave',
  'personalLeave': 'Personal leave',
  'generateAiSchedule': 'Generate AI Schedule',
  'aiScheduleGenerated': 'AI schedule generated with week offs!',
  'weekOffs': 'Week Offs',
  'justStarted': 'Just Started',
  'inProgress': 'In Progress',
  'targetReached': 'Target Reached!',
  'extendedShift': 'Extended Shift',
  'shiftProgress': 'Shift Progress',
  'shiftDuration': 'Shift Duration',
  
  // Matching
  'findMatch': 'Find Match',
  'randomChat': 'Random Chat',
  'lookingForChat': 'Looking for a chat partner...',
  'matchFound': 'Match Found!',
  'noMatchesFound': 'No matches found',
  'sameLanguage': 'Same Language',
  'translationAvailable': 'Translation Available',
  'like': 'Like',
  'liked': 'Liked',
  'chat': 'Chat',
  'noOneOnlineRightNow': 'No one online right now',
  'checkBackLater': 'Check back later to find users matching your preferences',
  'backToDashboard': 'Back to Dashboard',
  'onlineNow': 'Online Now',
  'browseOnlineUsers': 'Browse users who are online right now',
  'alreadyMatched': 'Already matched!',
  'youveAlreadyConnectedWith': "You've already connected with",
  'waitingForResponse': 'Waiting for them to respond!',
  'noMoreUsers': 'No more users',
  'checkBackLaterForMore': 'Check back later for more online users!',
  'matchScore': 'Match Score',
  'commonLanguages': 'Common Languages',
  'viewProfile': 'View Profile',
  'loadMoreMatches': 'Load More Matches',
  'filtersApplied': 'Filters Applied',
  'resetFilters': 'Reset Filters',
  'findingUsers': 'Finding users who speak',
  'accessDenied': 'Access Denied',
  'featureOnlyForMale': 'This feature is only available for male users',
  'failedToLoadUsers': 'Failed to load available users',
  'searchingForUsers': 'Searching for available users...',
  'connectingTo': 'Connecting to',
  'noOneAvailable': 'No one available',
  'allUsersBusy': 'All users are currently busy. Please try again later.',
  'connectionFailed': 'Connection failed',
  'unableToFindUsers': 'Unable to find available users. Please try again later.',
  'pleaseRechargeWallet': 'Please recharge your wallet to start chatting',
  'connected': 'Connected!',
  'youreNowChattingWith': "You're now chatting with",
  'pleaseRecharge': 'Please recharge to continue',
  'quickConnect': 'Quick Connect',
  'noUsersOnlineWithLanguage': 'No users are currently online with matching language',
  'aiVerified': 'AI Verified',
  'inShift': 'In Shift',
  'busy': 'Busy',
  'available': 'Available',
  
  // Gifts
  'gifts': 'Gifts',
  'sendAGift': 'Send a Gift',
  'searchGifts': 'Search gifts...',
  'noGiftsFound': 'No gifts found',
  'confirmGift': 'Confirm Gift',
  'youreAboutToSend': "You're about to send a gift to",
  'addMessage': 'Add a message (optional)',
  'writeASweetMessage': 'Write a sweet message...',
  'sendGiftButton': 'Send Gift',
  'giftSent': 'Gift Sent!',
  'yourGiftHasBeenSent': 'Your gift has been sent to',
  'sendAnother': 'Send Another',
  'rechargeNow': 'Recharge now',
  'toSomeoneSpecial': 'someone special',
  
  // Status
  'verified': 'Verified',
  'premium': 'Premium',
  'priority': 'Priority',
  'new': 'New',
  'active': 'Active',
  
  // Errors
  'error': 'Error',
  'somethingWentWrong': 'Something went wrong',
  'tryAgain': 'Try Again',
  'networkError': 'Network error',
  'failedToLoad': 'Failed to load',
  'profileNotFound': 'Profile not found',
  'thisUserProfileDoesntExist': "This user profile doesn't exist",
  'goBack': 'Go Back',
  'failedToLoadData': 'Failed to load data',
  'failedToSave': 'Failed to save',
  'failedToUpdate': 'Failed to update',
  'failedToDelete': 'Failed to delete',
  'failedToSendGift': 'Failed to send gift. Please try again.',
  'failedToStartShift': 'Failed to start shift',
  'failedToEndShift': 'Failed to end shift',
  'failedToBookShift': 'Failed to book shift',
  'failedToApplyLeave': 'Failed to apply leave',
  'failedToCancelShift': 'Failed to cancel shift',
  'failedToGenerateSchedule': 'Failed to generate AI schedule',
  'failedToLoadWallet': 'Failed to load wallet data',
  'failedToSubmitWithdrawal': 'Failed to submit withdrawal request',
  'invalidAmount': 'Invalid Amount',
  'pleaseEnterValidAmount': 'Please enter a valid amount',
  'paymentMethodRequired': 'Payment Method Required',
  'pleaseSelectPaymentMethod': 'Please select a payment method',
  'minimumNotMet': 'Minimum Not Met',
  'failedToLoadChat': 'Failed to load chat',
  
  // Success
  'success': 'Success',
  'savedSuccessfully': 'Saved successfully',
  'updatedSuccessfully': 'Updated successfully',
  'photosSaved': 'Photos saved!',
  'yourPhotosSaved': 'Your photos have been saved',
  'selfieVerified': 'Selfie verified!',
  'identityVerified': 'Your identity has been successfully verified',
  'settingsSavedSuccessfully': 'Settings saved successfully!',
  
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
  'autoTranslate': 'Auto-Translate Messages',
  'autoTranslateDescription': 'Automatically translate messages to your language',
  'distanceUnit': 'Distance Unit',
  'kilometers': 'Kilometers',
  'miles': 'Miles',
  'chatSettings': 'Chat Settings',
  'manageChatPreferences': 'Manage your chat preferences',
  'readReceipts': 'Read Receipts',
  'readReceiptsDescription': 'Let others know when you\'ve read their messages',
  'showOnlineStatus': 'Show Online Status',
  'showOnlineDescription': 'Let others see when you\'re online',
  'privacy': 'Privacy',
  'managePrivacy': 'Manage who can see your profile',
  'profileVisibility': 'Profile Visibility',
  'everyone': 'Everyone',
  'matchesOnly': 'Matches Only',
  'noOne': 'No One',
  'account': 'Account',
  'manageAccount': 'Manage your account settings',
  'changePassword': 'Change Password',
  'deleteAccount': 'Delete Account',
  'dangerZone': 'Danger Zone',
  'deleteAccountWarning': 'Once you delete your account, there is no going back',
  'saveSettings': 'Save Settings',
  'savingSettings': 'Saving settings...',
  'privacySecurity': 'Privacy & Security',
  'managePrivacySettings': 'Manage your privacy and security settings',
  'blockedUsers': 'Blocked Users',
  'viewBlockedUsers': 'View and manage blocked users',
  'dataDownload': 'Download Your Data',
  'downloadDataDescription': 'Get a copy of your data',
  'helpSupport': 'Help & Support',
  'getHelp': 'Get help and contact support',
  'faq': 'FAQ',
  'contactSupport': 'Contact Support',
  'reportBug': 'Report a Bug',
  'termsOfService': 'Terms of Service',
  'privacyPolicy': 'Privacy Policy',
  'about': 'About',
  'version': 'Version',
  'signOut': 'Sign Out',
  'areYouSureSignOut': 'Are you sure you want to sign out?',
  
  // Registration Flow
  'chooseYourLanguage': 'Choose Your Language',
  'selectLanguagesYouSpeak': 'Select the languages you speak fluently',
  'primary': 'Primary',
  'secondary': 'Secondary',
  'selectCountry': 'Select Country',
  'selectState': 'Select State',
  'whereAreYouFrom': 'Where are you from?',
  'helpUsConnectYou': 'Help us connect you with nearby users',
  'languagePreferences': 'Language Preferences',
  'setUpLanguagePreferences': 'Set up your language preferences for chatting',
  'yourMotherTongue': 'Your Mother Tongue',
  'selectPrimaryLanguage': 'Select your primary language',
  'additionalLanguages': 'Additional Languages',
  'optionalAdditionalLanguages': 'Optional: Select additional languages you speak',
  'languagesSaved': 'Languages saved!',
  'yourLanguagePreferencesSaved': 'Your language preferences have been saved',
  'failedToSaveLanguages': 'Failed to save language preferences',
  'location': 'Location',
  'setupYourLocation': 'Set up your location',
  'locationSaved': 'Location saved!',
  'yourLocationSaved': 'Your location has been saved',
  'failedToSaveLocation': 'Failed to save location',
  'selectYourCountry': 'Select your country',
  'selectYourState': 'Select your state',
  
  // Terms Agreement
  'termsAndConditions': 'Terms and Conditions',
  'agreeTo': 'I agree to the',
  'and': 'and',
  'termsAgreement': 'Terms Agreement',
  'pleaseReadAndAgree': 'Please read and agree to our terms',
  'iAgreeToTerms': 'I agree to the Terms of Service',
  'iAgreeToPrivacy': 'I agree to the Privacy Policy',
  'iAmOver18': 'I confirm that I am over 18 years old',
  'agreeAndContinue': 'Agree & Continue',
  'pleaseAgreeToAll': 'Please agree to all terms to continue',
  'gdprConsent': 'GDPR Consent',
  'gdprConsentDescription': 'I consent to the processing of my personal data',
  'dpdpConsent': 'DPDP Consent',
  'dpdpConsentDescription': 'I consent under India\'s Digital Personal Data Protection Act',
  'ccpaConsent': 'CCPA Consent',
  'ccpaConsentDescription': 'I understand my rights under California Consumer Privacy Act',
  
  // AI Processing
  'aiProcessing': 'AI Processing',
  'verifyingYourProfile': 'Verifying your profile...',
  'pleaseWait': 'Please wait',
  'processingYourPhotos': 'Processing your photos',
  'verifyingAge': 'Verifying age',
  'detectingLanguage': 'Detecting language',
  'finalizingProfile': 'Finalizing profile',
  'almostDone': 'Almost done!',
  'processingComplete': 'Processing complete!',
  'yourProfileIsReady': 'Your profile is ready',
  'startMeeting': 'Start Meeting People',
  
  // Approval Pending
  'approvalPending': 'Approval Pending',
  'profileUnderReview': 'Your profile is under review',
  'weWillNotifyYou': 'We will notify you once your profile is approved',
  'estimatedTime': 'Estimated time',
  'hours': 'hours',
  'whileYouWait': 'While you wait',
  'completeYourProfile': 'Complete your profile to increase approval chances',
  'addMorePhotos': 'Add more photos',
  'writeABio': 'Write a bio',
  'addInterests': 'Add interests',
  
  // Women Dashboard
  'womenDashboard': 'Dashboard',
  'availableForChat': 'Available for Chat',
  'yourStatus': 'Your Status',
  'toggleAvailability': 'Toggle your availability for chat',
  'noMenOnlineYet': 'No men online yet',
  'checkBackLaterForMen': 'Check back later to find men looking to chat',
  'startShiftToChat': 'Start your shift to begin chatting and earning',
  'shiftRequired': 'Shift Required',
  'mustBeOnShift': 'You must be on shift to chat with users',
  
  // Women Wallet
  'womenWallet': 'Wallet',
  'yourEarnings': 'Your Earnings',
  'totalBalance': 'Total Balance',
  'withdrawableBalance': 'Withdrawable Balance',
  'lifetimeEarnings': 'Lifetime Earnings',
  'thisMonthEarnings': 'This Month',
  'lastMonthEarnings': 'Last Month',
  'earningsBreakdown': 'Earnings Breakdown',
  'chatMinutes': 'Chat Minutes',
  'giftsReceived': 'Gifts Received',
  'bonuses': 'Bonuses',
  'recentEarnings': 'Recent Earnings',
  'noRecentEarnings': 'No recent earnings',
  
  // Profile Detail
  'profileDetail': 'Profile',
  'aboutMe': 'About Me',
  'noAboutInfo': 'No information provided',
  'details': 'Details',
  'lookingFor': 'Looking For',
  'relationship': 'Relationship',
  'friendship': 'Friendship',
  'casual': 'Casual',
  'height': 'Height',
  'bodyType': 'Body Type',
  'slim': 'Slim',
  'average': 'Average',
  'athletic': 'Athletic',
  'curvy': 'Curvy',
  'religion': 'Religion',
  'smoking': 'Smoking',
  'drinking': 'Drinking',
  'never': 'Never',
  'sometimes': 'Sometimes',
  'often': 'Often',
  'social': 'Social',
  'regular': 'Regular',
  'nonSmoker': 'Non-smoker',
  'socialDrinker': 'Social drinker',
  'maritalStatus': 'Marital Status',
  'single': 'Single',
  'divorced': 'Divorced',
  'widowed': 'Widowed',
  'separated': 'Separated',
  'children': 'Children',
  'hasChildren': 'Has children',
  'noChildren': 'No children',
  'wantsChildren': 'Wants children',
  'doesntWantChildren': "Doesn't want children",
  'maybeChildren': 'Maybe',
  'lifestyle': 'Lifestyle',
  'fitnessLevel': 'Fitness Level',
  'notActive': 'Not active',
  'lightlyActive': 'Lightly active',
  'moderatelyActive': 'Moderately active',
  'veryActive': 'Very active',
  'dietaryPreference': 'Dietary Preference',
  'noDietPreference': 'No preference',
  'vegetarian': 'Vegetarian',
  'vegan': 'Vegan',
  'pescatarian': 'Pescatarian',
  'halal': 'Halal',
  'kosher': 'Kosher',
  'petPreference': 'Pet Preference',
  'noPets': 'No pets',
  'hasPets': 'Has pets',
  'likesPets': 'Likes pets',
  'travelFrequency': 'Travel Frequency',
  'rarely': 'Rarely',
  'yearly': 'A few times a year',
  'monthly': 'Monthly',
  'frequently': 'Frequently',
  'personalityType': 'Personality Type',
  'introvert': 'Introvert',
  'extrovert': 'Extrovert',
  'ambivert': 'Ambivert',
  'lifeGoals': 'Life Goals',
  'career': 'Career focused',
  'family': 'Family focused',
  'travel': 'Travel & adventure',
  'creative': 'Creative pursuits',
  'spiritual': 'Spiritual growth',
  'zodiacSign': 'Zodiac Sign',
  'educationLevel': 'Education',
  'highSchool': 'High School',
  'someCollege': 'Some College',
  'bachelors': "Bachelor's Degree",
  'masters': "Master's Degree",
  'doctorate': 'Doctorate',
  'professional': 'Professional Degree',
  
  // Admin
  'admin': 'Admin',
  'adminDashboard': 'Admin Dashboard',
  'userManagement': 'User Management',
  'contentModeration': 'Content Moderation',
  'analytics': 'Analytics',
  'systemSettings': 'System Settings',
  'totalUsers': 'Total Users',
  'activeUsers': 'Active Users',
  'pendingApprovals': 'Pending Approvals',
  'reportedContent': 'Reported Content',
  'revenue': 'Revenue',
  'dailyActive': 'Daily Active',
  'weeklyActive': 'Weekly Active',
  'monthlyActive': 'Monthly Active',
  'approveUser': 'Approve User',
  'rejectUser': 'Reject User',
  'suspendUser': 'Suspend User',
  'banUser': 'Ban User',
  'viewDetails': 'View Details',
  'moderationQueue': 'Moderation Queue',
  'flaggedMessages': 'Flagged Messages',
  'userReports': 'User Reports',
  'takeAction': 'Take Action',
  'dismiss': 'Dismiss',
  'warn': 'Warn',
  'suspend': 'Suspend',
  'ban': 'Ban',
  
  // Time
  'justNow': 'Just now',
  'minutesAgo': 'minutes ago',
  'hoursAgo': 'hours ago',
  'daysAgo': 'days ago',
  'yesterday': 'Yesterday',
  'minute': 'minute',
  'minutes': 'minutes',
  'hour': 'hour',
  'day': 'day',
  'days': 'days',
  'week': 'week',
  'weeks': 'weeks',
  'month': 'month',
  'months': 'months',
  'year': 'year',
  'years': 'years',
  
  // Misc
  'or': 'or',
  'with': 'with',
  'for': 'for',
  'by': 'by',
  'at': 'at',
  'in': 'in',
  'on': 'on',
  'the': 'the',
  'a': 'a',
  'an': 'an',
  'is': 'is',
  'are': 'are',
  'was': 'was',
  'were': 'were',
  'be': 'be',
  'been': 'been',
  'being': 'being',
  'have': 'have',
  'has': 'has',
  'had': 'had',
  'do': 'do',
  'does': 'does',
  'did': 'did',
  'will': 'will',
  'would': 'would',
  'could': 'could',
  'should': 'should',
  'may': 'may',
  'might': 'might',
  'must': 'must',
  'shall': 'shall',
  'can': 'can',
  'not': 'not',
  'this': 'this',
  'that': 'that',
  'these': 'these',
  'those': 'those',
  'here': 'here',
  'there': 'there',
  'where': 'where',
  'when': 'when',
  'why': 'why',
  'how': 'how',
  'what': 'what',
  'which': 'which',
  'who': 'who',
  'whom': 'whom',
  'whose': 'whose',
  
  // Profile related
  'profileIncomplete': 'Profile Incomplete',
  'completeProfile': 'Complete Profile',
  'editProfile': 'Edit Profile',
  'viewFullProfile': 'View Full Profile',
  'shareProfile': 'Share Profile',
  'copyProfileLink': 'Copy Profile Link',
  'linkCopied': 'Link Copied!',
  'profileLinkCopied': 'Profile link copied to clipboard',
};

// Synchronous cache - loaded from localStorage on init
let memoryCache: Record<string, Record<string, string>> = {
  'English': defaultStrings,
};

let dynamicMemoryCache: Record<string, Record<string, string>> = {};

// Initialize cache from localStorage synchronously
const initCacheFromStorage = () => {
  try {
    const cached = localStorage.getItem(TRANSLATIONS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      memoryCache = { ...memoryCache, ...parsed };
    }
    
    const dynamicCached = localStorage.getItem(DYNAMIC_CACHE_KEY);
    if (dynamicCached) {
      dynamicMemoryCache = JSON.parse(dynamicCached);
    }
  } catch (e) {
    console.error('Error loading translation cache:', e);
  }
};

// Initialize on module load for instant access
initCacheFromStorage();

// Save cache to localStorage (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const saveToStorage = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(TRANSLATIONS_CACHE_KEY, JSON.stringify(memoryCache));
      localStorage.setItem(DYNAMIC_CACHE_KEY, JSON.stringify(dynamicMemoryCache));
    } catch (e) {
      console.error('Error saving translation cache:', e);
    }
  }, 100);
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  // Get initial language synchronously from localStorage
  const initialLanguage = localStorage.getItem(LANGUAGE_KEY) || 'English';
  
  const [currentLanguage, setCurrentLanguage] = useState<string>(initialLanguage);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get translations synchronously from memory cache
  const translations = useMemo(() => {
    return memoryCache[currentLanguage] || defaultStrings;
  }, [currentLanguage]);

  // Load user's language preference from database (only if not set in localStorage)
  useEffect(() => {
    const loadUserLanguage = async () => {
      const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) return; // Already have preference

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userLanguages } = await supabase
          .from('user_languages')
          .select('language_name')
          .eq('user_id', user.id)
          .limit(1);

        if (userLanguages && userLanguages.length > 0) {
          const language = userLanguages[0].language_name;
          if (language && language !== 'English') {
            localStorage.setItem(LANGUAGE_KEY, language);
            setCurrentLanguage(language);
          }
        }
      } catch (error) {
        console.error('Error loading user language:', error);
      }
    };

    loadUserLanguage();
  }, []);

  // Translate UI when language changes (background task - doesn't block rendering)
  useEffect(() => {
    const translateUI = async () => {
      if (currentLanguage === 'English') return;
      
      // If already cached, no need to fetch
      if (memoryCache[currentLanguage]) return;

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

          // Update memory cache
          memoryCache[currentLanguage] = newTranslations;
          saveToStorage();
        }
      } catch (error) {
        console.error('Error translating UI:', error);
      } finally {
        setIsLoading(false);
      }
    };

    translateUI();
  }, [currentLanguage]);

  // Ultra-fast synchronous translation lookup (~0.1ms)
  const t = useCallback((key: string, fallback?: string): string => {
    const cache = memoryCache[currentLanguage];
    if (cache && cache[key]) return cache[key];
    return fallback || defaultStrings[key] || key;
  }, [currentLanguage]);

  // Translate a single dynamic text (from database)
  const translateDynamic = useCallback(async (text: string): Promise<string> => {
    if (!text || currentLanguage === 'English') return text;
    
    // Check memory cache first (instant)
    if (dynamicMemoryCache[currentLanguage]?.[text]) {
      return dynamicMemoryCache[currentLanguage][text];
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-ui', {
        body: {
          texts: [text],
          targetLanguage: currentLanguage,
          sourceLanguage: 'English'
        }
      });
      
      if (error || !data?.translations?.[0]) return text;
      
      // Cache the result
      if (!dynamicMemoryCache[currentLanguage]) {
        dynamicMemoryCache[currentLanguage] = {};
      }
      dynamicMemoryCache[currentLanguage][text] = data.translations[0];
      saveToStorage();
      
      return data.translations[0];
    } catch (error) {
      console.error('Error translating dynamic text:', error);
      return text;
    }
  }, [currentLanguage]);

  // Translate multiple dynamic texts in batch
  const translateDynamicBatch = useCallback(async (texts: string[]): Promise<string[]> => {
    if (!texts.length || currentLanguage === 'English') return texts;
    
    // Check which texts need translation
    const textsToTranslate: string[] = [];
    const cachedResults: Record<number, string> = {};
    
    texts.forEach((text, index) => {
      if (!text) {
        cachedResults[index] = text;
      } else if (dynamicMemoryCache[currentLanguage]?.[text]) {
        cachedResults[index] = dynamicMemoryCache[currentLanguage][text];
      } else {
        textsToTranslate.push(text);
      }
    });
    
    // If all cached, return immediately (instant)
    if (textsToTranslate.length === 0) {
      return texts.map((_, index) => cachedResults[index] || texts[index]);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-ui', {
        body: {
          texts: textsToTranslate,
          targetLanguage: currentLanguage,
          sourceLanguage: 'English'
        }
      });
      
      if (error || !data?.translations) return texts;
      
      // Cache results
      if (!dynamicMemoryCache[currentLanguage]) {
        dynamicMemoryCache[currentLanguage] = {};
      }
      
      textsToTranslate.forEach((text, i) => {
        if (data.translations[i]) {
          dynamicMemoryCache[currentLanguage][text] = data.translations[i];
        }
      });
      saveToStorage();
      
      // Build final result
      let translateIndex = 0;
      return texts.map((text, index) => {
        if (cachedResults[index] !== undefined) {
          return cachedResults[index];
        }
        return data.translations[translateIndex++] || text;
      });
    } catch (error) {
      console.error('Error batch translating:', error);
      return texts;
    }
  }, [currentLanguage]);

  const setLanguage = useCallback((language: string) => {
    localStorage.setItem(LANGUAGE_KEY, language);
    setCurrentLanguage(language);
  }, []);

  const value = useMemo(() => ({
    t,
    translateDynamic,
    translateDynamicBatch,
    currentLanguage,
    setLanguage,
    isLoading
  }), [t, translateDynamic, translateDynamicBatch, currentLanguage, setLanguage, isLoading]);

  return (
    <TranslationContext.Provider value={value}>
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
