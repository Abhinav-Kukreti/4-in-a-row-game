# 🎮 4 in a Row - Multiplayer Game

> Real-time multiplayer Connect Four game with competitive AI bot, 30-second reconnection, and live leaderboard.

**🎮 [Play Live Game](https://four-in-a-row-game.netlify.app)**

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Live Deployment](#live-deployment)
- [How to Play](#how-to-play)
- [Project Structure](#project-structure)

---

## ✨ Features

### Core Features
- ✅ Real-time 1v1 multiplayer gameplay using WebSocket
- ✅ Competitive AI bot with strategic decision-making
- ✅ 10-second automatic bot fallback if no opponent joins
- ✅ 30-second reconnection window for disconnected players
- ✅ Win detection (horizontal, vertical, diagonal)
- ✅ PostgreSQL database for persistent storage
- ✅ Live leaderboard with player statistics

### Bonus Features
- 🎨 5 beautiful themes (Classic, Dark, Ocean, Sunset, Neon)
- 🔊 Sound effects using Web Audio API
- ✨ Smooth CSS animations
- 🎉 Victory confetti celebration
- 📱 Fully responsive design

---

## 🛠 Tech Stack

**Frontend:** React.js, Socket.IO Client, CSS3, Web Audio API  
**Backend:** Node.js, Express.js, Socket.IO  
**Database:** PostgreSQL (Neon)  
**Deployment:** Netlify (Frontend), Render (Backend)

---

## 📦 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL database** (we use Neon - free tier available at [neon.tech](https://neon.tech/))

---

## 🚀 Installation & Setup

### 1. Clone the Repository

git clone https://github.com/Abhinav-Kukreti/4-in-a-row-game.git
cd 4-in-a-row-game

text

### 2. Backend Setup

Navigate to backend directory
cd backend

Install dependencies
npm install

Create .env file
touch .env

text

**Add this to `backend/.env`:**
DATABASE_URL=your_postgresql_connection_string
PORT=3000
NODE_ENV=development

text

**To get DATABASE_URL:**
1. Sign up at [neon.tech](https://neon.tech/)
2. Create a new project
3. Copy the connection string
4. Paste it in `.env`

### 3. Frontend Setup

Navigate to frontend directory (from project root)
cd frontend

Install dependencies
npm install

Create .env file
touch .env

text

**Add this to `frontend/.env`:**
REACT_APP_SOCKET_URL=http://localhost:3000

text

---

## ▶️ Running the Application

### Start Backend Server

From backend directory
cd backend
node server.js

text

**Expected Output:**
✅ Server running on port 3000
✅ Database connected successfully
✅ Database tables initialized
🎮 Waiting for players...

text

### Start Frontend Application

**Open a new terminal:**

From frontend directory
cd frontend
npm start

text

**Expected Output:**
Compiled successfully!
Local: http://localhost:3001

text

### Access the Game

Open your browser and go to: [**http://localhost:3001**](http://localhost:3001)

---

## 🔐 Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `PORT` | Server port number | `3000` |
| `NODE_ENV` | Environment mode | `development` or `production` |

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_SOCKET_URL` | Backend server URL | `http://localhost:3000` |

---

## 🌐 Live Deployment

The application is deployed and accessible at:

**Live Game:** https://four-in-a-row-game.netlify.app  
**Backend API:** https://four-in-a-row-game-7cw5.onrender.com  
**GitHub Repository:** https://github.com/Abhinav-Kukreti/4-in-a-row-game

---

## 🎮 How to Play

1. **Enter Username** - Type your name in the input field
2. **Click "Join Game"** - You'll be matched with another player
3. **Wait for Opponent** - If no player joins within 10 seconds, bot will start automatically
4. **Make Moves** - Click any column to drop your disc
5. **Win the Game** - Connect 4 discs horizontally, vertically, or diagonally
6. **Check Leaderboard** - View your rank and statistics

### Game Rules

- **Board:** 7 columns × 6 rows
- **Objective:** Connect 4 discs in a row
- **Turns:** Players alternate dropping discs
- **Win:** First to connect 4 wins
- **Draw:** Board fills with no winner

---

## 📁 Project Structure

4-in-a-row-game/
├── backend/
│ ├── server.js # Express + Socket.IO server
│ ├── database.js # PostgreSQL connection & queries
│ ├── gameLogic.js # Game rules and bot AI
│ ├── kafkaProducer.js # Analytics (optional)
│ ├── package.json # Backend dependencies
│ └── .env # Environment variables
│
├── frontend/
│ ├── src/
│ │ ├── App.js # Main React component
│ │ ├── App.css # Styling and animations
│ │ ├── sounds.js # Web Audio API sound effects
│ │ ├── themes.js # Theme configurations
│ │ └── index.js # React entry point
│ ├── public/
│ ├── package.json # Frontend dependencies
│ └── .env # Environment variables
│
├── .gitignore
└── README.md # This file

text

---

## 🧪 Testing the Application

### Test Scenario 1: Play Against Bot
Open http://localhost:3001

Enter username: "Player1"

Click "Join Game"

Wait 10 seconds

Bot will join automatically

Play a complete game

text

### Test Scenario 2: Multiplayer (Two Players)
Tab 1: Enter "Player1" → Join Game
Tab 2: Enter "Player2" → Join Game
→ Players are matched instantly
→ Play together in real-time

text

### Test Scenario 3: Reconnection Feature
Start a game with two players

Close one player's browser tab

Reopen within 30 seconds

Join with same username

Game resumes from current state

text

---

## 🤖 Bot AI Strategy

The bot uses strategic decision-making:
1. **Winning Move** - Takes winning move if available
2. **Block Opponent** - Blocks opponent's winning move
3. **Strategic Position** - Prefers center columns
4. **Valid Move** - Makes random valid move if no strategy applies

---

## 📊 Database Schema

### Players Table
CREATE TABLE players (
username VARCHAR(50) PRIMARY KEY,
games_played INTEGER DEFAULT 0,
games_won INTEGER DEFAULT 0,
created_at TIMESTAMP DEFAULT NOW()
);

text

### Games Table
CREATE TABLE games (
game_id VARCHAR(50) PRIMARY KEY,
player1_username VARCHAR(50),
player2_username VARCHAR(50),
winner VARCHAR(50),
game_duration INTEGER,
moves_count INTEGER,
board_state JSONB,
completed_at TIMESTAMP DEFAULT NOW()
);

text

---

## 🐛 Troubleshooting

### Backend won't start
- Check if PostgreSQL database is accessible
- Verify `DATABASE_URL` in `.env` is correct
- Ensure port 3000 is not already in use

### Frontend can't connect to backend
- Verify backend is running on port 3000
- Check `REACT_APP_SOCKET_URL` in frontend `.env`
- Open browser console for error messages

### Database connection errors
- Confirm PostgreSQL credentials are correct
- Check if database exists and is accessible
- Verify firewall allows database connections

---

## 📝 Assignment Completion

| Requirement | Status |
|------------|--------|
| Real-time multiplayer server | ✅ Complete |
| Player matchmaking | ✅ Complete |
| Competitive bot AI | ✅ Complete |
| 10-second bot fallback | ✅ Complete |
| WebSocket real-time gameplay | ✅ Complete |
| 30-second reconnection | ✅ Complete |
| Game state management | ✅ Complete |
| Database persistence | ✅ Complete |
| Leaderboard | ✅ Complete |
| Frontend UI | ✅ Complete |
| GitHub repository | ✅ Complete |
| Live deployment | ✅ Complete |

**Bonus Features:** Themes, sounds, animations, professional UI/UX

---

## 👨‍💻 Author

**Abhinav Kukreti**  
Backend Engineering Intern Assignment  
GitHub: [@Abhinav-Kukreti](https://github.com/Abhinav-Kukreti)

---

## 📄 License

This project is created for educational purposes as part of a Backend Engineering Intern assignment.

---

**For any questions or issues, please contact the repository owner.**