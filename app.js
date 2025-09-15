const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config();
const db = require("./src/database/db");
const {
  sendEveryMinuteNotification,
} = require("./src/controllers/FirebaseController");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const firebaseRoute = require("./src/routes/FirebaseRoute");
app.use("/api/notification", firebaseRoute);

// CRON job to send notification every minute uncomment and check

// cron.schedule("* * * * *", async () => {
//   try {
//     await sendEveryMinuteNotification();
//     console.log("Every minute notification sent");
//   } catch (error) {
//     console.error("Error in cron job:", error);
//   }
// });

const tokenRoute = require("./src/routes/TokenRoute");
app.use("/api/token", tokenRoute);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
