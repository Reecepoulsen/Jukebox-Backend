import fetch from "node-fetch";
import User from "../models/user.js";
import Profile from "../models/profile.js";
import UserLite from "../models/userLite.js";
import { getSpotifyData } from "../helpers/spotifyComHelpers.js";
import { refreshSpotifyToken } from "../middleware/refSpotify.js";

const gatherData = async (token, accumulator, url) => {
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
  const spotifyProfile = await getSpotifyData(spotifyToken, "/me");
  return spotifyProfile;
};

const getUsersLikedSongs = async (spotifyToken) => {
  const data = await gatherData(
    spotifyToken,
    [],
    "https://api.spotify.com/v1/me/tracks?limit=50"
  );
  return data.flat();
};

const getAllPlaylists = async (spotifyToken, user) => {
  const data = await getSpotifyData(
    spotifyToken,
    `/users/${user.spotifyUserId}/playlists?limit=50`
  );

  const likedSongsPlaylist = {
    id: `Liked Songs ${user._id}`,
    name: "Liked Songs",
    images: [],
    tracks: [],
  };
  data.items.unshift(likedSongsPlaylist);
  return data.items;
};

const getUsersTopSongs = async (spotifyToken) => {
  const data = await getSpotifyData(spotifyToken, "/me/top/tracks?limit=25");
  return data.items;
};

const getUsersTopArtists = async (spotifyToken) => {
  const data = await getSpotifyData(spotifyToken, "/me/top/artists?limit=10");
  return data.items;
};

async function syncJukeboxPlaylistWithDb(user, playlistId) {
  user.jukeboxPlaylist = {};
  const jukeboxPlaylistSongs = await gatherData(
    user.spotifyAccessToken,
    [],
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`
  );
  jukeboxPlaylistSongs[0].forEach((song) => {
    user.jukeboxPlaylist[song.track.id] = song;
  });
  return user;
}

// function to get my profile, write a separate function to get someone else's
export function getMyProfile(req, res, next) {
  User.findById(req.userId).then((user) => {
    console.log("Get profile for", user.name);
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
          console.log("Building new profile");
          profile = newProfile;
          message = "Built Profile!";
        } else {
          console.log("Profile already exists");
          profile = existingProfile;
          message = "Profile already exists";
        }
        // Get the current user's spotify profile and add that data into Jukebox user and profile
        const getSpotifyProfileResult = await getCurrentSpotifyProfile(token);
        if (getSpotifyProfileResult.error) {
          user.spotifyUserId = "None";
        } else {
          user.spotifyUserId = getSpotifyProfileResult.id;
          if (getSpotifyProfileResult.images[0]?.url) {
            profile.profileImgUrl = getSpotifyProfileResult.images[0].url;
            UserLite.findOne({ userId: req.userId }).then((userLite) => {
              if (!userLite) {
                userLite = new UserLite({
                  userId: req.userId,
                  name: user.name,
                });
              }
              userLite.profileImg = getSpotifyProfileResult.images[0].url;
              userLite.save();
            });
          }
        }

        // Create the top songs widget
        const topSongs = await getUsersTopSongs(token);
        const topHitsWidget = {
          type: "songList",
          title: "Top Hits",
          privacy: "Public",
          data: topSongs,
          addedToProfile: true,
        };
        let topHitsIndex = profile.widgetList.findIndex(
          (widget) => widget.title === "Top Hits"
        );
        topHitsIndex === -1
          ? profile.widgetList.push(topHitsWidget)
          : (profile.widgetList[topHitsIndex].data = topHitsWidget.data);

        // Create the playlist widget
        const playlists = await getAllPlaylists(token, user);
        const playlistWidget = {
          type: "playlist",
          title: "Playlists",
          privacy: "Public",
          data: playlists,
          addedToProfile: true,
        };
        let playlistIndex = profile.widgetList.findIndex(
          (widget) => widget.title === "Playlists"
        );
        playlistIndex === -1
          ? profile.widgetList.push(playlistWidget)
          : (profile.widgetList[playlistIndex].data = playlistWidget.data);

        // Create the artist spotlight widget
        const topArtists = await getUsersTopArtists(token);
        const artistSpotlightWidget = {
          type: "artistSpotlight",
          title: "Artist Spotlight",
          privacy: "Public",
          data: topArtists,
          addedToProfile: true,
        };
        let artistSpotlightIndex = profile.widgetList.findIndex(
          (widget) => widget.title === "Artist Spotlight"
        );
        artistSpotlightIndex === -1
          ? profile.widgetList.push(artistSpotlightWidget)
          : (profile.widgetList[artistSpotlightIndex].data =
              artistSpotlightWidget.data);

        let playlistId = await getJukeboxPlaylistId(user);
        user = await syncJukeboxPlaylistWithDb(user, playlistId);

        await user.save();
        await profile.save();
        res.status(200).json({ message: message, data: profile });
      })
      .catch((err) => next(err));
  });
}

export function getOtherProfile(req, res, next) {
  Profile.findOne({ userId: req.params.userId })
    .then((profile) => {
      if (!profile) {
        throw new Error(`Error getting profile for user ${req.params.userId}`);
      }

      res.status(200).json({
        message: `Result of getting profile for user ${req.params.userId}`,
        data: profile,
      });
    })
    .catch((err) => next(err));
}

export function getUser(req, res, next) {
  const userId = req.userId;

  User.findOne({ _id: userId })
    .then((user) => {
      if (!user) {
        const err = new Error("A user with this id doesn't exist");
        err.statusCode = 401;
        throw err;
      }

      res.status(200).json({ message: "Found user", user: user });
    })
    .catch((err) => next(err));
}

export function getAllUserLites(req, res, next) {
  UserLite.find({ _: true })
    .then((users) => {
      if (!users) {
        const err = new Error("Get all users was unsuccessful");
        err.statusCode = 401;
        throw err;
      }

      res
        .status(200)
        .json({ message: "Successfully got all users", data: users });
    })
    .catch((err) => next(err));
}

export function getSongsInPlaylist(req, res, next) {
  const playlistId = req.params.playlistId;

  User.findOne({ _id: req.userId })
    .then(async (user) => {
      if (!user) {
        throw new Error("Unable to find user when getting songs in playlist");
      }

      let playlistData = null;
      if (playlistId.includes("Liked Songs")) {
        let ownerUserId = playlistId.slice(12, playlistId.length);
        await User.findById(ownerUserId).then(async (owner) => {
          console.log(
            "\nCheck if liked songs owner's spotify token needs a refresh "
          );
          await refreshSpotifyToken(owner);
          playlistData = await getUsersLikedSongs(owner.spotifyAccessToken);
        });
      } else {
        playlistData = await gatherData(
          user.spotifyAccessToken,
          [],
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`
        );
      }

      res.status(200).json({
        message: "Successfully got songs for playlist",
        data: playlistData,
      });
    })
    .catch((err) => next(err));
  // gatherData;
}

