const NotificationService = require("../service/NotificationService");

const sendFirebaseNotification = async (req, res) => {
  try {
    const { token, title, body } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({
        success: false,
        messsage: "Token, title, and body are required.",
      });
    }

    await NotificationService.sendNotification(token, title, body);
    return res
      .status(200)
      .json({ success: true, message: "Notification send Successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res
      .status(500)
      .json({ success: false, messsage: "Failed to send notification." });
  }
};

const sendMultipleFirebaseNotification = async (req, res) => {
  try {
    const { tokens, title, body } = req.body;

    if (!tokens || !title || !body) {
      return res.status(400).json({
        success: false,
        messsage: "Token, title, and body are required.",
      });
    }

    await NotificationService.sendMultipleNotifications(tokens, title, body);
    return res
      .status(200)
      .json({ success: true, message: "Notification send Successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res
      .status(500)
      .json({ success: false, messsage: "Failed to send notification." });
  }
};

async function sendEveryMinuteNotification() {
  const title = "Every Minute Notification";
  const body = "This is a notification sent every minute.";
  const token =
    "eXI-ZFOFeejRudmxTWdxiY:APA91bGZX6zqm2e-S0k3fl2y9n_cnLG2ul8rtk_rpBr0y3LnIk8lZMV0SNArpfICjSDIbjgObI6bW4IMHN-2WIfOWJ3qi0Jr8BDmSVHnO2XYfsj_VvkKf0Q";

  await NotificationService.sendNotification(token, title, body);
}

module.exports = {
  sendFirebaseNotification,
  sendEveryMinuteNotification,
  sendMultipleFirebaseNotification,
};
