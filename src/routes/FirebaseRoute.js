const express = require("express");
const {
  sendFirebaseNotification,
  sendMultipleFirebaseNotification,
} = require("../controllers/FirebaseController");
const router = express.Router();

router.post("/send-notification", sendFirebaseNotification);

router.post("/send-multiple-notifications", sendMultipleFirebaseNotification);

module.exports = router;
