# AURA — Real-Time Messaging Platform

AURA is a full-stack real-time messaging platform built with the MERN stack and Socket.IO. It provides a modern chat experience with real-time communication, presence, message status, attachments, notifications, message search, and secure authentication.

## ✨ Features

### Authentication & Account Security

* User registration and login
* JWT-based authentication
* Protected routes and API authorization
* Email verification
* OTP-based password reset
* Google OAuth authentication
* Password hashing with bcrypt
* Rate limiting and request validation

### 💬 Real-Time Messaging

* One-to-one conversations
* Real-time messaging with Socket.IO
* Sent, delivered, and read message states
* Typing indicators
* Online/offline presence
* Last-seen information
* Real-time unread message synchronization
* Message pagination and loading of older messages
* Automatic conversation list updates

### 🛠️ Message Management

* Reply to messages
* Edit messages
* Delete messages
* Pin and unpin messages
* Emoji reactions
* Message search
* Message previews
* Soft deletion handling

### 📎 Attachments

* File and image attachments
* Upload progress handling
* Cloud-based file storage
* Image processing
* Attachment previews
* Attachment-aware message replies

### 🔔 Notifications

* Real-time notifications
* Unread notification state
* Notification bell integration
* Real-time unread conversation counts

### 🎨 User Experience

* Responsive chat interface
* Mobile-friendly conversation navigation
* Dark/light theme
* Connection status indicator
* Loading and error states
* Toast notifications
* Automatic scroll handling
* Search and conversation navigation

The chat interface also maintains message pagination state and loads older messages as the user scrolls upward.

---

## 🧱 Tech Stack

### Frontend

* React.js
* React Router
* Tailwind CSS
* Axios
* Socket.IO Client
* Lucide React
* React Toastify
* Vite

### Backend

* Node.js
* Express.js
* Socket.IO
* MongoDB
* Mongoose
* JWT
* bcrypt
* REST APIs

### Storage & Media

* Cloudinary
* Multer
* Sharp

### Authentication

* JWT
* HTTP-only cookies
* Google OAuth
* Email verification
* OTP password reset

---

## 🏗️ Architecture

AURA follows a separated client/server architecture:

```text
AURA
│
├── client/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   ├── api/
│   ├── utils/
│   └── ...
│
└── server/
    ├── controllers/
    ├── models/
    ├── routes/
    ├── middleware/
    ├── services/
    ├── utils/
    └── ...
```

The frontend communicates with the backend through REST APIs for persistent operations while Socket.IO handles real-time events such as messaging, typing, presence, reactions, and unread-state synchronization.

---

## 🔄 Real-Time Communication

Socket.IO is used for real-time application events.

Examples include:

```text
Client
  │
  ├── Send message
  ├── Typing event
  ├── Reaction event
  └── Read/delivery event
        │
        ▼
   Socket.IO Server
        │
        ├── Conversation room
        ├── Other participant
        └── Real-time event
              │
              ▼
            Client
```

The client listens for events such as typing updates and unread-count synchronization and updates the relevant conversation without unnecessarily reloading the entire conversation list.

---

## 🔐 Security

Security was considered throughout the application:

* JWT authentication
* HTTP-only authentication cookies
* Password hashing
* Protected API routes
* Authorization checks for conversations/messages
* Input validation
* Rate limiting
* OAuth authentication
* Environment-based secrets
* Secure access to conversation resources

---

## 📱 Responsive Design

AURA is designed to work across desktop and mobile layouts.

On smaller screens, the conversation list and active conversation use separate navigation states, while desktop layouts can display the conversation sidebar alongside the active chat.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/alwahab20089-crypto/Chat-app.git

cd Chat-app
```

### 2. Install dependencies

Install the frontend and backend dependencies separately:

```bash
cd server
npm install
```

Then:

```bash
cd ../client
npm install
```

### 3. Configure environment variables

Create the required `.env` files for the server and client.

> Never commit `.env` files or production credentials to GitHub.

Typical server configuration includes values for:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=your_frontend_url
```

Additional authentication, email, OAuth, and cloud-storage credentials are required depending on the enabled features.

The frontend uses:

```env
VITE_SERVER_URL=your_backend_url
```

Use the exact variable names from the project's existing `.env.example` / configuration files when setting up your local environment.

### 4. Start the backend

```bash
cd server
node src/server.js
```

### 5. Start the frontend

In another terminal:

```bash
cd client
npm run dev
```

The application can then be accessed through the Vite development server.

---

## 🐳 Docker

AURA is also prepared for containerized deployment.

The Docker setup can be used to package the application environment consistently and is intended to support production-oriented deployment workflows.

Example workflow:

```bash
docker build -t aura-backend ./server
docker build -t aura-client ./client
```

For production deployment, configure the required environment variables through the hosting platform rather than committing secrets to the repository.

---

## 🧪 Testing

The application has been manually tested across its major user flows, including authentication, conversations, messaging, message actions, attachments, notifications, and real-time behavior.

Automated end-to-end testing with Cypress is planned as part of future projects and improvements.

---

## 📈 Performance & Data Handling

AURA uses paginated message retrieval rather than loading an entire conversation history at once.

When the user reaches the top of the message list, older messages are requested and prepended while preserving the user's scroll position.

Real-time unread updates are merged into the existing conversation state instead of unnecessarily reloading the complete conversation list.

---

## 🎯 What I Learned Building AURA

This project helped me work with:

* Full-stack MERN architecture
* REST API design
* Authentication and authorization
* JWT and HTTP-only cookies
* OAuth
* MongoDB data modeling
* Socket.IO real-time communication
* WebSocket event handling
* Presence systems
* Message delivery/read states
* File uploads
* Cloud storage
* Image processing
* Pagination
* React state management
* Responsive UI development
* Production-oriented security
* Docker and deployment workflows

---

## 🔮 Future Improvements

Potential future improvements include:

* Automated Cypress end-to-end test coverage
* Group conversations
* Voice/video calling
* Message forwarding
* Advanced notification preferences
* More extensive monitoring and observability
* Additional production deployment automation

---

## 👨‍💻 Author

**Abdul Wahab**

Junior Full Stack MERN Developer | DevOps Engineer

* GitHub: [alwahab20089-crypto](https://github.com/alwahab20089-crypto)
* LinkedIn: [Abdul Wahab](https://www.linkedin.com/in/abdul-wahab-13103b371/)

---

## 📌 Project Status

**AURA is a completed portfolio project currently being prepared for production deployment.**

The project demonstrates full-stack development together with real-time application architecture, authentication, file handling, and production-oriented engineering practices.
