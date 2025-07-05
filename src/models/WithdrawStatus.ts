import { Document, model, Schema, Types } from 'mongoose';
import { WithdrawStatus as IWithdrawStatus, Position } from '../types';

export interface IWithdrawStatusDocument extends Omit<IWithdrawStatus, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const positionSchema = new Schema({
  pool: { type: Number, required: true },
  positionId: { type: String, required: true },
  user: { type: String, required: true },
  amountUsdc: { type: String, required: true },
  shares: { type: String, required: true },
  vault: { type: String, required: true }
}, { _id: false });

const withdrawStatusSchema = new Schema<IWithdrawStatusDocument>({
  userAddress: {
    type: String,
    required: true,
    index: true
  },
  position: {
    type: positionSchema,
    required: true
  },
  srcChainDomain: {
    type: Number,
    required: true,
    index: true
  },
  dstChainDomain: {
    type: Number,
    required: true,
    default: 14 // Always WORLD
  },
  status: {
    type: String,
    enum: ['checking_position', 'position_found', 'initiating_withdraw', 'withdraw_initiated', 'pending_attestation', 'attestation_received', 'processing_withdraw', 'completed', 'failed'],
    default: 'checking_position',
    index: true
  },
  initWithdrawTxHash: {
    type: String,
    index: true
  },
  bridgeTransactionHash: {
    type: String,
    index: true
  },
  attestationMessage: {
    type: String
  },
  attestation: {
    type: String
  },
  processWithdrawTxHash: {
    type: String,
    index: true
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient querying
withdrawStatusSchema.index({ userAddress: 1, status: 1 });
withdrawStatusSchema.index({ initWithdrawTxHash: 1 });
withdrawStatusSchema.index({ bridgeTransactionHash: 1 });
withdrawStatusSchema.index({ createdAt: -1 });

const WithdrawStatus = model<IWithdrawStatusDocument>('WithdrawStatus', withdrawStatusSchema);

export default WithdrawStatus;