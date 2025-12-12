# Video Calling System Documentation

## Overview

This application uses **SRS (Simple Realtime Server)** for video calling and live streaming functionality. SRS is an open-source, high-performance media server that supports WebRTC, RTMP, HLS, and FLV protocols.

**Key Features:**
- 1-to-1 video calls between users
- Live streaming to multiple viewers
- WebRTC for low-latency communication
- HLS output for large-scale streaming
- No content storage (ephemeral streams only)

---

## Architecture

```
┌─────────────────┐     WebRTC     ┌─────────────────┐
│   User A        │◄──────────────►│   SRS Server    │
│   (Publisher)   │                │   (localhost)   │
└─────────────────┘                └────────┬────────┘
                                            │
                                            │ WebRTC/HLS
                                            ▼
                                   ┌─────────────────┐
                                   │   User B        │
                                   │   (Viewer)      │
                                   └─────────────────┘
```

**Components:**
1. **SRS Server** - Media relay server (runs locally or on a dedicated server)
2. **Edge Function** (`video-call-server`) - Handles signaling and SRS API calls
3. **React Hooks** (`useSRSCall`) - Client-side WebRTC management
4. **Cleanup Function** (`video-cleanup`) - Auto-deletes session data after 5 minutes

---

## Privacy & Storage Policy

**IMPORTANT: No video/audio content is stored or recorded.**

- All streams are ephemeral (real-time transmission only)
- SRS is configured without DVR/recording capabilities
- Session metadata is automatically deleted after 5 minutes
- Cron job runs every minute to clean up old records

---

## Deployment Guide

### Option 1: Local Development (Docker)

1. **Install Docker** if not already installed.

2. **Start SRS Server:**
   ```bash
   docker run -d --name srs \
     -p 1935:1935 \
     -p 1985:1985 \
     -p 8080:8080 \
     ossrs/srs:5
   ```

3. **Verify SRS is running:**
   ```bash
   curl http://localhost:1985/api/v1/versions
   ```

4. **Access points:**
   - API Server: `http://localhost:1985`
   - WebRTC: `webrtc://localhost/live`
   - HLS Playback: `http://localhost:8080/live`
   - RTMP: `rtmp://localhost/live`

### Option 2: Production Deployment

1. **Deploy SRS on a cloud server:**
   ```bash
   # On your server (Ubuntu/Debian)
   docker run -d --name srs \
     --restart always \
     -p 1935:1935 \
     -p 1985:1985 \
     -p 8080:8080 \
     -p 8000:8000/udp \
     ossrs/srs:5
   ```

2. **Update environment variables in Supabase:**
   - Go to: Supabase Dashboard → Settings → Edge Functions
   - Add secrets:
     - `SRS_API_URL`: `http://your-server-ip:1985`
     - `SRS_RTC_URL`: `http://your-server-ip:1985/rtc/v1`

3. **Configure HTTPS (recommended):**
   - Use a reverse proxy (nginx/caddy) with SSL certificates
   - Update WebRTC URLs to use WSS

### Option 3: SRS Cloud (Managed)

For production at scale, consider using SRS Cloud or similar managed services.

---

## Starting & Stopping SRS Server

### Start Server

```bash
# Using Docker
docker start srs

# Or run fresh container
docker run -d --name srs \
  -p 1935:1935 \
  -p 1985:1985 \
  -p 8080:8080 \
  ossrs/srs:5
```

### Stop Server

```bash
docker stop srs
```

### Restart Server

```bash
docker restart srs
```

### View Logs

```bash
docker logs -f srs
```

### Check Server Status

```bash
# API version
curl http://localhost:1985/api/v1/versions

# Active streams
curl http://localhost:1985/api/v1/streams/

# Connected clients
curl http://localhost:1985/api/v1/clients/
```

---

## Application Usage

### 1-to-1 Video Calls

