import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  'loggedOut': 'Logged out',
  'seeYouSoon': 'See you soon!',
  'failedToLoadSettings': 'Failed to load settings',
  'failedToSaveSettings': 'Failed to save settings',
  
  // Location
  'locationSetup': 'Location Setup',
  'whereAreYouFrom': 'Where are you from?',
  'selectYourCountry': 'Select your country',
  'selectYourState': 'Select your state',
  
  // Language Selection
  'selectLanguage': 'Select Language',
  'change': 'Change',
  'searchLanguages': 'Search languages...',
  'indianLanguages': 'Indian Languages',
  'worldLanguages': 'World Languages',
  'noLanguagesFound': 'No languages found',
  
  // Registration
  'registrationComplete': 'Registration Complete',
  'welcomeToMeowMeow': 'Welcome to Meow Meow!',
  'profileCreatedSuccessfully': 'Your profile has been created successfully',
  'goToDashboard': 'Go to Dashboard',
  
  // Tutorial
  'welcomeToMeow': 'Welcome to Meow!',
  'yourJourneyStarts': 'Your journey to meaningful connections starts here. Let\'s show you around!',
  'startConversations': 'Start Conversations',
  'sendMessagesVoicePhotos': 'Send messages, voice notes, and photos. Express yourself freely and connect authentically.',
  'findYourMatch': 'Find Your Match',
  'aiPoweredMatching': 'Our AI-powered matching helps you discover people who share your interests and values.',
  'staySafe': 'Stay Safe',
  'yourPrivacyMatters': 'Your privacy matters. All profiles are verified, and you control who sees your information.',
  'connectGlobally': 'Connect Globally',
  'breakLanguageBarriers': 'Break language barriers with real-time translation. Meet people from around the world!',
  'youreAllSet': "You're All Set!",
  'startExploringConnections': 'Start exploring and make meaningful connections. Your perfect match is just a swipe away!',
  'skipTutorial': 'Skip Tutorial',
  'previous': 'Previous',
  'getStarted': 'Get Started',
  'tutorialComplete': 'Tutorial Complete!',
  'youreReadyToConnect': "You're ready to start connecting.",
  'step': 'Step',
  
  // Password Setup
  'createPassword': 'Create Password',
  'chooseSecurePassword': 'Choose a secure password for your account',
  'confirmPassword': 'Confirm Password',
  'reEnterPassword': 'Re-enter your password',
  'passwordsDoNotMatch': 'Passwords do not match',
  'passwordTooShort': 'Password too short',
  'passwordCreated': 'Password created!',
  'yourAccountIsSecure': 'Your account is now secure',
  
  // Terms Agreement
  'termsOfService': 'Terms of Service',
  'privacyPolicy': 'Privacy Policy',
  'iAgreeToThe': 'I agree to the',
  'and': 'and',
  'pleaseAgreeToTerms': 'Please agree to the terms to continue',
  'agreeAndContinue': 'Agree and Continue',
  
  // Approval Pending
  'approvalPending': 'Approval Pending',
  'profileUnderReview': 'Your profile is under review',
  'weAreVerifying': "We're verifying your profile to ensure a safe experience for everyone.",
  'thisUsuallyTakes': 'This usually takes a few minutes',
  'checkBackSoon': 'Check back soon!',
  'refreshStatus': 'Refresh Status',
  
  // Women Dashboard
  'yourDashboard': 'Your Dashboard',
  'startYourShiftToEarn': 'Start your shift to begin earning',
  'currentEarnings': 'Current Earnings',
  'chatRequests': 'Chat Requests',
  'pendingRequests': 'Pending Requests',
  'acceptedChats': 'Accepted Chats',
  'acceptRequest': 'Accept Request',
  'declineRequest': 'Decline Request',
  'selectLanguageDescription': 'Select any language you speak. Men speaking this language will be matched to you. Auto-translation enabled for all',
  'nllbLanguages': 'NLLB-200 languages',
  'sameLanguageFirst': 'Same language first, then by wallet balance',
  'noPremiumMenOnline': 'No premium men online',
  'checkBackLaterForWalletUsers': 'Check back later for users with wallet balance',
  'usersWithoutBalance': 'Users without wallet balance',
  'noRegularUsersOnline': 'No regular users online',
  'connectWithMan': 'Connect with a man speaking your language',
  
  // Women Wallet
  'yourEarnings': 'Your Earnings',
  'withdrawEarnings': 'Withdraw Earnings',
  'earningsHistory': 'Earnings History',
  'withdrawalHistory': 'Withdrawal History',
  
  // Admin Screens
  'adminDashboard': 'Admin Dashboard',
  'userManagement': 'User Management',
  'moderationPanel': 'Moderation Panel',
  'analyticsOverview': 'Analytics Overview',
  'systemSettings': 'System Settings',
  'auditLogs': 'Audit Logs',
  'backupManagement': 'Backup Management',
  'performanceMonitoring': 'Performance Monitoring',
  'chatMonitoring': 'Chat Monitoring',
  'financeDashboard': 'Finance Dashboard',
  'financeReports': 'Finance Reports',
  'legalDocuments': 'Legal Documents',
  'policyAlerts': 'Policy Alerts',
  'languageGroups': 'Language Groups',
  'sampleUsers': 'Sample Users',
  'chatPricing': 'Chat Pricing',
  'giftPricing': 'Gift Pricing',
  
  // Misc
  'loadingProfile': 'Loading profile...',
  'findingOnlineUsers': 'Finding online users...',
  'processingPayment': 'Processing Payment',
  'currency': 'Currency',
  'hours': 'hours',
  'minutes': 'minutes',
  'seconds': 'seconds',
  'ago': 'ago',
  'justNow': 'Just now',
  'via': 'via',
  'reason': 'Reason',
  'details': 'Details',
  'status': 'Status',
  'date': 'Date',
  'time': 'Time',
  'amount': 'Amount',
  'description': 'Description',
  'type': 'Type',
  'category': 'Category',
  'total': 'Total',
  'average': 'Average',
  'min': 'Min',
  'max': 'Max',
  'count': 'Count',
  'percentage': 'Percentage',
  'progress': 'Progress',
  'remaining': 'Remaining',
  'used': 'Used',
  'required': 'Required',
  'optional': 'Optional',
  'recommended': 'Recommended',
  'suggested': 'Suggested',
  'default': 'Default',
  'custom': 'Custom',
  'other': 'Other',
  'more': 'More',
  'less': 'Less',
  'showMore': 'Show More',
  'showLess': 'Show Less',
  'seeAll': 'See All',
  'viewAll': 'View All',
  'hideAll': 'Hide All',
  'expandAll': 'Expand All',
  'collapseAll': 'Collapse All',
  'enable': 'Enable',
  'disable': 'Disable',
  'enabled': 'Enabled',
  'disabled': 'Disabled',
  'on': 'On',
  'off': 'Off',
  'start': 'Start',
  'stop': 'Stop',
  'pause': 'Pause',
  'resume': 'Resume',
  'restart': 'Restart',
  'finish': 'Finish',
  'complete': 'Complete',
  'skip': 'Skip',
  'first': 'First',
  'last': 'Last',
  'newest': 'Newest',
  'oldest': 'Oldest',
  'highest': 'Highest',
  'lowest': 'Lowest',
  'ascending': 'Ascending',
  'descending': 'Descending',
  'sortBy': 'Sort by',
  'filterBy': 'Filter by',
  'groupBy': 'Group by',
  'searchBy': 'Search by',
  'orderBy': 'Order by',
  'noResults': 'No results',
  'noData': 'No data',
  'noItems': 'No items',
  'empty': 'Empty',
  'none': 'None',
  'unknown': 'Unknown',
  'notAvailable': 'Not available',
  'comingSoon': 'Coming soon',
  'underMaintenance': 'Under maintenance',
  'pleaseWait': 'Please wait...',
  'processingRequest': 'Processing your request...',
  'almostDone': 'Almost done...',
  'completingSetup': 'Completing setup...',
  'initializingApp': 'Initializing app...',
  'connectingToServer': 'Connecting to server...',
  'synchronizing': 'Synchronizing...',
  'updating': 'Updating...',
  'downloading': 'Downloading...',
  'uploading': 'Uploading...',
  'deleting': 'Deleting...',
  'cancelling': 'Cancelling...',
  'confirming': 'Confirming...',
  'submitting': 'Submitting...',
  'processing': 'Processing...',
  'validating': 'Validating...',
  'authenticating': 'Authenticating...',
  'redirecting': 'Redirecting...',
  
  // Additional Wallet keys
  'withdrawAmount': 'Withdraw Amount',
  'withdrawingTo': 'Withdrawing to',
  'selectedMethod': 'selected method',
  'minimumWithdrawal': 'Minimum withdrawal',
  'processingTime': 'Processing time',
  'asPerBankRecords': 'As per bank records',
  'enterAccountNumber': 'Enter account number',
  'tenDigitMobile': '10 digit mobile number',
  'rechargeAmount': 'Recharge Amount',
  'selectPaymentGateway': 'Select Payment Gateway',
  'globalPaymentMethods': 'Global Payment Methods',
  'allCountriesSupported': 'All countries supported',
  
  // Transaction related
  'credit': 'Credit',
  'debit': 'Debit',
  'walletRecharge': 'Wallet Recharge',
  'chatPayment': 'Chat Payment',
  'giftPurchase': 'Gift Purchase',
  'noTransactionsYet': 'No transactions yet',
  'startUsingWallet': 'Start using your wallet to see transactions here',
  'recentTransactions': 'Recent Transactions',
  'moneyAdded': 'Money Added',
  'payment': 'Payment',
  'payingVia': 'Paying via',
  'selectedGateway': 'selected gateway',
  'rechargeYourWallet': 'Recharge your wallet to get started',
  
  // Chat Screen
  'chatEnded': 'Chat Ended',
  'chatEndedDescription': 'This chat session has ended.',
  'messageBlocked': 'Message blocked',
  'unblockToChat': 'Unblock this user to continue chatting',
  'youBlockedUser': 'You have blocked this user',
  'original': 'Original',
  'translated': 'Translated',
  'translating': 'Translating...',
  'sentAt': 'Sent at',
  'delivered': 'Delivered',
  'attachImage': 'Attach Image',
  'attachFile': 'Attach File',
  'takePhoto': 'Take Photo',
  'uploadingAttachment': 'Uploading attachment...',
  
  // Profile Detail
  'aboutMe': 'About Me',
  'basicInfo': 'Basic Info',
  'lifestyle': 'Lifestyle',
  'heightCm': 'Height (cm)',
  'bodyType': 'Body Type',
  'smokingHabit': 'Smoking',
  'drinkingHabit': 'Drinking',
  'dietaryPreference': 'Diet',
  'fitnessLevel': 'Fitness',
  'petPreference': 'Pet Preference',
  'travelFrequency': 'Travel Frequency',
  'zodiacSign': 'Zodiac Sign',
  'personalityType': 'Personality Type',
  'lifeGoals': 'Life Goals',
  'lastActiveTime': 'Last active',
  'memberSince': 'Member since',
  'responseTime': 'Response time',
  'chatCount': 'Chat count',
  
  // Admin Chat Monitoring
  'totalMessages': 'Total Messages',
  'flaggedMessages': 'Flagged Messages',
  'pendingReview': 'Pending Review',
  'clearedMessages': 'Cleared Messages',
  'silentMonitor': 'Silent Monitor',
  'sendNotification': 'Send Notification',
  'broadcastNotification': 'Broadcast Notification',
  'notificationTitle': 'Notification Title',
  'notificationMessage': 'Notification Message',
  'targetAudience': 'Target Audience',
  'allUsers': 'All Users',
  'menOnly': 'Men Only',
  'womenOnly': 'Women Only',
  'flagMessage': 'Flag Message',
  'unflagMessage': 'Unflag Message',
  'viewMessageDetails': 'View Message Details',
  'resolveFlag': 'Resolve Flag',
  'filterByCountry': 'Filter by Country',
  'filterByLanguage': 'Filter by Language',
  'filterByLanguageGroup': 'Filter by Language Group',
  'startMonitoring': 'Start Monitoring',
  'stopMonitoring': 'Stop Monitoring',
  'noActiveChats': 'No Active Chats',
  'selectChatToMonitor': 'Select a chat to start silent monitoring',
  'monitoringChat': 'Monitoring Chat',
  
  // Misc additions
  'phoneVerified': 'Phone Verified',
  'emailVerified': 'Email Verified',
  'profileComplete': 'Profile Complete',
  'profileIncomplete': 'Profile Incomplete',
  'completeProfile': 'Complete Profile',
  'editProfile': 'Edit Profile',
  'viewFullProfile': 'View Full Profile',
  'shareProfile': 'Share Profile',
  'copyProfileLink': 'Copy Profile Link',
  'linkCopied': 'Link Copied!',
  'profileLinkCopied': 'Profile link copied to clipboard',
};

