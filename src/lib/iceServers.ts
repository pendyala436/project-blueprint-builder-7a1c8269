/**
 * WebRTC ICE Server Configuration
 *
 * Uses free STUN servers + Open Relay TURN servers for NAT traversal.
 * Open Relay (openrelay.metered.ca) provides free TURN relay so users
 * behind symmetric NAT (corporate networks, mobile carriers) can connect.
 *
 * For self-hosted coturn, set env vars to override:
 *   VITE_TURN_URL=turn:your-coturn-server.com:3478
 *   VITE_TURN_USERNAME=youruser
 *   VITE_TURN_CREDENTIAL=yourpassword
 */

// Free open-source STUN servers
const FREE_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.nextcloud.com:443' },
];

// VID-C-03: Removed hardcoded public shared TURN credentials.
// Self-hosted coturn TURN server MUST be configured via env vars.
// Without TURN, calls behind symmetric NAT will fall back to STUN-only (may fail).
const FREE_TURN_SERVERS: RTCIceServer[] = [];

/**
 * Build ICE server list.
 * Includes free TURN by default. Self-hosted coturn overrides if configured.
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [...FREE_STUN_SERVERS];

  // Self-hosted coturn TURN server (overrides free TURN if configured)
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    // Primary: self-hosted coturn (UDP)
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
    // Also add TCP and TLS variants for restrictive networks
    const turnHost = turnUrl.replace(/^turns?:/, '').replace(/:\d+$/, '');
    servers.push(
      { urls: `turn:${turnHost}:443?transport=tcp`, username: turnUser, credential: turnCred },
      { urls: `turns:${turnHost}:443?transport=tcp`, username: turnUser, credential: turnCred }
    );
  } else {
    // Fallback: free Open Relay TURN (no SLA, shared public credentials)
    console.warn('[ICE] No self-hosted TURN configured — using public relay fallback');
    servers.push(...FREE_TURN_SERVERS);
  }

  return servers;
}

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: buildIceServers(),
  iceCandidatePoolSize: 4,
};

export const ICE_SERVERS_SFU: RTCConfiguration = {
  iceServers: buildIceServers(),
  iceCandidatePoolSize: 2,
};
