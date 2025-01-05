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

wss.on('connection', (ws) => {
  console.log('Client connected');

  const receiverRef = ref(db, 'receiver');
  onValue(receiverRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (ws.readyState === ws.OPEN) { 
        ws.send(JSON.stringify(data));
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnecteddddd');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});


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
        ...childSnapshot.val(),
      });
    });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve messages.",
      error: error.message,
    });
  }
});

app.get("/read-all", async (req, res) => {
  try {
    const senderRef = ref(db, 'sender');
    const snapshot = await get(senderRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const formattedData = Object.entries(data).map(([key, value]) => ({
        id: key,
        ...value
      }));
      res.json(formattedData);
    } else {
      res.status(204).json([]); // No Content, but with an empty array
    }
  } catch (error) {
    console.error("Error reading data:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

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
      res.status(204).json([]); // No Content, but with an empty array
    }
  } catch (error) {
    console.error("Error reading data:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

app.post("/receiver-message", async (req, res) => {
  try {
    const { message,status, file } = req.body;
    const formData = {
      message,
      status,
      file,
      timestamp: serverTimestamp(),
    };
    const newEmployeeRef = push(ref(db, "receiver"));
    await set(newEmployeeRef, formData);
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

app.get("/read-receiver", async (req, res) => {
  try {
    const senderRef = ref(db, 'receiver');
    const snapshot = await get(senderRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const formattedData = Object.entries(data).map(([key, value]) => ({
        id: key,
        ...value
      }));
      res.json(formattedData);
    } else {
      res.status(204).json([]); // No Content, but with an empty array
    }
  } catch (error) {
    console.error("Error reading data:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
