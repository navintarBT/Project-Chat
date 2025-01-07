import React, { useEffect, useState } from "react";
import "./chatBox.css";
import axios from "axios";
import { useLocation } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";
const serverUrl = import.meta.env.VITE_SERVER_URL;

const ChatApp = () => {
  const location = useLocation();
  const { loggedInUser, allUsers, userId, userName } = location.state || {};
  let senderId = loggedInUser.id;
  let receiverId = userId;
  const [inputValue, setInputValue] = useState('');
  const [receiverValue, setReceiverValue] = useState('');
  const [fileBase, setFileBase] = useState(null);
  const [senderData, setSenderData] = useState(null);
  const [receiverData, setReceiverData] = useState(null);
  const [combinedData, setCombinedData] = useState([]);
  const [editAction, setEditAction] = useState(false);
  const [deleteAction, setDeleteAction] = useState(false);
  const [ws, setWs] = useState(null);

  const handleSenderChange = (e) => {
    setInputValue(e.target.value);
  };

  const triggerFileInput = () => {
    const imageInput = document.getElementById("imageInput");
    if (imageInput) {
      imageInput.click();
    } else {
      console.error("File input element not found!");
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      const existingChatImageBox = document.querySelector('.chat-image-box');
      if (existingChatImageBox) {
        existingChatImageBox.remove();
      }
      reader.onload = (e) => {
        setFileBase(file)
        const chatImageBox = document.createElement('div');
        chatImageBox.className = 'chat-image-box';
        const deleteIcon = document.createElement('span');
        deleteIcon.innerHTML = '&#10060;';
        deleteIcon.style.position = 'absolute';
        deleteIcon.style.top = '5px';
        deleteIcon.style.right = '5px';
        deleteIcon.style.cursor = 'pointer';
        deleteIcon.style.color = '#ff0000';
        deleteIcon.style.fontSize = '20px';
        deleteIcon.addEventListener('click', () => {
          chatImageBox.remove();
          setFileBase(null)
        });
        chatImageBox.appendChild(deleteIcon);
        const imageElement = document.createElement('img');
        imageElement.src = e.target.result;
        imageElement.alt = file.name || 'Uploaded image';
        imageElement.style.maxWidth = '200px';
        imageElement.style.maxHeight = '200px';
        chatImageBox.appendChild(imageElement);
        const chatFooter = document.querySelector('.chat-footer');
        const parentElement = chatFooter.parentNode;
        parentElement.insertBefore(chatImageBox, chatFooter);
      };
      reader.onerror = (error) => console.error("Error reading file:", error);
      reader.readAsDataURL(file);
    }
  };

  // function post data of sender to  data base
  const handleSend = async (isSender) => {
    const message = isSender ? inputValue : receiverValue;
    let fileBases = null;
    if (message === '' && fileBase == null) {
      return
    }
    if (fileBase) {
      fileBases = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(fileBase);
      });
    }
    const existingChatImageBox = document.querySelector('.chat-image-box');
    if (existingChatImageBox) {
      existingChatImageBox.remove();
    }
    const inputElement = document.querySelector('#sender');
    if (inputElement) {
      inputElement.value = '';
    }
    const formData = {
      message,
      senderId,
      receiverId,
      file: (fileBase && fileBase.type && fileBase.name && fileBases) ? {
        type: fileBase.type,
        name: fileBase.name,
        data: fileBases,
      } : null,
    };
    try {
      await axios.post(`${serverUrl}/send-message`, formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      fetchEmployeeData();
      setFileBase(null)
      setReceiverValue('')
      setInputValue('')
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  // Fetch chat data from sender

  let rowMap = new Map();
  // Fetch data from sender
  async function fetchEmployeeData() {
    try {
      const response = await axios.get(`${serverUrl}/get-messages`, {
        params: { senderId, receiverId },
      });
      const chatBodySender = document.querySelector(".chat-body-sender");
      if (chatBodySender) {
        chatBodySender.innerHTML = "";
      }
      rowMap.clear();
      setSenderData(response.data.data);
    } catch (error) {
      console.error("Fetch error:", error.message);
    }
  }

  // WebSocket to fetch receiver data
  useEffect(() => {
    const connectWebSocket = () => {
      const newWs = new WebSocket(`ws://localhost:3001`);
      newWs.onopen = () => {
        newWs.send(JSON.stringify({
          senderId,
          receiverId,
        }));
      };
      newWs.onmessage = (event) => {
        const chatBodySender = document.querySelector(".chat-body-sender");
        if (chatBodySender) {
          chatBodySender.innerHTML = "";
        }
        rowMap.clear();
        const data = JSON.parse(event.data);
        if (data.action === 'delete') {
          setReceiverData((prevMessages) => prevMessages.filter((msg) => msg.id !== data.messageId));
          setSenderData((prevMessages) => prevMessages.filter((msg) => msg.id !== data.messageId));
        } else if (data.action === 'update') {
          setReceiverData((prevMessages) => prevMessages.map((msg) => msg.id === data.messageId ? { ...msg, message: data.newMessage } : msg));
          setSenderData((prevMessages) => prevMessages.map((msg) => msg.id === data.messageId ? { ...msg, message: data.newMessage } : msg));
        } else {
          setReceiverData(data.data);
        }
      };
      newWs.onclose = () => {
        console.log("Disconnected from WebSocket server");
      };
      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
        newWs.close();
      };
      setWs(newWs);
    };

    fetchEmployeeData();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [location, senderId, receiverId, userName, deleteAction, editAction]);

  useEffect(() => {
    if (!(senderData && receiverData)) {
      return;
    }
    const uniqueChats = [];
    const combined = [...senderData, ...receiverData];

    combined.forEach((message) => {
      if (!rowMap.has(message.id)) {
        rowMap.set(message.id, true);
        uniqueChats.push(message);
      }
    });

    uniqueChats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    setCombinedData(uniqueChats);
  }, [senderData, receiverData]);

  useEffect(() => {
    if (combinedData.length === 0) {
      return;
    }
    showData(combinedData);
  }, [combinedData]);

  function showData(chatData) {
    chatData.forEach((message) => {
      if (message.senderId === loggedInUser.id) {
        dataDisplay(message, "chat-message-box");
      } else {
        dataDisplay(message, "chat-message-box-receiver");
      }
    });
  }

  function dataDisplay(sender, cls) {
    let messageElement;
    if (rowMap.has(sender.id)) {
      console.log(rowMap);
      messageElement = rowMap.get(sender.id);
      messageElement.innerHTML = '';
    } else {
      messageElement = document.createElement('div');
      messageElement.className = `${cls}`;
      if (cls === 'chat-message-box') {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.innerHTML = `
          <button class="edit-button">Edit</button>
          <button class="delete-button">Delete</button>
        `;
        let deleteButton = popup.querySelector('.delete-button');
        deleteButton.addEventListener('click', async () => {
          const messageId = messageElement.getAttribute('id');
          try {
            await axios.delete(`${serverUrl}/delete-message`, {
              data: { messageId, senderId, receiverId },
            });

            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  action: 'delete',
                  messageId,
                  senderId,
                  receiverId,
                })
              );
              console.log('Delete action sent to WebSocket');
            }

            messageElement.remove();
            setDeleteAction((prev) => !prev);
          } catch (error) {
            console.error('Error deleting message:', error);
          }

        });

        // Edit message
        let editButton = popup.querySelector('.edit-button');
        editButton.addEventListener('click', () => {
          const currentMessage = messageElement.querySelector('p').textContent;
          const editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.value = currentMessage;
          editInput.className = 'edit-input';

          const saveButton = document.createElement('button');
          saveButton.textContent = 'Save';
          saveButton.className = 'save-button';

          saveButton.addEventListener('click', async () => {
            const newMessage = editInput.value;
            const messageId = messageElement.getAttribute('id');
            try {
              await axios.put(`${serverUrl}/update-message`, {
                messageId,
                senderId,
                receiverId,
                newMessage,
              });

              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    action: 'update',
                    messageId,
                    senderId,
                    receiverId,
                    newMessage,
                  })
                );
                console.log('Delete action sent to WebSocket');
              }
              messageElement.querySelector('.message-text').textContent = newMessage;
              messageElement.removeChild(editInput);
              messageElement.removeChild(saveButton);
              setEditAction((prev) => !prev);
            } catch (error) {
              console.error('Error updating message:', error);
            }
          });

          messageElement.appendChild(editInput);
          messageElement.appendChild(saveButton);
        });
        messageElement.appendChild(popup);
      }
      messageElement.setAttribute('id', sender.id);
      rowMap.set(sender.id, messageElement);
    }
    const timestamp = new Date(sender.timestamp).toLocaleString();
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';

    if (sender.file) {
      const { data: fileData, type: fileType, name: fileName } = sender.file;
      if (fileType.startsWith('image/')) {
        if (sender.senderId !== loggedInUser.id) {
          const imageElement = document.createElement('img');
          imageElement.src = fileData;
          imageElement.alt = fileName;
          imageElement.style.maxWidth = '200px';
          imageElement.style.maxHeight = '200px';
          imageElement.style.filter = 'blur(10px)';
          imageElement.style.cursor = 'pointer';

          const openIcon = document.createElement('i');
          openIcon.className = 'fas fa-eye';
          openIcon.style.position = 'absolute';
          openIcon.style.top = '50%';
          openIcon.style.left = '50%';
          openIcon.style.transform = 'translate(-50%, -50%)';
          openIcon.style.fontSize = '24px';
          openIcon.style.color = '#fff';
          openIcon.style.cursor = 'pointer';

          const imageContainer = document.createElement('div');
          imageContainer.style.position = 'relative';
          imageContainer.style.display = 'inline-block';

          imageContainer.appendChild(imageElement);
          imageContainer.appendChild(openIcon);
          messageContainer.appendChild(imageContainer);

          openIcon.addEventListener('click', () => {
            imageElement.style.filter = 'none';
            openIcon.style.display = 'none';
          });

        } else {
          const imageElement = document.createElement('img');
          imageElement.src = fileData;
          imageElement.alt = fileName;
          imageElement.style.maxWidth = '200px';
          imageElement.style.maxHeight = '200px';
          messageContainer.appendChild(imageElement);

        }

      } else {
        const blob = new Blob([fileData], { type: fileType });
        const blobUrl = URL.createObjectURL(blob);
        const fileLink = document.createElement('a');
        fileLink.href = blobUrl;
        fileLink.download = fileName;
        fileLink.textContent = fileName;
        fileLink.style.textDecoration = 'underline';
        fileLink.target = '_blank';
        messageContainer.appendChild(fileLink);
        fileLink.addEventListener('click', () => {
          URL.revokeObjectURL(blobUrl);
        });
      }
      const messageText = document.createElement('p');
      messageText.textContent = sender.message || '';
      messageContainer.appendChild(messageText);
    } else {
      const messageText = document.createElement('p');
      messageText.textContent = sender.message || '';
      messageContainer.appendChild(messageText);
    }

    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';

    const timestampElement = document.createElement('span');
    timestampElement.className = 'timestamp';
    timestampElement.textContent = timestamp;
    messageInfo.appendChild(timestampElement);

    const readStatusIcon = document.createElement('i');
    readStatusIcon.className = sender.read ? 'fas fa-check-double read' : 'fas fa-check unread';
    messageInfo.appendChild(readStatusIcon);

    messageContainer.appendChild(messageInfo);
    messageElement.appendChild(messageContainer);

    const senderChatSection = document.querySelector('.chat-section.sender');
    if (senderChatSection) {
      let chatBody = senderChatSection.querySelector('.chat-body-sender');
      if (!chatBody) {
        chatBody = document.createElement('div');
        chatBody.className = 'chat-body-sender';
        senderChatSection.insertBefore(chatBody, senderChatSection.querySelector('.main-chat-footer'));
      }
      if (!chatBody.contains(messageElement)) {
        chatBody.appendChild(messageElement);
      }
      chatBody.scrollTop = chatBody.scrollHeight;
    } else {
      console.error('Sender chat section not found');
    }
  }


  return (
    <div className="chat-container">
      <input
        id="imageInput"
        type="file"
        accept="image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,
      application/pdf,application/vnd.ms-excel,
      application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />

      <div className="chat-section sender">
        <div className="chat-header">
          <div className="profile-icon">
            <i className="fas fa-user-circle"></i>
            <label >{userName}</label>
          </div>
        </div>
        <div className="main-chat-footer">
          <div className="chat-footer">
            <button className="add-button-sender" onClick={triggerFileInput}>+</button>
            <input
              className="input-bar"
              id="sender"
              type="text"
              value={inputValue}
              onChange={handleSenderChange}
              placeholder="Type here..."
            />
            <button className="sender-button" onClick={() => handleSend(true)}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
