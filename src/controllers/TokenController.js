const Token = require("../model/Token");

const saveToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    const existingToken = await Token.findOne({ token });
    if (existingToken) {
      return res
        .status(200)
        .json({ success: true, message: "Token already exists" });
    }

    const newToken = new Token({ token });
    await newToken.save();

    return res
      .status(201)
      .json({ success: true, message: "Token saved successfully" });
  } catch (error) {
    console.error("Error saving token:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save token" });
  }
};

const getAllTokens = async (req, res) => {
  try {
    const tokens = await Token.find();
    return res.status(200).json({ success: true, tokens });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch tokens" });
  }
};

module.exports = { saveToken, getAllTokens };
