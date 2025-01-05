import React, { useEffect, useState } from "react";
import "./chatBox.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";

const ChatApp = () => {
  const [inputValue, setInputValue] = useState('');
  const [receiverValue, setReceiverValue] = useState('');
  const [fileBase, setFileBase] = useState(null);

  const navigate = useNavigate();

  const handleBackToLogin = () => {
    navigate("/login");
  };

  useEffect(() => {
    fetchEmployeeData();
  }, []); 

  const handleSenderChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleReceiverChange = (e) => {
    setReceiverValue(e.target.value);
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
  
  const handleSend = async (isSender) => {
    const message = isSender ? inputValue : receiverValue;
    let fileBases = null;
    if(message == '' && fileBase == null){
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
    status: 'receiver',
    file: (fileBase && fileBase.type && fileBase.name && fileBases) ? {
        type: fileBase.type,
        name: fileBase.name,
        data: fileBases,
    } : null, 
};
    try {
      await axios.post('http://localhost:3001/receiver-message', formData, {
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
  // Fetch chat data from the server
  async function fetchEmployeeData() {
    try {
      const response = await axios.get("http://localhost:3001/read-receiver");
      if (response && typeof response === 'object') {
        const chatBodySender = document.querySelector('.chat-body-sender');
        if (chatBodySender) chatBodySender.innerHTML = ''; 
        rowMap.clear();
        Object.entries(response.data).forEach(([key, sender]) => {
          showData({ ...sender, id: key });
          console.log({ ...sender, id: key });
        });
      }
    } catch (error) {
      console.error("Fetch error:", error.message);
    }
  }

 // Display chat messages
 let rowMap = new Map();

 function showData(sender) {
  console.log(sender);
  let messageElement;
  if (rowMap.has(sender.id)) {
    messageElement = rowMap.get(sender.id);
    messageElement.innerHTML = '';
  } else {
    messageElement = document.createElement('div');
    messageElement.className = 'chat-message-box';
    messageElement.setAttribute('id', sender.id);
    rowMap.set(sender.id, messageElement);
  }

  // Format the timestamp
  const timestamp = new Date(sender.timestamp).toLocaleString();

  // Create a container for the message content
  const messageContainer = document.createElement('div');
  messageContainer.className = 'message-container';

  if (sender.file) {
    const { data: fileData, type: fileType, name: fileName } = sender.file;
    if (fileType.startsWith('image/')) {
      const imageElement = document.createElement('img');
      imageElement.src = fileData;
      imageElement.alt = fileName;
      imageElement.style.maxWidth = '200px';
      imageElement.style.maxHeight = '200px';
      messageContainer.appendChild(imageElement);
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
      accept="image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      style={{ display: "none" }}
      onChange={handleImageUpload}
    />

      <div className="chat-section sender">
      <div className="chat-header">
      <button id = "btn-back" onClick={handleBackToLogin} className="button" >Back</button>
        Receiver Chat
      </div>
        <div className="main-chat-footer">
        <div className="chat-footer">
          <button className="add-button-sender" onClick={triggerFileInput}>+</button>
          <input
            className="input-bar "
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
