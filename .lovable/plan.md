# Live Group Chat Rooms — Plan

A new **Group Chat** tab in both Men and Women dashboards, separate from the existing video flower rooms. Female hosts go live in tree-named text-chat rooms; men join and are billed per minute. Billing is strictly participant-driven.

## Scope (V1)

- New tables for rooms, sessions, participants, messages, billing
- 1000 seeded tree-named rooms (Banyan, Mango, Neem, … with numbered suffixes)
- 20-user cap per room
- Female-only hosting, male-only joining
- Billing: ₹2/min man, ₹1/min host per active man, ₹1/min platform — **only while ≥1 man is in the room**
- Realtime chat: text + media (reuses existing `chat-attachments` bucket + translation service)
- Host controls: end live, mute, remove, pin
- Reuses canonical wallet SoT (`wallet_transactions`) via new billing RPC

## Database

```text
group_chat_rooms          1000 predefined tree rooms (name, tree_type, max_users=20, status, current_host_id, current_session_id)
group_chat_sessions       one row per "host went live" (room_id, host_id, started_at, ended_at, total_men_minutes)
group_chat_participants   per-man join/leave log (session_id, user_id, joined_at, left_at, total_seconds, total_billed)
group_chat_messages       text/media messages (session_id, sender_id, body, media_url, media_type, reply_to, pinned, deleted_at, translated_cache jsonb)
group_chat_moderation     mutes/removes/bans (session_id, target_user_id, action, by_host_id, until)
```

All tables: `GRANT` to authenticated + service_role, RLS enabled, policies scoped by `auth.uid()` and `has_role` for admin.

## Billing RPC

`bill_group_chat_minute(p_session_id, p_man_id)` — canonical wallet flow:
- Verify session live + man is active participant
- Debit ₹2 from man (wallet_transactions: type=`group_chat_minute_charge`, idempotency `groupchat:{session}:{man}:{minute}`)
- Credit ₹1 host (`group_chat_host_earning`)
- Credit ₹1 platform (`group_chat_platform_revenue`)
- Returns `{success, balance, insufficient}` — on insufficient, force-leave

Server gate: function returns no-op if no active male participants (idle live room ⇒ ₹0).

## Frontend

**New components**
- `src/components/GroupChatTab.tsx` — list of live rooms (men) / hostable rooms (women)
- `src/components/group-chat/GroupChatRoomCard.tsx` — name, host avatar, X/20 participants, LIVE badge, JOIN/FULL/GO LIVE button
- `src/components/group-chat/GroupChatRoom.tsx` — full chat UI (reuses `ChatMessageInput`, `useMessageSound`, translation context)
- `src/components/group-chat/HostControls.tsx` — end live, mute/remove menu, pin

**Hooks**
- `useGroupChatRooms()` — realtime list of rooms
- `useGroupChatRoom(roomId)` — messages, participants, presence
- `useGroupChatBilling(sessionId)` — per-minute tick calling `bill_group_chat_minute`, auto-leave on insufficient

**Dashboard wiring**
- Add **Group Chat** tab to `DashboardScreen.tsx` (men) — shows only LIVE rooms
- Add **Group Chat** tab to `WomenDashboardScreen.tsx` — shows all rooms with "Go Live" on offline ones, "End Live" on her own live one

## Seed Data

Migration seeds 1000 rooms: 50 tree types × 20 numbered variants (e.g., `Banyan Tree 1` … `Banyan Tree 20`, `Mango Tree 1` …).

## Out of scope (follow-up)

- Full moderation AI (reuses existing `content-moderation.ts` regex)
- Withdrawals (already exists in wallet system)
- Analytics dashboard for admin
- Voice/video in group chat rooms (text + media only in V1)

## Order of work

1. Migration: create 5 tables + GRANTs + RLS + seed 1000 rooms + billing RPC
2. Hooks (`useGroupChatRooms`, `useGroupChatRoom`, `useGroupChatBilling`)
3. Components (`GroupChatTab`, `GroupChatRoomCard`, `GroupChatRoom`, `HostControls`)
4. Wire tabs into both dashboards
5. Smoke test via Playwright + verify billing entries in `wallet_transactions`

Approve to proceed and I'll start with the migration.
