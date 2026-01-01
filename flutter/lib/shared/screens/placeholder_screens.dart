// Placeholder screens for remaining features - Synced with React web app

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/router/app_router.dart';

// ============================================================================
// Matching Screens
// ============================================================================

class MatchDiscoveryScreen extends StatelessWidget {
  const MatchDiscoveryScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {},
          ),
        ],
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.explore, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('Discover matches based on your preferences'),
          ],
        ),
      ),
    );
  }
}

class OnlineUsersScreen extends StatelessWidget {
  const OnlineUsersScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Online Users')),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: Colors.green),
            SizedBox(height: 16),
            Text('Users currently online'),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Wallet Screens
// ============================================================================

class WomenWalletScreen extends StatelessWidget {
  const WomenWalletScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Earnings')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text('Available Balance', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 8),
                    Text('₹0.00', style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    )),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {},
                      child: const Text('Request Payout'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('Earnings History', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: Text('No earnings yet')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TransactionHistoryScreen extends StatelessWidget {
  const TransactionHistoryScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Transaction History')),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No transactions yet'),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Shift Screens
// ============================================================================

class ShiftManagementScreen extends StatelessWidget {
  const ShiftManagementScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shift Management')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Current Shift', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    const Text('Not currently on shift'),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {},
                        child: const Text('Start Shift'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('This Week\'s Schedule', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: Text('No shifts scheduled')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ShiftComplianceScreen extends StatelessWidget {
  const ShiftComplianceScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shift Compliance')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              color: Colors.green.withOpacity(0.1),
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green, size: 48),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Compliance Score', style: TextStyle(fontWeight: FontWeight.bold)),
                          Text('100%', style: TextStyle(fontSize: 24, color: Colors.green)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text('Compliance History', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: Text('No violations recorded')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Shared Screens
// ============================================================================

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 80, color: Colors.grey),
            const SizedBox(height: 24),
            Text('Page Not Found', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            const Text('The page you\'re looking for doesn\'t exist'),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => context.go(AppRoutes.dashboard),
              child: const Text('Go to Dashboard'),
            ),
          ],
        ),
      ),
    );
  }
}

class ApprovalPendingScreen extends StatelessWidget {
  const ApprovalPendingScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.hourglass_empty, size: 64, color: Colors.orange),
              ),
              const SizedBox(height: 32),
              Text('Approval Pending', style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              )),
              const SizedBox(height: 16),
              const Text(
                'Your profile is being reviewed by our team. This usually takes 24-48 hours.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green),
                          SizedBox(width: 8),
                          Text('Profile submitted'),
                        ],
                      ),
                      SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.pending, color: Colors.orange),
                          SizedBox(width: 8),
                          Text('AI verification in progress'),
                        ],
                      ),
                      SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.circle_outlined, color: Colors.grey),
                          SizedBox(width: 8),
                          Text('Manual review'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WelcomeTutorialScreen extends StatelessWidget {
  const WelcomeTutorialScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.waving_hand, size: 80, color: Colors.amber),
              const SizedBox(height: 32),
              Text('Welcome to Meow Meow!', style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              )),
              const SizedBox(height: 16),
              const Text(
                'Let us show you around and help you get started with finding meaningful connections.',
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.go(AppRoutes.dashboard),
                  child: const Text('Get Started'),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => context.go(AppRoutes.dashboard),
                child: const Text('Skip Tutorial'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// Universal Chat Screen
// ============================================================================

class UniversalChatScreen extends StatelessWidget {
  const UniversalChatScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Universal Chat'),
        actions: [
          IconButton(icon: const Icon(Icons.translate), onPressed: () {}),
          IconButton(icon: const Icon(Icons.settings), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  const Text('Start a conversation'),
                  const SizedBox(height: 8),
                  const Text(
                    'Messages are automatically translated',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                IconButton(icon: const Icon(Icons.attach_file), onPressed: () {}),
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: () {},
                  color: Theme.of(context).primaryColor,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Install App Screen (PWA prompt for web, native guidance for mobile)
// ============================================================================

class InstallAppScreen extends StatelessWidget {
  const InstallAppScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Install App')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  Icons.download,
                  size: 48,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Install Meow Meow',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Center(
              child: Text(
                'Get the full app experience',
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 32),
            _buildBenefitItem(context, Icons.offline_bolt, 'Works Offline', 'Access your chats even without internet'),
            _buildBenefitItem(context, Icons.notifications, 'Push Notifications', 'Never miss a message'),
            _buildBenefitItem(context, Icons.speed, 'Faster Loading', 'Native app performance'),
            _buildBenefitItem(context, Icons.fullscreen, 'Full Screen', 'No browser bars'),
            const SizedBox(height: 32),
            Text('How to Install', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('iOS (Safari)', style: TextStyle(fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    Text('1. Tap the Share button'),
                    Text('2. Select "Add to Home Screen"'),
                    Text('3. Tap "Add"'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Android (Chrome)', style: TextStyle(fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    Text('1. Tap the menu (⋮)'),
                    Text('2. Select "Install app" or "Add to Home screen"'),
                    Text('3. Confirm installation'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildBenefitItem(BuildContext context, IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Theme.of(context).primaryColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(subtitle, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Password Reset Success Screen
// ============================================================================

class PasswordResetSuccessScreen extends StatelessWidget {
  const PasswordResetSuccessScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, size: 64, color: Colors.green),
              ),
              const SizedBox(height: 32),
              Text(
                'Password Reset Successful!',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Your password has been updated successfully. You can now login with your new password.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.go(AppRoutes.auth),
                  child: const Text('Back to Login'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// Personal Details Screen
// ============================================================================

class PersonalDetailsScreen extends StatelessWidget {
  const PersonalDetailsScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Personal Details')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tell us more about yourself', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 24),
            const DropdownButtonFormField<String>(
              decoration: InputDecoration(labelText: 'Marital Status'),
              items: [
                DropdownMenuItem(value: 'single', child: Text('Single')),
                DropdownMenuItem(value: 'divorced', child: Text('Divorced')),
                DropdownMenuItem(value: 'widowed', child: Text('Widowed')),
              ],
              onChanged: null,
            ),
            const SizedBox(height: 16),
            const DropdownButtonFormField<String>(
              decoration: InputDecoration(labelText: 'Education Level'),
              items: [
                DropdownMenuItem(value: 'high_school', child: Text('High School')),
                DropdownMenuItem(value: 'bachelors', child: Text('Bachelor\'s Degree')),
                DropdownMenuItem(value: 'masters', child: Text('Master\'s Degree')),
                DropdownMenuItem(value: 'doctorate', child: Text('Doctorate')),
              ],
              onChanged: null,
            ),
            const SizedBox(height: 16),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Occupation',
                hintText: 'e.g., Software Engineer',
              ),
            ),
            const SizedBox(height: 16),
            const DropdownButtonFormField<String>(
              decoration: InputDecoration(labelText: 'Religion'),
              items: [
                DropdownMenuItem(value: 'hindu', child: Text('Hindu')),
                DropdownMenuItem(value: 'muslim', child: Text('Muslim')),
                DropdownMenuItem(value: 'christian', child: Text('Christian')),
                DropdownMenuItem(value: 'sikh', child: Text('Sikh')),
                DropdownMenuItem(value: 'buddhist', child: Text('Buddhist')),
                DropdownMenuItem(value: 'other', child: Text('Other')),
              ],
              onChanged: null,
            ),
            const SizedBox(height: 16),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Height (cm)',
                hintText: 'e.g., 170',
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Bio',
                hintText: 'Tell others about yourself...',
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => context.push(AppRoutes.photoUpload),
                child: const Text('Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
