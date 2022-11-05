import fetch from "node-fetch";
import User from "../models/user.js";
import Profile from "../models/profile.js";
import UserLite from "../models/userLite.js";
import { getSpotifyData } from "../helpers/spotifyComHelpers.js";

const gatherData = async (token, accumulator, url) => {
  console.log("Getting", url);
  await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then(async (result) => {
      accumulator.push(result.items);
      if (result.next) {
        await gatherData(token, accumulator, result.next);
      }
    })
    .catch((err) => {
      throw err;
    });
  return accumulator;
};

const getCurrentSpotifyProfile = async (spotifyToken) => {
  const spotifyProfile = await getSpotifyData(spotifyToken, '/me')
  return spotifyProfile;
}

const getAllPlaylists = async (spotifyToken, spotifyUserId) => {
  const data = await getSpotifyData(spotifyToken, `/users/${spotifyUserId}/playlists`);
  return data.items;
};

const getUsersTopSongs = async (spotifyToken) => {
  const data = await getSpotifyData(spotifyToken, '/me/top/tracks?limit=25')
  return data.items;
}

const getUsersTopArtists = async (spotifyToken) => {
  const data = await getSpotifyData(spotifyToken, '/me/top/artists?limit=10')
  return data.items;
}

// function to get my profile, write a separate function to get someone else's
export function getMyProfile(req, res, next) {
  User.findOne({ _id: req.userId }).then((user) => {
    console.log("Get profile for", user.name)
    const token = user.spotifyAccessToken;

    Profile.findOne({ userId: req.userId })
      .then(async (existingProfile) => {
        let message = "";
        let profile = "";

        if (!existingProfile) {
          const newProfile = new Profile({
            userId: req.userId,
            displayName: user.name,
            playlists: [],
            widgetList: [],
          });

          profile = newProfile;
          message = "Built Profile!";
        } else {
          profile = existingProfile;
          message = "Profile already exists";
        }
        // Get the current user's spotify profile and add that data into Jukebox user and profile
        const spotifyProfile = await getCurrentSpotifyProfile(token)
        user.spotifyUserId = spotifyProfile.id;
        if (spotifyProfile.images.length > 0){
          profile.profileImgUrl = spotifyProfile.images[0].url;
        }

        // Create the top songs widget
        const topSongs = await getUsersTopSongs(token);
        const topHitsWidget = {
          type: "songList",
          title: "Top Hits",
          privacy: "Private",
          data: topSongs,
          addedToProfile: true
        }
        if (profile.widgetList.find((widget) => widget.title === "Top Hits") === undefined) {
          profile.widgetList.push(topHitsWidget)
        }

        // Create the playlist widget
        const playlists = await getAllPlaylists(token, user.spotifyUserId);
        const playlistWidget = {
          type: "playlist",
          title: "Playlists",
          privacy: "Private",
          data: playlists,
          addedToProfile: true
        }
        if (profile.widgetList.find((widget) => widget.title === "Playlists") === undefined) {
          profile.widgetList.push(playlistWidget)
        }

        // Create the artist spotlight widget
        const topArtists = await getUsersTopArtists(token);
        const artistSpotlightWidget = {
          type: "artistSpotlight",
          title: "Artist Spotlight",
          privacy: "Private",
          data: topArtists,
          addedToProfile: true
        }
        if (profile.widgetList.find((widget) => widget.title === "Artist Spotlight") === undefined) {
          profile.widgetList.push(artistSpotlightWidget)
        }

        user.save();
        profile.save();
        res.status(200).json({ message: message, data: profile });
      })
      .catch((err) => {
        next(err);
      });
  });
}

export function getUser(req, res, next) {
  const userId = req.userId;

  User.findOne({_id: userId})
  .then(user => {
    if (!user) {
      const err = new Error("A user with this id doesn't exist");
      err.statusCode = 401;
      throw err;
    }

    res.status(200).json({ message: "Found user", user: user})
  })
  .catch((err) => {
    next(err);
  });
}

export function getAllUserLites(req, res, next) {
  UserLite.find({_: true})
  .then(users => {
    if (!users) {
      const err = new Error("Get all users was unsuccessful");
      err.statusCode = 401;
      throw err;
    }

    console.log("All users", users)
    res.status(200).json({message: "Successfully got all users", users: users});
  })
  .catch(err => {
    next(err);
  })

}