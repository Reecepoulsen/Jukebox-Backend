import mongoose from 'mongoose';
const {Schema, model} = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  loginToken: {
    type: String,
    required: true,
    default: 'No token'
  }, 
  spotifyUserId: {
    type: String,
    required: true,
    default: "None"
  },
  spotifyAccessToken: {
    type: String,
    required: true,
    default: "No Token"
  },
  spotifyRefreshToken: {
    type: String,
    required: true,
    default: "No Token"
  },
  spotifyTokenTimer: {
    type: Number,
    required: true,
    default: 0
  },
  lastRefresh: {
    type: Date,
    required: true,
    default: new Date()
  },
  jukeboxPlaylist: {
    type: Object,
    required: true,
    default: new Map()
  }
});

export default model('User', userSchema);