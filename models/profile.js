import mongoose from 'mongoose';
const {Schema, model} = mongoose;

const profileSchema = new Schema({
  // user: {
  //   type: Schema.Types.ObjectId,
  //   required: true,
  //   ref: 'User'
  // },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  displayName: {
    type: String,
    required: true
  },
  profileImgUrl: {
    type: String,
    required: true,
    default: "None"
  },
  bannerImgUrl: {
    type: String,
    required: true,
    default: "None"
  },
  hitCount: {
    type: Number,
    required: true,
    default: 0
  },
  followerCount: {
    type: Number,
    required: true,
    default: 0
  },
  playlists: [
    {
      type: Object
    }
  ],
  widgetList: [
    {
      type: Object
    },
  ]
});

export default model('Profile', profileSchema);