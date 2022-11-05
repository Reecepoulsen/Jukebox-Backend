import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
const { json } = bodyParser;

// Import routes
import profileRoutes from "./routes/profile.js";
import connectRoutes from "./routes/connect.js";
import feedRoutes from "./routes/feed.js";
import discoverRoutes from "./routes/discover.js";
import authRoutes from "./routes/auth.js";

const port = process.env.PORT || 8080;

const app = express();
app
  // .use(cors)
  .use(json())
  .use((req, res, next) => {
    // Set up CORS
    res.header("Access-Control-Allow-Origin", "*");
    // res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Methods", "*");
    res.header(
      "Access-Control-Allow-Headers",
      // "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Origin, Access-Control-Allow-Methods,Access-Control-Allow-Headers"
      "*"
    );
    next();
  })
  .use("/profile", profileRoutes)
  .use("/connect", connectRoutes)
  .use("/feed", feedRoutes)
  .use("/discover", discoverRoutes)
  .use("/auth", authRoutes)
  .use((error, req, res, next) => {
    // Error handling
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res
      .status(status)
      .json({ message: message, data: data, statusCode: status });
  });

// Set up DB Connection
import db from "./config/db.config.js";
mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`DB Connected and server running on ${port}`);
    });
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });
