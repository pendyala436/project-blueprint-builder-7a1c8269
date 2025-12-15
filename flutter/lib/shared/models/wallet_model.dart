import 'package:freezed_annotation/freezed_annotation.dart';

part 'wallet_model.freezed.dart';
part 'wallet_model.g.dart';

/// Wallet Model
@freezed
class WalletModel with _$WalletModel {
  const factory WalletModel({
    required String id,
    required String userId,
    @Default(0) double balance,
    @Default('INR') String currency,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _WalletModel;

  factory WalletModel.fromJson(Map<String, dynamic> json) =>
      _$WalletModelFromJson(json);
}

/// Wallet Transaction Model
@freezed
class WalletTransactionModel with _$WalletTransactionModel {
  const factory WalletTransactionModel({
    required String id,
    required String walletId,
    required String userId,
    required String type, // 'credit' or 'debit'
    required double amount,
    String? description,
    String? referenceId,
    @Default('pending') String status,
    DateTime? createdAt,
  }) = _WalletTransactionModel;

  factory WalletTransactionModel.fromJson(Map<String, dynamic> json) =>
      _$WalletTransactionModelFromJson(json);
}

/// Women Earnings Model
@freezed
class WomenEarningsModel with _$WomenEarningsModel {
  const factory WomenEarningsModel({
    required String id,
    required String userId,
    required double amount,
    required String earningType, // 'chat', 'video_call', 'gift'
    String? chatSessionId,
    String? description,
    DateTime? createdAt,
  }) = _WomenEarningsModel;

  factory WomenEarningsModel.fromJson(Map<String, dynamic> json) =>
      _$WomenEarningsModelFromJson(json);
}

/// Withdrawal Request Model
@freezed
class WithdrawalRequestModel with _$WithdrawalRequestModel {
  const factory WithdrawalRequestModel({
    required String id,
    required String userId,
    required double amount,
    String? paymentMethod,
    Map<String, dynamic>? paymentDetails,
    @Default('pending') String status,
    String? processedBy,
    DateTime? processedAt,
    String? notes,
    DateTime? createdAt,
  }) = _WithdrawalRequestModel;

  factory WithdrawalRequestModel.fromJson(Map<String, dynamic> json) =>
      _$WithdrawalRequestModelFromJson(json);
}

/// Transaction Result
@freezed
class TransactionResult with _$TransactionResult {
  const factory TransactionResult({
    required bool success,
    String? transactionId,
    double? previousBalance,
    double? newBalance,
    String? error,
  }) = _TransactionResult;

  factory TransactionResult.fromJson(Map<String, dynamic> json) =>
      _$TransactionResultFromJson(json);
}
