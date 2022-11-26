import { Router } from "express";
import isAuth from "../middleware/is-auth.js";
import refSpotify from "../middleware/refSpotify.js";
import {
  getMyProfile,
  getUser,
  getAllUserLites,
  getSongsInPlaylist,
  updateWidgetPrivacy,
  addSong,
  getUsersJukeboxPlaylist,
  removeSong,
  getOtherProfile,
} from "../controllers/profile.js";

const router = Router();

router.get("/", isAuth, refSpotify, getMyProfile);

router.get("/users", isAuth, getAllUserLites);

router.get("/songs/:playlistId", isAuth, refSpotify, getSongsInPlaylist);

router.post("/widget", isAuth, updateWidgetPrivacy);

router.post("/playlist/addSong", isAuth, refSpotify, addSong);

router.delete("/playlist/removeSong", isAuth, refSpotify, removeSong);

router.get("/playlist", isAuth, getUsersJukeboxPlaylist);

router.get("/:userId", isAuth, getOtherProfile);


// router.get("/build", isAuth, refSpotify, buildProfile);

export default router;
