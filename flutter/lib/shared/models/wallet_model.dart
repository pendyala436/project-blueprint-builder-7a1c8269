/// Wallet Model - Synced with wallets table
class WalletModel {
  final String id;
  final String userId;
  final double balance;
  final String currency;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const WalletModel({
    required this.id,
    required this.userId,
    this.balance = 0,
    this.currency = 'INR',
    this.createdAt,
    this.updatedAt,
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    return WalletModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      balance: (json['balance'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'INR',
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
    );
  }
}

/// Wallet Transaction Model - Synced with wallet_transactions table
class WalletTransactionModel {
  final String id;
  final String walletId;
  final String userId;
  final String type; // 'credit' or 'debit'
  final double amount;
  final String? description;
  final String? referenceId;
  final String status;
  final DateTime? createdAt;

  const WalletTransactionModel({
    required this.id,
    required this.walletId,
    required this.userId,
    required this.type,
    required this.amount,
    this.description,
    this.referenceId,
    this.status = 'completed',
    this.createdAt,
  });

  factory WalletTransactionModel.fromJson(Map<String, dynamic> json) {
    return WalletTransactionModel(
      id: json['id'] as String,
      walletId: json['wallet_id'] as String? ?? '',
      userId: json['user_id'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num).toDouble(),
      description: json['description'] as String?,
      referenceId: json['reference_id'] as String?,
      status: json['status'] as String? ?? 'completed',
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
    );
  }
}

/// Women Earnings Model - Synced with women_earnings table
class WomenEarningsModel {
  final String id;
  final String userId;
  final double amount;
  final String earningType; // 'chat', 'video_call', 'gift'
  final String? chatSessionId;
  final String? description;
  final DateTime? createdAt;

  const WomenEarningsModel({
    required this.id,
    required this.userId,
    required this.amount,
    required this.earningType,
    this.chatSessionId,
    this.description,
    this.createdAt,
  });

  factory WomenEarningsModel.fromJson(Map<String, dynamic> json) {
    return WomenEarningsModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      amount: (json['amount'] as num).toDouble(),
      earningType: json['earning_type'] as String,
      chatSessionId: json['chat_session_id'] as String?,
      description: json['description'] as String?,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
    );
  }
}

/// Withdrawal Request Model - Synced with withdrawal_requests table
class WithdrawalRequestModel {
  final String id;
  final String userId;
  final double amount;
  final String? paymentMethod;
  final Map<String, dynamic>? paymentDetails;
  final String status;
  final String? processedBy;
  final DateTime? processedAt;
  final String? notes;
  final DateTime? createdAt;

  const WithdrawalRequestModel({
    required this.id,
    required this.userId,
    required this.amount,
    this.paymentMethod,
    this.paymentDetails,
    this.status = 'pending',
    this.processedBy,
    this.processedAt,
    this.notes,
    this.createdAt,
  });

  factory WithdrawalRequestModel.fromJson(Map<String, dynamic> json) {
    return WithdrawalRequestModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      amount: (json['amount'] as num).toDouble(),
      paymentMethod: json['payment_method'] as String?,
      paymentDetails: json['payment_details'] as Map<String, dynamic>?,
      status: json['status'] as String? ?? 'pending',
      processedBy: json['processed_by'] as String?,
      processedAt: json['processed_at'] != null ? DateTime.parse(json['processed_at']) : null,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
    );
  }
}

/// Transaction Result
class TransactionResult {
  final bool success;
  final String? transactionId;
  final double? previousBalance;
  final double? newBalance;
  final String? error;

  const TransactionResult({
    required this.success,
    this.transactionId,
    this.previousBalance,
    this.newBalance,
    this.error,
  });
}