export function getTopSongsForArtist(req, res, next) {
  const artistId = req.params.artistId;
  User.findById(req.userId)
    .then(async (user) => {
      if (!user) {
        throw new Error("Couldn't find user when get top songs for artist");
      }

      const response = await getSpotifyData(
        user.spotifyAccessToken,
        `/artists/${artistId}/top-tracks?market=US`
      );

      const artistSongs = response.tracks;
      res
        .status(200)
        .json({ message: "Got artists top songs", data: artistSongs });
    })
    .catch((err) => next(err));
}

const getJukeboxPlaylistId = async (user) => {
  const response = await getSpotifyData(
    user.spotifyAccessToken,
    `/users/${user.spotifyUserId}/playlists`
  );
  const playlists = response.items;
  const jukeboxPlaylist = playlists.find((p) => p.name === "Jukebox");
  const playlistExists = jukeboxPlaylist !== undefined;

  if (playlistExists) {
    console.log("Jukebox playlist already exists");
    return jukeboxPlaylist.id;
  } else {
    const payload = {
      name: "Jukebox",
      description: `${user.spotifyUserId}'s playlist linked to their Jukebox account`,
    };

    const playlistData = await fetch(
      `https://api.spotify.com/v1/users/${user.spotifyUserId}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.spotifyAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    ).then((res) => res.json());

    console.log("New Jukebox playlist generated", playlistData.id);
    return playlistData.id;
  }
};

export function addSong(req, res, next) {
  User.findById(req.userId)
    .then(async (user) => {
      if (!user) {
        throw new Error(
          "Couldn't find user when adding song to jukebox playlist"
        );
      }
      let playlistId = await getJukeboxPlaylistId(user);

      let payload = {
        uris: req.body.trackUris,
      };

      fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.spotifyAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json())
        .then((jsonData) => {
          const songId = req.body.song.id;
          user.jukeboxPlaylist[songId] = req.body.song;
          User.replaceOne({ _id: user._id }, user).then((result) => {
            res
              .status(200)
              .json({ message: "Successfully added song", data: jsonData });
          });
        });
    })
    .catch((err) => next(err));
}

export function removeSong(req, res, next) {
  User.findById(req.userId)
    .then(async (user) => {
      if (!user) {
        throw new Error("Couldn't find user when removing song");
      }

      let playlistId = await getJukeboxPlaylistId(user);

      let payload = {
        uris: req.body.trackUris,
      };

      fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.spotifyAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json())
        .then((jsonData) => {
          const songId = req.body.song.id;
          delete user.jukeboxPlaylist[songId];

          User.replaceOne({ _id: user._id }, user).then((result) => {
            res
              .status(200)
              .json({ message: "Successfully removed song", data: jsonData });
          });
        });
    })
    .catch((err) => next(err));
}

export function updateWidgetPrivacy(req, res, next) {
  Profile.findOne({ userId: req.userId })
    .then(async (profile) => {
      if (!profile) {
        throw new Error(
          `Error while updating widget privacy setting, unable to find profile for userId ${req.userId}`
        );
      }

      const targetIndex = profile.widgetList.findIndex(
        (w) => w.title === req.body.widgetTitle
      );
      const widgetToUpdate = profile.widgetList[targetIndex];
      widgetToUpdate.privacy = req.body.privacy;
      profile.widgetList[targetIndex] = widgetToUpdate;
      profile.save().then((newProfile) => {
        res.status(200).json({
          message: `Request to change widget privacy to ${req.body.privacy}`,
          data: newProfile,
        });
      });
    })
    .catch((err) => next(err));
}

export function getUsersJukeboxPlaylist(req, res, next) {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        throw new Error("Couldn't find user when retrieving jukebox playlist");
      }
      res.status(200).json({
        message: "User's jukebox playlist",
        data: user.jukeboxPlaylist,
      });
    })
    .catch((err) => next(err));
}

export function getUsersSpotifyToken(req, res, next) {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        throw new Error(
          "Couldn't find user while getting spotify access token"
        );
      }
      res.status(200).json({
        message: "Got user's spotify token",
        data: user.spotifyAccessToken,
      });
    })
    .catch((err) => next(err));
}

export function getFollowersForUser(req, res, next) {
  UserLite.findOne({ userId: req.userId })
    .then(async (userlite) => {
      if (!userlite) {
        throw new Error("Couldn't find userlite when getting their followers");
      }

      const followerList = [];
      for (let userliteId in userlite.followers) {
        await UserLite.findById(userlite.followers[userliteId]).then(
          async (followersUserLite) => {
            if (followersUserLite) {
              followerList.push(followersUserLite);
            } else {
              console.log(
                "-----------> Found a user that no longer exists while getting followers",
                userlite.followers[userliteId]
              );
              delete userlite.followers[userliteId];
              await UserLite.replaceOne({ _id: userlite._id }, userlite).then(
                (result) => {
                  console.log(
                    "Result of userlite replaceOne while deleting phantom account",
                    result
                  );
                }
              );
            }
          }
        );
      }
      res.status(200).json({
        message: "Got user's followers",
        userList: followerList,
        userDataStructure: userlite.followers,
      });
    })
    .catch((err) => next(err));
}

export function getFollowingForUser(req, res, next) {
  UserLite.findOne({ userId: req.userId })
    .then(async (userlite) => {
      if (!userlite) {
        throw new Error("Couldn't find userlite when getting their following");
      }

      const followingList = [];
      for (let userliteId in userlite.following) {
        await UserLite.findById(userlite.following[userliteId]).then(
          async (followingUserLite) => {
            if (followingUserLite) {
              followingList.push(followingUserLite);
            } else {
              console.log(
                "-----------> Found a user that no longer exists while getting following",
                userlite.following[userliteId]
              );
              delete userlite.following[userliteId];
              await UserLite.replaceOne({ _id: userlite._id }, userlite).then(
                (result) => {
                  console.log(
                    "Result of userlite replaceOne while deleting phantom account",
                    result
                  );
                }
              );
            }
          }
        );
      }
      res.status(200).json({
        message: "Got user's following",
        userList: followingList,
        userDataStructure: userlite.following,
      });
    })
    .catch((err) => next(err));
}

export async function modifyFollowStatus(req, res, next) {
  try {
    let newUserlite = null;
    const followerCount = await UserLite.findOne({ userId: req.userId }).then(
      async (userlite) => {
        if (!userlite) {
          throw new Error("Couldn't find userlite to add follower count to");
        }

        await UserLite.findById(req.body.followUserliteId).then(
          async (userliteToModifyFollowersFor) => {
            if (!userliteToModifyFollowersFor) {
              throw new Error("Couldn't find userlite to add follower to");
            }

            newUserlite = userlite;
            if (req.body.operation === "add") {
              newUserlite.following[req.body.followUserId] =
                req.body.followUserliteId;
              userliteToModifyFollowersFor.followers[req.userId] = userlite._id;
            } else if (req.body.operation === "remove") {
              delete newUserlite.following[req.body.followUserId];
              delete userliteToModifyFollowersFor.followers[req.userId];
            }

            await UserLite.replaceOne(
              { userId: userliteToModifyFollowersFor.userId },
              userliteToModifyFollowersFor
            );
          }
        );
        return Object.keys(newUserlite.followers).length;
      }
    );

    // let newProfile = null;
    // await Profile.findOne({ userId: req.body.followUserId }).then((profile) => {
    //   if (!profile) {
    //     throw new Error("Couldn't find profile to add follower count to");
    //   }
    //   newProfile = profile;
    //   newProfile.followerCount = followerCount;
    // });

    await UserLite.replaceOne({ userId: req.userId }, newUserlite);
    // await Profile.replaceOne({userId: req.userId}, newProfile);
    res
      .status(200)
      .json({ message: "Modified follower status", data: followerCount });
  } catch (err) {
    next(err);
  }
}
