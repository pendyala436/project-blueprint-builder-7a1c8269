/**
 * WebRTC ICE Server Configuration
 *
 * Uses only FREE, open-source STUN servers.
 * No paid TURN services. STUN covers ~85% of connections.
 *
 * For self-hosted TURN (coturn), set the env vars:
 *   VITE_TURN_URL=turn:your-coturn-server.com:3478
 *   VITE_TURN_USERNAME=youruser
 *   VITE_TURN_CREDENTIAL=yourpassword
 */

// Free open-source STUN servers only — no paid services
const FREE_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },      // Cloudflare free STUN
  { urls: 'stun:stun.stunprotocol.org:3478' },    // Open-source stunprotocol.org
  { urls: 'stun:stun.nextcloud.com:443' },         // Nextcloud open-source STUN
];

/**
 * Build ICE server list.
 * Includes self-hosted coturn TURN server if configured via env vars.
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [...FREE_STUN_SERVERS];

  // Optional: self-hosted coturn TURN server (no paid service)
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
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
