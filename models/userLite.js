import mongoose from 'mongoose';
const {Schema, model} = mongoose;

const UserLiteSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  name: {
    type: String,
    required: true
  },
  profileImg: {
    type: String,
    required: true,
    default: "None"
  },
  followers: {
    type: Object,
    required: true,
    default: {}
  }
});

export default model('UserLite', UserLiteSchema);