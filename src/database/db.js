const mongoose = require("mongoose");

const mongoURL = process.env.MONGODB_URL;

mongoose
  .connect(mongoURL)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });
