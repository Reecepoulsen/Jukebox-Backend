import jwt from "jsonwebtoken";
import fetch from "node-fetch";
const { sign } = jwt;
import User from "../models/user.js";
import UserLite from "../models/userLite.js";
import CryptoJS from "crypto-js";

export function signup(req, res, next) {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  let newUser = null;
  let token = null;
  User.findOne({ email: email })
    .then((foundUser) => {
      if (foundUser) {
        const err = new Error("A user with that email already exists");
        err.statusCode = 401;
        throw err;
      }

      const user = new User({
        name: name,
        email: email,
        password: password,
      });

      token = sign(
        {
          // Bundle the email and userId into the JWT
          email: user.email,
          userId: user._id.toString(),
        },
        process.env.ACCESS_TOKEN_SECRET
      );

      user.loginToken = token;
      newUser = user;
      return user.save();
    })
    .then((result) => {
      const userLite = new UserLite({
        userId: newUser._id,
        name: name,
      });
      userLite.save();
      return res.status(201).json({
        message: "User Created",
        data: { user: newUser, token: token },
      });
    })
    .catch((err) => {
      next(err);
    });
}

export function login(req, res, next) {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        const err = new Error("Invalid login");
        err.statusCode = 401;
        throw err;
      }

      const reqPass = CryptoJS.AES.decrypt(
        req.body.password,
        process.env.ENCRYPTION_SECRET
      ).toString(CryptoJS.enc.Utf8);
      const userPass = CryptoJS.AES.decrypt(
        user.password,
        process.env.ENCRYPTION_SECRET
      ).toString(CryptoJS.enc.Utf8);

      if (reqPass != userPass) {
        const err = new Error("Invalid login");
        err.statusCode = 401;
        throw err;
      }

      return res.status(200).json({
        message: "Login Successful",
        data: { user: user, token: user.loginToken },
      });
    })
    .catch((err) => {
      next(err);
    });
}

export async function authorizeSpotify(req, res, next) {
  console.log("authorizespotify");
  User.findById(req.userId)
    .then(async (user) => {
      if (!user) {
        const err = new Error(
          "Error finding user to add spotify access token to"
        );
        throw err;
      }

      const data = req.body;
      user.spotifyAccessToken = data.access_token;
      user.spotifyRefreshToken = data.refresh_token;
      user.spotifyTokenTimer = data.expires_in;
      user.lastRefresh = new Date();
      user.save();

      console.log("Updated Spotify token for", user.name);

      res
        .status(200)
        .json({
          status: 200,
          message: "Successfully connected Spotify account",
        });
    })
    .catch((err) => {
      err.statusCode = 401;
      next(err);
    });
}

export async function getSpotifyToken(req, res, next) {
  User.findOne({ _id: req.userId })
    .then((user) => {
      if (!user) {
        const err = new Error("Unable to find a user to get spotify token for");
        throw err;
      }

      res
        .status(200)
        .json({
          message: `Got ${user.name}'s spotifyAccessToken`,
          data: user.spotifyAccessToken,
        });
      })
      .catch((err) => {
      err.statusCode(404);
      next(err);
    });
}