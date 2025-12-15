import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';

class ShiftComplianceScreen extends ConsumerStatefulWidget {
  const ShiftComplianceScreen({super.key});

  @override
  ConsumerState<ShiftComplianceScreen> createState() => _ShiftComplianceScreenState();
}

class _ShiftComplianceScreenState extends ConsumerState<ShiftComplianceScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  List<Map<String, dynamic>> _attendance = [];
  List<Map<String, dynamic>> _absences = [];
  Map<String, dynamic> _complianceStats = {};

  @override
  void initState() {
    super.initState();
    _loadComplianceData();
  }

  Future<void> _loadComplianceData() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      // Load attendance
      final attendanceResponse = await _supabase
          .from('attendance')
          .select()
          .eq('user_id', userId)
          .order('attendance_date', ascending: false)
          .limit(30);

      // Load absences
      final absenceResponse = await _supabase
          .from('absence_records')
          .select()
          .eq('user_id', userId)
          .order('absence_date', ascending: false)
          .limit(10);

      // Calculate compliance stats
      final attendanceList = List<Map<String, dynamic>>.from(attendanceResponse);
      final presentDays = attendanceList.where((a) => a['status'] == 'present').length;
      final totalDays = attendanceList.length;
      final complianceRate = totalDays > 0 ? (presentDays / totalDays * 100) : 0;

      setState(() {
        _attendance = attendanceList;
        _absences = List<Map<String, dynamic>>.from(absenceResponse);
        _complianceStats = {
          'present_days': presentDays,
          'total_days': totalDays,
          'compliance_rate': complianceRate,
          'absences': _absences.length,
        };
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading compliance data: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shift Compliance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadComplianceData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadComplianceData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Compliance Score Card
                    _buildComplianceScoreCard(),
                    const SizedBox(height: 24),

                    // Stats Overview
                    _buildStatsOverview(),
                    const SizedBox(height: 24),

                    // Attendance Calendar
                    _buildAttendanceSection(),
                    const SizedBox(height: 24),

                    // Absences
                    _buildAbsencesSection(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildComplianceScoreCard() {
    final rate = (_complianceStats['compliance_rate'] ?? 0).toDouble();
    final color = rate >= 90
        ? Colors.green
        : rate >= 70
            ? Colors.orange
            : Colors.red;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 120,
                  height: 120,
                  child: CircularProgressIndicator(
                    value: rate / 100,
                    strokeWidth: 12,
                    backgroundColor: Colors.grey[200],
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${rate.toStringAsFixed(0)}%',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: color,
                          ),
                    ),
                    Text(
                      'Compliance',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              rate >= 90
                  ? 'Excellent! Keep up the great work!'
                  : rate >= 70
                      ? 'Good performance. Room for improvement.'
                      : 'Needs improvement. Please maintain consistency.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsOverview() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Present Days',
            '${_complianceStats['present_days'] ?? 0}',
            Icons.check_circle,
            Colors.green,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Total Days',
            '${_complianceStats['total_days'] ?? 0}',
            Icons.calendar_today,
            Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Absences',
            '${_complianceStats['absences'] ?? 0}',
            Icons.cancel,
            Colors.red,
          ),
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

  Widget _buildAttendanceSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Attendance',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        if (_attendance.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.event_available,
                      size: 48,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No attendance records yet',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          Card(
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _attendance.length > 7 ? 7 : _attendance.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final record = _attendance[index];
                final date = DateTime.parse(record['attendance_date']);
                final status = record['status'] as String;
                
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: status == 'present'
                        ? Colors.green.withOpacity(0.1)
                        : status == 'late'
                            ? Colors.orange.withOpacity(0.1)
                            : Colors.red.withOpacity(0.1),
                    child: Icon(
                      status == 'present'
                          ? Icons.check
                          : status == 'late'
                              ? Icons.schedule
                              : Icons.close,
                      color: status == 'present'
                          ? Colors.green
                          : status == 'late'
                              ? Colors.orange
                              : Colors.red,
                    ),
                  ),
                  title: Text(DateFormat('EEEE, MMM d').format(date)),
                  subtitle: record['check_in_time'] != null
                      ? Text(
                          'Check-in: ${record['check_in_time']}',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        )
                      : null,
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: status == 'present'
                          ? Colors.green.withOpacity(0.1)
                          : status == 'late'
                              ? Colors.orange.withOpacity(0.1)
                              : Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      status.toUpperCase(),
                      style: TextStyle(
                        color: status == 'present'
                            ? Colors.green
                            : status == 'late'
                                ? Colors.orange
                                : Colors.red,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildAbsencesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Absence Records',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton.icon(
              onPressed: () {
                _showRequestAbsenceDialog();
              },
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Request Leave'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_absences.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.event_busy,
                      size: 48,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No absence records',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          ...List.generate(
            _absences.length > 5 ? 5 : _absences.length,
            (index) {
              final absence = _absences[index];
              final date = DateTime.parse(absence['absence_date']);
              final approved = absence['approved'] as bool?;

              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: approved == true
                        ? Colors.green.withOpacity(0.1)
                        : approved == false
                            ? Colors.red.withOpacity(0.1)
                            : Colors.orange.withOpacity(0.1),
                    child: Icon(
                      Icons.event_busy,
                      color: approved == true
                          ? Colors.green
                          : approved == false
                              ? Colors.red
                              : Colors.orange,
                    ),
                  ),
                  title: Text(DateFormat('MMM d, yyyy').format(date)),
                  subtitle: Text(
                    '${absence['leave_type'] ?? 'Leave'} - ${absence['reason'] ?? 'No reason'}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: approved == true
                          ? Colors.green.withOpacity(0.1)
                          : approved == false
                              ? Colors.red.withOpacity(0.1)
                              : Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      approved == true
                          ? 'APPROVED'
                          : approved == false
                              ? 'REJECTED'
                              : 'PENDING',
                      style: TextStyle(
                        color: approved == true
                            ? Colors.green
                            : approved == false
                                ? Colors.red
                                : Colors.orange,
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  void _showRequestAbsenceDialog() {
    final dateController = TextEditingController();
    final reasonController = TextEditingController();
    String leaveType = 'sick';
    DateTime? selectedDate;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Request Leave'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<String>(
                  value: leaveType,
                  decoration: const InputDecoration(
                    labelText: 'Leave Type',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'sick', child: Text('Sick Leave')),
                    DropdownMenuItem(value: 'personal', child: Text('Personal Leave')),
                    DropdownMenuItem(value: 'emergency', child: Text('Emergency')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (value) {
                    setDialogState(() => leaveType = value!);
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: dateController,
                  decoration: const InputDecoration(
                    labelText: 'Date',
                    border: OutlineInputBorder(),
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  readOnly: true,
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 30)),
                    );
                    if (picked != null) {
                      setDialogState(() {
                        selectedDate = picked;
                        dateController.text = DateFormat('MMM d, yyyy').format(picked);
                      });
                    }
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: reasonController,
                  decoration: const InputDecoration(
                    labelText: 'Reason',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (selectedDate == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please select a date')),
                  );
                  return;
                }

                try {
                  final userId = _supabase.auth.currentUser?.id;
                  await _supabase.from('absence_records').insert({
                    'user_id': userId,
                    'absence_date': selectedDate!.toIso8601String().split('T')[0],
                    'leave_type': leaveType,
                    'reason': reasonController.text,
                    'approved': null, // Pending
                  });

                  Navigator.pop(context);
                  _loadComplianceData();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Leave request submitted')),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }
}
