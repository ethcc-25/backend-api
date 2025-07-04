import { Document, model, Schema } from 'mongoose';

export interface Position {
  chain: string;
  apy: number;
  protocol: string;
}

export interface ProfileData {
  user_address: string;
  positions: Position[];
}

export interface IProfile extends ProfileData, Document {}

const profileSchema = new Schema<IProfile>({
  user_address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  positions: [{
    chain: { 
      type: String, 
      required: true 
    },
    apy: { 
      type: Number, 
      required: true 
    },
    protocol: { 
      type: String, 
      required: true 
    }
  }]
}, {
  timestamps: true
});

const Profile = model<IProfile>('Profile', profileSchema);

export default Profile; 