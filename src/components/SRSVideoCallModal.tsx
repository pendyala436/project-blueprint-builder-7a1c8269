/**
 * SRSVideoCallModal - Re-exported as P2P WebRTC Video Call Modal
 * 
 * This component now uses P2P WebRTC instead of SRS media server.
 * P2P is preferred for 1-on-1 calls due to:
 * - Scalability: Uses peer resources, not server resources
 * - Low latency: Direct connection between users
 * - No infrastructure: Only needs STUN servers for NAT traversal
 * 
 * For backward compatibility, this module re-exports the P2P implementation
 * with the same interface.
 */

import P2PVideoCallModal from "./P2PVideoCallModal";

// Re-export with the original name for backward compatibility
export { P2PVideoCallModal as default };
export { P2PVideoCallModal };

// Also export the component as SRSVideoCallModal for any existing imports
const SRSVideoCallModal = P2PVideoCallModal;
export { SRSVideoCallModal };
