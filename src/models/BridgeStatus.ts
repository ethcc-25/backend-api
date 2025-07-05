import { Document, model, Schema, Types } from 'mongoose';
import { BridgeStatus as IBridgeStatus } from '../types';

export interface IBridgeStatusDocument extends Omit<IBridgeStatus, '_id' | 'createdAt' | 'updatedAt'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bridgeStatusSchema = new Schema<IBridgeStatusDocument>({
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
  transactionHash: {
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
bridgeStatusSchema.index({ userWallet: 1, status: 1 });
bridgeStatusSchema.index({ transactionHash: 1 });
bridgeStatusSchema.index({ createdAt: -1 });

const BridgeStatus = model<IBridgeStatusDocument>('BridgeStatus', bridgeStatusSchema);

export default BridgeStatus;