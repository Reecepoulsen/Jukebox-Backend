import fetch from "node-fetch";
import User from "../models/user.js";

const encodeFormData = (data) => {
  return Object.keys(data)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
};

export async function refreshSpotifyToken(user){
  const lastRefresh = user.lastRefresh;
  const now = new Date();
  if (
    now.getTime() - lastRefresh.getTime() >=
    user.spotifyTokenTimer * 1000 // * 1000 because get time returns milliseconds and spotify token timer is in seconds
  ) {
    console.log("------------------------------------------");
    console.log("Refreshing token for", user.name);
    console.log("------------------------------------------");
    const body = {
      grant_type: "refresh_token",
      refresh_token: user.spotifyRefreshToken,
    };

    await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          new Buffer.from(
            process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
      },
      body: encodeFormData(body),
    })
      .then((response) => response.json())
      .then(async (data) => {
        if (!data.access_token) {
          const err = new Error(
            "Error refreshing token, no new token provided"
          );
          throw err;
        }
        user.spotifyAccessToken = data.access_token;
        user.lastRefresh = new Date();
        await user.save();
      });
  } else {
    console.log("------------------------------------------");
    console.log("Token is still valid for", user.name);
    console.log("------------------------------------------");
  }
};

export default async function refSpotify(req, res, next) {
  User.findById(req.userId)
    .then(async (user) => {
      if (!user) {
        const err = new Error("Error finding user while refreshing token");
        throw err;
      }

      if (user.spotifyAccessToken === "No Token") {
        next();
      }
      await refreshSpotifyToken(user);
      next();
    })
    .catch((err) => {
      err.statusCode = 401;
      next(err);
    });
}
