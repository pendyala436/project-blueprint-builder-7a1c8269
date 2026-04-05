## WhatsApp-Style Dashboard Conversion

### Layout Structure (both dashboards)
1. **WhatsApp-style top header**: App name ("Meow Meow") on left, action icons (search, admin chat, notifications, settings, logout) on right — compact single row
2. **Bottom tab navigation**: 4 tabs with icons
   - **Men**: Chats | Women Online | Matches | Profile  
   - **Women**: Chats | Men Online | Earnings | Profile
3. **Floating Action Button (FAB)**: Green circle bottom-right
   - Men: New chat / Random chat
   - Women: Shows active chat count badge

### Tab Content
**Chats Tab** (default): WhatsApp-style conversation list
- Each row: Avatar (with online dot) | Name + last message preview | Timestamp + unread count badge
- Sorted by most recent activity

**Users Tab** (Women Online / Men Online):
- Same Language section header → user cards in WhatsApp contact-list style (avatar + name + language badge + status dot + action buttons)
- Other Language section below

**Matches Tab**: Contact-list style with match info
**Profile Tab**: Profile card + wallet/earnings + quick actions + settings

### Key Changes
- Remove current card-grid layout, stats cards, quick action grids
- Move wallet balance to Profile tab (men) / Earnings tab (women) 
- Keep all existing business logic (data fetching, realtime, chat initiation) — only change the UI render
- Use existing theme tokens (primary color) instead of hardcoded WhatsApp green
- Bottom safe area padding for mobile
- Keep EnhancedParallelChatsContainer, IncomingVideoCallWindow, sheets/dialogs as-is

### Files to create/modify
- `src/components/WhatsAppBottomTabs.tsx` — new shared bottom tab bar
- `src/components/WhatsAppChatList.tsx` — new shared chat list component  
- `src/components/WhatsAppHeader.tsx` — new shared top header
- `src/components/WhatsAppUserCard.tsx` — new user card in contact-list style
- `src/pages/DashboardScreen.tsx` — refactor render to use new components
- `src/pages/WomenDashboardScreen.tsx` — refactor render to use new components