**Starting a Call (Men's Dashboard):**
1. User clicks "Video Call" button
2. System finds available woman via AI matching
3. WebRTC connection established through SRS
4. Call timer starts, billing per minute

**Receiving a Call (Women's Dashboard):**
1. Incoming call modal appears
2. User accepts/declines call
3. WebRTC stream starts on accept

### Live Streaming

**Starting a Stream:**
1. Click "Go Live" button
2. Confirm stream start
3. Camera/microphone activated
4. Stream published to SRS

**Watching a Stream:**
1. Navigate to live streams section
2. Click on active stream
3. HLS/WebRTC playback begins

---

## API Reference

### Edge Function: `video-call-server`

**Endpoint:** `POST /functions/v1/video-call-server`

**Actions:**

| Action | Description | Parameters |
|--------|-------------|------------|
| `srs_publish` | Start publishing stream | `streamName`, `sdp`, `callId`, `userId`, `mode` |
| `srs_play` | Start playing stream | `streamName`, `sdp`, `callId`, `userId` |
| `srs_unpublish` | Stop publishing | `streamName` |
| `srs_get_viewers` | Get viewer count | `streamName` |
| `srs_get_streams` | List active streams | - |
| `create_room` | Create call room | `callId`, `userId`, `streamName`, `mode` |
| `join_room` | Join existing room | `callId`, `userId` |
| `end_call` | End call session | `callId`, `userId` |

**Example Request:**
```javascript
const { data, error } = await supabase.functions.invoke('video-call-server', {
  body: {
    action: 'srs_publish',
    streamName: 'call_user123_1234567890',
    sdp: offerSDP,
    callId: 'call_123',
    userId: 'user_123',
    mode: 'call'
  }
});
```

### Edge Function: `video-cleanup`

**Endpoint:** `POST /functions/v1/video-cleanup`

Automatically called by cron job every minute. Deletes:
- Video call sessions older than 5 minutes
- Ends stale active/ringing sessions

---

## Database Schema

### Table: `video_call_sessions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `call_id` | TEXT | Unique call identifier |
| `man_user_id` | UUID | Caller/streamer user ID |
| `woman_user_id` | UUID | Receiver user ID |
| `status` | TEXT | ringing, connecting, active, streaming, ended |
| `rate_per_minute` | NUMERIC | Cost per minute |
| `total_minutes` | NUMERIC | Call duration |
| `total_earned` | NUMERIC | Total earnings |
| `started_at` | TIMESTAMP | Call start time |
| `ended_at` | TIMESTAMP | Call end time |
| `end_reason` | TEXT | Why call ended |
| `created_at` | TIMESTAMP | Record creation time |

**Note:** Records are automatically deleted after 5 minutes.

---

## React Components

### `useSRSCall` Hook

```typescript
const {
  callStatus,      // 'idle' | 'publishing' | 'playing' | 'active' | 'ended'
  callDuration,    // seconds
  totalCost,       // calculated cost
  isVideoEnabled,  // camera on/off
  isAudioEnabled,  // mic on/off
  viewerCount,     // for streaming
  localVideoRef,   // ref for local video element
  remoteVideoRef,  // ref for remote video element
  startPublishing, // start streaming
  startPlaying,    // start receiving
  watchStream,     // watch live stream
  endCall,         // end session
  toggleVideo,     // toggle camera
  toggleAudio,     // toggle microphone
  getHLSUrl,       // get HLS playback URL
} = useSRSCall({
  callId: 'unique_call_id',
  currentUserId: 'user_123',
  remoteUserId: 'user_456',
  isInitiator: true,
  ratePerMinute: 5,
  mode: 'call', // or 'stream'
  onCallEnded: () => console.log('Call ended'),
});
```

### Components

| Component | Purpose |
|-----------|---------|
| `SRSVideoCallModal` | Main video call UI |
| `LiveStreamViewer` | Watch live streams |
| `LiveStreamButton` | Start live streaming |
| `VideoCallButton` | Initiate video calls |

---

## Troubleshooting

### SRS Server Not Responding

```bash
# Check if container is running
docker ps | grep srs

# Check container logs
docker logs srs

# Restart container
docker restart srs
```

### WebRTC Connection Failed

1. Check browser console for errors
2. Verify SRS server is accessible
3. Check firewall allows ports 1985, 8080, 8000/udp
4. Ensure HTTPS for production (WebRTC requires secure context)

### No Video/Audio

1. Check browser permissions for camera/microphone
2. Verify local stream is created (check console logs)
3. Test camera in browser settings

### Cleanup Not Working

1. Check cron job is scheduled:
   ```sql
   SELECT * FROM cron.job;
   ```
2. Check edge function logs in Supabase dashboard
3. Manually trigger cleanup:
   ```bash
   curl -X POST https://tvneohngeracipjajzos.supabase.co/functions/v1/video-cleanup
   ```

---

## Security Considerations

1. **No Recording:** SRS is configured without DVR capabilities
2. **Auto-Cleanup:** Session data deleted after 5 minutes
3. **Signaling Security:** Edge functions require authentication
4. **RLS Policies:** Database access controlled by row-level security
5. **HTTPS:** Use TLS in production for all connections

---

## Performance Tuning

### SRS Configuration

For high-traffic deployments, customize SRS config:

```bash
docker run -d --name srs \
  -v /path/to/srs.conf:/usr/local/srs/conf/srs.conf \
  -p 1935:1935 \
  -p 1985:1985 \
  -p 8080:8080 \
  ossrs/srs:5
```

### Scaling

- **Horizontal:** Deploy multiple SRS instances behind load balancer
- **Vertical:** Increase server resources (CPU/RAM)
- **CDN:** Use HLS output with CDN for live streaming

---

## Support

- **SRS Documentation:** https://ossrs.io/lts/en-us/docs/v5/doc/introduction
- **SRS GitHub:** https://github.com/ossrs/srs
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
