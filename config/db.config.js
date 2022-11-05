import mongoose from 'mongoose';
let { Promise } = mongoose;
import { config } from 'dotenv';
import userSchema from '../models/user.js';

Promise = global.Promise;
config();

const db = {
  mongoose: mongoose,
  url: process.env.MONGODB_URI,
  user: userSchema
};

export default db;