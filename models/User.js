import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  },
  mobile: {
    type: String,
    default: null,
  },
  zipCode: {
    type: String,
    trim: true,
    maxlength: 20,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  image: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Sparse unique index for mobile - allows null values for Google login users
userSchema.index({ mobile: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);
