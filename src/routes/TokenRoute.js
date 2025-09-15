const express = require("express");
const router = express.Router();
const { saveToken, getAllTokens } = require("../controllers/TokenController");

router.post("/save", saveToken);
router.get("/all", getAllTokens);

module.exports = router;
