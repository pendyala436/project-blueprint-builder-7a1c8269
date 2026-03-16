import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/theme/app_colors.dart';

class VideoCallScreen extends ConsumerStatefulWidget {
  final String callId;
  final String recipientId;
  final String recipientName;
  final String? recipientPhoto;
  final bool isIncoming;
  final double ratePerMinute;

  const VideoCallScreen({
    super.key,
    required this.callId,
    required this.recipientId,
    required this.recipientName,
    this.recipientPhoto,
    this.isIncoming = false,
    this.ratePerMinute = 8,
  });

  @override
  ConsumerState<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends ConsumerState<VideoCallScreen> {
  final _supabase = Supabase.instance.client;
  bool _isMuted = false;
  bool _isVideoOff = false;
  bool _isSpeakerOn = true;
  bool _isConnecting = true;
  bool _isConnected = false;
  bool _isEndingCall = false;
  Duration _callDuration = Duration.zero;
  double _totalCost = 0;

  @override
  void initState() {
    super.initState();
    _initializeCall();
    _listenForCallEnd();
  }

  Future<void> _initializeCall() async {
    // TODO: Initialize WebRTC / Agora RTC Engine
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() {
        _isConnecting = false;
        _isConnected = true;
      });
      _startCallTimer();
    }
  }

  /// Listen for remote party ending the call
  void _listenForCallEnd() {
    _supabase
        .channel('video-call-${widget.callId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'video_call_sessions',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'call_id',
            value: widget.callId,
          ),
          callback: (payload) {
            final newStatus = payload.newRecord['status'] as String?;
            if (newStatus == 'ended' && mounted && !_isEndingCall) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Call ended by partner')),
              );
              Navigator.of(context).pop();
            }
          },
        )
        .subscribe();
  }

  void _startCallTimer() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted && _isConnected) {
        setState(() {
          _callDuration += const Duration(seconds: 1);
          _totalCost = (_callDuration.inSeconds / 60) * widget.ratePerMinute;
        });
        return true;
      }
      return false;
    });
  }

  void _toggleMute() => setState(() => _isMuted = !_isMuted);
  void _toggleVideo() => setState(() => _isVideoOff = !_isVideoOff);
  void _toggleSpeaker() => setState(() => _isSpeakerOn = !_isSpeakerOn);

  Future<void> _endCall() async {
    if (_isEndingCall) return;
    setState(() => _isEndingCall = true);

    try {
      final userId = _supabase.auth.currentUser?.id;

      // Update video_call_sessions status to ended
      await _supabase
          .from('video_call_sessions')
          .update({
            'status': 'ended',
            'ended_at': DateTime.now().toUtc().toIso8601String(),
            'end_reason': 'user_ended',
          })
          .eq('call_id', widget.callId);

      // Resume any chats paused for this video call
      if (userId != null) {
        await _supabase
            .from('active_chat_sessions')
            .update({'status': 'active', 'end_reason': null})
            .or('man_user_id.eq.$userId,woman_user_id.eq.$userId')
            .eq('status', 'paused')
            .eq('end_reason', 'video_call_priority');
      }
    } catch (e) {
      debugPrint('[VideoCall] Error ending call: $e');
    }

    if (mounted) Navigator.of(context).pop();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = duration.inHours;
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    if (hours > 0) return '${twoDigits(hours)}:$minutes:$seconds';
    return '$minutes:$seconds';
  }

  @override
  void dispose() {
    _supabase.removeChannel(
      _supabase.channel('video-call-${widget.callId}'),
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Remote video (full screen)
          Container(
            color: Colors.grey[900],
            child: Center(
              child: _isVideoOff
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          radius: 60,
                          backgroundImage: widget.recipientPhoto != null
                              ? NetworkImage(widget.recipientPhoto!)
                              : null,
                          child: widget.recipientPhoto == null
                              ? Text(widget.recipientName[0].toUpperCase(),
                                  style: const TextStyle(fontSize: 40))
                              : null,
                        ),
                        const SizedBox(height: 16),
                        Text(widget.recipientName,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold)),
                      ],
                    )
                  : Container(
                      color: Colors.grey[800],
                      child: const Center(
                        child: Icon(Icons.videocam, color: Colors.white54, size: 80),
                      ),
                    ),
            ),
          ),

          // Local video (small preview)
          Positioned(
            top: MediaQuery.of(context).padding.top + 20,
            right: 20,
            child: Container(
              width: 100,
              height: 140,
              decoration: BoxDecoration(
                color: Colors.grey[700],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white24, width: 2),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: _isVideoOff
                    ? const Center(child: Icon(Icons.videocam_off, color: Colors.white54, size: 32))
                    : Container(
                        color: Colors.grey[600],
                        child: const Center(child: Icon(Icons.person, color: Colors.white54, size: 40)),
                      ),
              ),
            ),
          ),

          // Call status, duration, and cost
          Positioned(
            top: MediaQuery.of(context).padding.top + 20,
            left: 20,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isConnecting)
                  Row(children: [
                    SizedBox(
                      width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                    ),
                    const SizedBox(width: 8),
                    const Text('Connecting...', style: TextStyle(color: Colors.white)),
                  ])
                else if (_isConnected)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 8, height: 8,
                            decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle)),
                        const SizedBox(width: 8),
                        Text(_formatDuration(_callDuration),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        const SizedBox(width: 12),
                        Text('₹${_totalCost.toStringAsFixed(2)}',
                            style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // Call controls
          Positioned(
            bottom: 40 + MediaQuery.of(context).padding.bottom,
            left: 0,
            right: 0,
            child: Column(
              children: [
                // Secondary controls
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildControlButton(
                      icon: _isSpeakerOn ? Icons.volume_up : Icons.volume_off,
                      label: 'Speaker',
                      onPressed: _toggleSpeaker,
                      isActive: _isSpeakerOn,
                    ),
                    const SizedBox(width: 20),
                    _buildControlButton(
                      icon: Icons.flip_camera_ios,
                      label: 'Flip',
                      onPressed: () { /* TODO: Switch camera */ },
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Primary controls
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildControlButton(
                      icon: _isMuted ? Icons.mic_off : Icons.mic,
                      label: _isMuted ? 'Unmute' : 'Mute',
                      onPressed: _toggleMute,
                      isActive: !_isMuted,
                      backgroundColor: _isMuted ? Colors.red : Colors.white24,
                    ),
                    const SizedBox(width: 20),
                    _buildControlButton(
                      icon: Icons.call_end,
                      label: 'End',
                      onPressed: _endCall,
                      backgroundColor: Colors.red,
                      iconColor: Colors.white,
                      size: 70,
                    ),
                    const SizedBox(width: 20),
                    _buildControlButton(
                      icon: _isVideoOff ? Icons.videocam_off : Icons.videocam,
                      label: _isVideoOff ? 'Start Video' : 'Stop Video',
                      onPressed: _toggleVideo,
                      isActive: !_isVideoOff,
                      backgroundColor: _isVideoOff ? Colors.red : Colors.white24,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    bool isActive = true,
    Color? backgroundColor,
    Color? iconColor,
    double size = 56,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: backgroundColor ?? Colors.white24,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: Icon(icon,
                color: iconColor ?? (isActive ? Colors.white : Colors.white54),
                size: size * 0.45),
            onPressed: onPressed,
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
      ],
    );
  }
}

// ============================================================================
// Incoming Call Screen
// ============================================================================

class IncomingCallScreen extends StatelessWidget {
  final String callerId;
  final String callerName;
  final String? callerPhoto;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  const IncomingCallScreen({
    super.key,
    required this.callerId,
    required this.callerName,
    this.callerPhoto,
    required this.onAccept,
    required this.onDecline,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(),
            CircleAvatar(
              radius: 60,
              backgroundImage: callerPhoto != null ? NetworkImage(callerPhoto!) : null,
              child: callerPhoto == null
                  ? Text(callerName[0].toUpperCase(), style: const TextStyle(fontSize: 40))
                  : null,
            ),
            const SizedBox(height: 24),
            Text(callerName,
                style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Incoming video call...',
                style: TextStyle(color: Colors.white70, fontSize: 16)),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Column(children: [
                  Container(
                    width: 70, height: 70,
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    child: IconButton(
                        icon: const Icon(Icons.call_end, color: Colors.white, size: 32),
                        onPressed: onDecline),
                  ),
                  const SizedBox(height: 12),
                  const Text('Decline', style: TextStyle(color: Colors.white70)),
                ]),
                const SizedBox(width: 80),
                Column(children: [
                  Container(
                    width: 70, height: 70,
                    decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                    child: IconButton(
                        icon: const Icon(Icons.videocam, color: Colors.white, size: 32),
                        onPressed: onAccept),
                  ),
                  const SizedBox(height: 12),
                  const Text('Accept', style: TextStyle(color: Colors.white70)),
                ]),
              ],
            ),
            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }
}
