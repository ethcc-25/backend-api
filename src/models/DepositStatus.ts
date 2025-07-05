import { Document, model, Schema, Types } from 'mongoose';
import { DepositStatus as IDepositStatus } from '../types';

export interface IDepositStatusDocument extends Omit<IDepositStatus, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const depositStatusSchema = new Schema<IDepositStatusDocument>({
  chainSource: {
    type: String,
    required: true,
    index: true
  },
  chainDest: {
    type: String,
    required: true,
    index: true
  },
  userWallet: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: String,
    required: true
  },
  opportunity: {
    protocol: { type: String, required: true },
    apy: { type: Number, required: true },
    chain: { type: String, required: true },
    poolAddress: { type: String },
    additionalData: { type: Schema.Types.Mixed }
  },
  bridgeTransactionHash: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['pending_attestation', 'attestation_received', 'processing_deposit', 'deposit_confirmed', 'completed', 'failed'],
    default: 'pending_attestation',
    index: true
  },
  attestationMessage: {
    type: String
  },
  attestation: {
    type: String
  },
  depositTxHash: {
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
depositStatusSchema.index({ userWallet: 1, status: 1 });
depositStatusSchema.index({ bridgeTransactionHash: 1 });
depositStatusSchema.index({ createdAt: -1 });

const DepositStatus = model<IDepositStatusDocument>('DepositStatus', depositStatusSchema);

export default DepositStatus;