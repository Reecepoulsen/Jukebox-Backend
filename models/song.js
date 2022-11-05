import mongoose from 'mongoose';
const {Schema, model} = mongoose;

const songSchema = new Schema({
  spotifyId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  artist: {
    type: String,
    required: true
  },
  album: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  albumImgUrl: {
    type: String,
    required: true
  },
  songUrl: {
    type: String,
    required: true
  },
})