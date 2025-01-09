import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, serverTimestamp, push, remove, onValue,update } from "firebase/database";
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const firebaseConfig = {
  apiKey: "AIzaSyAVVo9BoQwKg4FPE5VKP2zVMW4IXzOrrCw",
  authDomain: "basic-firebase-39c9a.firebaseapp.com",
  databaseURL: "https://basic-firebase-39c9a-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "basic-firebase-39c9a",
  storageBucket: "basic-firebase-39c9a.firebasestorage.app",
  messagingSenderId: "541832893004",
  appId: "1:541832893004:web:a8b36de936436aac141ae9",
  measurementId: "G-3RSPNQ8KCJ"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

//websocket connection for server
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', async (message) => {
    const { action, senderId, receiverId, messageId, newMessage, newFile } = JSON.parse(message);
    if (!senderId || !receiverId) {
      ws.send(JSON.stringify({
        success: false,
        message: 'Sender ID and Receiver ID are required.',
      }));
      return;
    }
    const chatKey = senderId < receiverId 
      ? `${senderId}_${receiverId}` 
      : `${receiverId}_${senderId}`;

    if (action === 'delete') {
      if (!messageId) {
        ws.send(JSON.stringify({
          success: false,
          message: 'Message ID is required for deletion.',
        }));
        return;
      }

      const messageRef = ref(db, `chats/${chatKey}/messages/${messageId}`);
      await remove(messageRef);

      // Broadcast the deletion to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            action: 'delete',
            messageId,
            senderId,
            receiverId,
          }));
        }
      });
    } else if (action === 'update') {
      if (!messageId || (!newMessage && !newFile)) {
        ws.send(JSON.stringify({
          success: false,
          message: 'Message ID and new content are required for update.',
        }));
        return;
      }

      const messageRef = ref(db, `chats/${chatKey}/messages/${messageId}`);
      const updates = {
        message: newMessage || null,
        file: newFile || null,
      };
      await update(messageRef, updates);

      // Broadcast the update to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            action: 'update',
            messageId,
            senderId,
            receiverId,
            newMessage,
            newFile,
          }));
        }
      });
    } else if (action === 'read') {
      if (!messageId) {
        ws.send(JSON.stringify({
          success: false,
          message: 'Message ID is required for marking as read.',
        }));
        return;
      }

      const messageRef = ref(db, `chats/${chatKey}/messages/${messageId}`);
      const updates = {
        read: true,
      };
      await update(messageRef, updates);

      // Broadcast the read status to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            action: 'read',
            messageId,
            senderId,
            receiverId,
          }));
        }
      });
    } else {
      const messagesRef = ref(db, `chats/${chatKey}/messages`);

      onValue(messagesRef, (snapshot) => {
        if (snapshot.exists()) {
          const messages = [];
          snapshot.forEach((childSnapshot) => {
            messages.push({
              id: childSnapshot.key,
              chatKey,
              ...childSnapshot.val(),
            });
          });

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              success: true,
              data: messages,
            }));
          }
        } else {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              success: false,
              message: 'No messages found.',
            }));
          }
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});


// insert message
app.post("/send-message", async (req, res) => {
  try {
    const { message, senderId, receiverId, file } = req.body;
    if (!message && !file) {
      return res.status(400).json({
        success: false,
        message: "Message or file is required.",
      });
    }
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "Sender ID and Receiver ID are required.",
      });
    }
    const chatKey = senderId < receiverId 
      ? `${senderId}_${receiverId}` 
      : `${receiverId}_${senderId}`;

    const formData = {
      message,
      senderId,
      receiverId,
      file: file || null,
      timestamp: Date.now(), 
    };
    const newMessageRef = push(ref(db, `chats/${chatKey}/messages`));
    await set(newMessageRef, formData);
    const updates = {};
    updates[`users/${senderId}/chats/${chatKey}`] = true;
    updates[`users/${receiverId}/chats/${chatKey}`] = true;
    await update(ref(db), updates);

    res.status(200).json({
      success: true,
      message: "Message sent successfully.",
      data: formData,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message.",
      error: error.message,
    });
  }
});


// get messages
app.get("/get-messages", async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;
    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "Sender ID and Receiver ID are required.",
      });
    }

    const chatKey = senderId < receiverId 
      ? `${senderId}_${receiverId}` 
      : `${receiverId}_${senderId}`;

    const messagesRef = ref(db, `chats/${chatKey}/messages`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: "No messages found.",
      });
    }

    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key,
        chatKey:chatKey,
        ...childSnapshot.val(),
      });
    });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve messages.",
      error: error.message,
    });
  }
});

// register
app.post("/register", async (req, res) => {
  try {
    const { userName, gmail, password, status } = req.body;
    if (!userName || !gmail || !password || !status) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    const formData = {
      userName,
      gmail,
      password,
      status,
      timestamp: serverTimestamp(),
    };
    const newUserRef = push(ref(db, "user"));
    await set(newUserRef, formData);
    res.status(200).json({
      success: true,
      message: "Data saved successfully",
      data: formData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
// get user
app.get("/read-user", async (req, res) => {
  try {
    const senderRef = ref(db, 'user');
    const snapshot = await get(senderRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const formattedData = Object.entries(data).map(([key, value]) => ({
        id: key,
        ...value
      }));
      res.json(formattedData);
    } else {
      res.status(204).json([]);
    }
  } catch (error) {
    console.error("Error reading data:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// Delete message
app.delete("/delete-message", async (req, res) => {
  try {
    const { messageId, senderId, receiverId } = req.body;
    if (!messageId || !senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "Message ID, Sender ID, and Receiver ID are required.",
      });
    }

    const chatKey = senderId < receiverId 
      ? `${senderId}_${receiverId}` 
      : `${receiverId}_${senderId}`;

    const messageRef = ref(db, `chats/${chatKey}/messages/${messageId}`);
    await remove(messageRef);

    res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message.",
      error: error.message,
    });
  }
});

// Update message
app.put("/update-message", async (req, res) => {
  try {
    const { messageId, senderId, receiverId, newMessage, newFile } = req.body;
    if (!messageId || !senderId || !receiverId || (!newMessage && !newFile)) {
      return res.status(400).json({
        success: false,
        message: "Message ID, Sender ID, Receiver ID, and new content are required.",
      });
    }

    const chatKey = senderId < receiverId 
      ? `${senderId}_${receiverId}` 
      : `${receiverId}_${senderId}`;

    const messageRef = ref(db, `chats/${chatKey}/messages/${messageId}`);
    const updates = {
      message: newMessage || null,
      file: newFile || null,
    };
    await update(messageRef, updates);

    res.status(200).json({
      success: true,
      message: "Message updated successfully.",
      data: updates,
    });
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update message.",
      error: error.message,
    });
  }
});

app.put('/mark-message-read', async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;

  if (!messageId || !senderId || !receiverId) {
    return res.status(400).json({ error: 'Message ID, Sender ID, and Receiver ID are required.' });
  }

  const chatKey = senderId < receiverId 
    ? `${senderId}_${receiverId}` 
    : `${receiverId}_${senderId}`;

  const messageRef = ref(db, `chats/${chatKey}/messages/${messageId}`);
  const updates = {
    read: true,
  };

  try {
    await update(messageRef, updates);

    // Broadcast the read status to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          action: 'read',
          messageId,
          senderId,
          receiverId,
        }));
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