// Cache for translations
const translationCache: Record<string, Record<string, string>> = {
  'English': defaultStrings,
};

// Cache for dynamic text translations
const dynamicTranslationCache: Record<string, Record<string, string>> = {};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('English');
  const [translations, setTranslations] = useState<Record<string, string>>(defaultStrings);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's language preference on mount - prioritize localStorage for persistence after logout
  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        // First check localStorage (persists after logout)
        const savedLanguage = localStorage.getItem('app_language');
        if (savedLanguage && savedLanguage !== 'English') {
          setCurrentLanguage(savedLanguage);
          return; // Use saved language, skip database check
        }

        // If no saved language, check database for logged-in users
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
            // Also save to localStorage for persistence
            localStorage.setItem('app_language', language);
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

  // Translate a single dynamic text (from database)
  const translateDynamic = useCallback(async (text: string): Promise<string> => {
    if (!text || currentLanguage === 'English') return text;
    
    // Check cache
    if (dynamicTranslationCache[currentLanguage]?.[text]) {
      return dynamicTranslationCache[currentLanguage][text];
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
      if (!dynamicTranslationCache[currentLanguage]) {
        dynamicTranslationCache[currentLanguage] = {};
      }
      dynamicTranslationCache[currentLanguage][text] = data.translations[0];
      
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
      } else if (dynamicTranslationCache[currentLanguage]?.[text]) {
        cachedResults[index] = dynamicTranslationCache[currentLanguage][text];
      } else {
        textsToTranslate.push(text);
      }
    });
    
    // If all cached, return immediately
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
      if (!dynamicTranslationCache[currentLanguage]) {
        dynamicTranslationCache[currentLanguage] = {};
      }
      
      textsToTranslate.forEach((text, i) => {
        if (data.translations[i]) {
          dynamicTranslationCache[currentLanguage][text] = data.translations[i];
        }
      });
      
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
    // Clear cached translations for this language to force fresh translation
    if (translationCache[language]) {
      delete translationCache[language];
    }
    if (dynamicTranslationCache[language]) {
      delete dynamicTranslationCache[language];
    }
    setCurrentLanguage(language);
    // Save preference to localStorage for persistence
    localStorage.setItem('app_language', language);
  }, []);

  return (
    <TranslationContext.Provider value={{ t, translateDynamic, translateDynamicBatch, currentLanguage, setLanguage, isLoading }}>
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
