const admin = require("../../utils/firebase");

class NotificationService {
  static async sendNotification(token, title, body) {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token,
    };

    try {
      const response = await admin.messaging().send(message);
      console.log("Successfully sent message:", response);
      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  static async sendMultipleNotifications(tokens, title, body) {
    const message = {
      tokens: tokens,
      notification: {
        title: title,
        body: body,
      },
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log("Successfully sent messages:", response);
      return response;
    } catch (error) {
      console.error("Error sending messages:", error);
      throw error;
    }
  }
}

module.exports = NotificationService;
