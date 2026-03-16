import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';

class ShiftManagementScreen extends ConsumerStatefulWidget {
  const ShiftManagementScreen({super.key});

  @override
  ConsumerState<ShiftManagementScreen> createState() => _ShiftManagementScreenState();
}

class _ShiftManagementScreenState extends ConsumerState<ShiftManagementScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  List<Map<String, dynamic>> _shifts = [];
  List<Map<String, dynamic>> _scheduledShifts = [];
  Map<String, dynamic>? _activeShift;

  @override
  void initState() {
    super.initState();
    _loadShiftData();
  }

  Future<void> _loadShiftData() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      // Load active shift
      final activeShiftResponse = await _supabase
          .from('shifts')
          .select()
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

      // Load recent shifts
      final shiftsResponse = await _supabase
          .from('shifts')
          .select()
          .eq('user_id', userId)
          .order('start_time', ascending: false)
          .limit(10);

      // Load scheduled shifts
      final scheduledResponse = await _supabase
          .from('scheduled_shifts')
          .select()
          .eq('user_id', userId)
          .gte('scheduled_date', DateTime.now().toIso8601String().split('T')[0])
          .order('scheduled_date', ascending: true)
          .limit(7);

      setState(() {
        _activeShift = activeShiftResponse;
        _shifts = List<Map<String, dynamic>>.from(shiftsResponse);
        _scheduledShifts = List<Map<String, dynamic>>.from(scheduledResponse);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading shifts: $e')),
        );
      }
    }
  }

  Future<void> _startShift() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      await _supabase.from('shifts').insert({
        'user_id': userId,
        'status': 'active',
        'start_time': DateTime.now().toIso8601String(),
      });

      _loadShiftData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Shift started successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error starting shift: $e')),
        );
      }
    }
  }

  Future<void> _endShift() async {
    if (_activeShift == null) return;

    try {
      await _supabase.from('shifts').update({
        'status': 'completed',
        'end_time': DateTime.now().toIso8601String(),
      }).eq('id', _activeShift!['id']);

      _loadShiftData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Shift ended successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error ending shift: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shift Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadShiftData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadShiftData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Active Shift Card
                    _buildActiveShiftCard(),
                    const SizedBox(height: 24),

                    // Quick Stats
                    _buildQuickStats(),
                    const SizedBox(height: 24),

                    // Scheduled Shifts
                    _buildScheduledShifts(),
                    const SizedBox(height: 24),

                    // Recent Shifts History
                    _buildShiftHistory(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildActiveShiftCard() {
    final isActive = _activeShift != null;
    final startTime = isActive
        ? DateTime.parse(_activeShift!['start_time'])
        : null;
    final duration = startTime != null
        ? DateTime.now().difference(startTime)
        : Duration.zero;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isActive
                        ? Colors.green.withOpacity(0.1)
                        : Colors.grey.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    isActive ? Icons.timer : Icons.timer_off,
                    color: isActive ? Colors.green : Colors.grey,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isActive ? 'Shift Active' : 'No Active Shift',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      if (isActive) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Started: ${DateFormat('hh:mm a').format(startTime!)}',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Colors.grey[600],
                              ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (isActive)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${duration.inHours}h ${duration.inMinutes % 60}m',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isActive ? _endShift : _startShift,
                icon: Icon(isActive ? Icons.stop : Icons.play_arrow),
                label: Text(isActive ? 'End Shift' : 'Start Shift'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isActive ? Colors.red : Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStats() {
    // Calculate stats from shifts
    final todayShifts = _shifts.where((s) {
      final date = DateTime.parse(s['start_time']);
      return date.day == DateTime.now().day;
    }).toList();

    final totalEarnings = _shifts.fold<double>(
      0,
      (sum, s) => sum + (s['earnings'] ?? 0).toDouble(),
    );

    final totalChats = _shifts.fold<int>(
      0,
      (sum, s) => sum + (s['total_chats'] ?? 0) as int,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Today\'s Stats',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'Hours Worked',
                '${todayShifts.length}',
                Icons.access_time,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                'Earnings',
                '₹${totalEarnings.toStringAsFixed(0)}',
                Icons.currency_rupee,
                Colors.green,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard(
                'Chats',
                '$totalChats',
                Icons.chat,
                Colors.purple,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduledShifts() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Upcoming Shifts',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () {
                // Navigate to schedule shift screen
              },
              child: const Text('Schedule New'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_scheduledShifts.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      size: 48,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No upcoming shifts scheduled',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          ...List.generate(
            _scheduledShifts.length > 3 ? 3 : _scheduledShifts.length,
            (index) {
              final shift = _scheduledShifts[index];
              final date = DateTime.parse(shift['scheduled_date']);
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary.withOpacity(0.1),
                    child: Text(
                      DateFormat('d').format(date),
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  title: Text(DateFormat('EEEE, MMM d').format(date)),
                  subtitle: Text(
                    '${shift['start_time']} - ${shift['end_time']}',
                  ),
                  trailing: Chip(
                    label: Text(
                      shift['status'] ?? 'Scheduled',
                      style: const TextStyle(fontSize: 12),
                    ),
                    backgroundColor: Colors.green.withOpacity(0.1),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildShiftHistory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Shifts',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        if (_shifts.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.history,
                      size: 48,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No shift history yet',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          ...List.generate(
            _shifts.length > 5 ? 5 : _shifts.length,
            (index) {
              final shift = _shifts[index];
              final startTime = DateTime.parse(shift['start_time']);
              final endTime = shift['end_time'] != null
                  ? DateTime.parse(shift['end_time'])
                  : null;
              final duration = endTime != null
                  ? endTime.difference(startTime)
                  : Duration.zero;

              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: shift['status'] == 'completed'
                        ? Colors.green.withOpacity(0.1)
                        : Colors.orange.withOpacity(0.1),
                    child: Icon(
                      shift['status'] == 'completed'
                          ? Icons.check_circle
                          : Icons.timer,
                      color: shift['status'] == 'completed'
                          ? Colors.green
                          : Colors.orange,
                    ),
                  ),
                  title: Text(DateFormat('MMM d, yyyy').format(startTime)),
                  subtitle: Text(
                    '${DateFormat('hh:mm a').format(startTime)} - '
                    '${endTime != null ? DateFormat('hh:mm a').format(endTime) : 'In Progress'}',
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${duration.inHours}h ${duration.inMinutes % 60}m',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '₹${(shift['earnings'] ?? 0).toStringAsFixed(0)}',
                        style: TextStyle(
                          color: Colors.green[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
