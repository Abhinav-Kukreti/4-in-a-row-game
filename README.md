# 🎮 4 in a Row - Multiplayer Game

Real-time multiplayer Connect Four game with competitive AI bot, beautiful themes, sound effects, and 30-second reconnection feature.

## 🌟 Features

### Core Features
- ✅ Real-time 1v1 multiplayer using WebSocket
- ✅ Competitive AI bot with strategic moves
- ✅ 10-second automatic bot fallback
- ✅ Win detection (horizontal, vertical, diagonal)
- ✅ PostgreSQL database persistence
- ✅ Live leaderboard with player statistics
- ✅ 30-second reconnection window

### Enhanced Features
- 🎨 5 Beautiful themes (Classic, Dark, Ocean, Sunset, Neon)
- 🔊 Sound effects (Web Audio API - no files needed)
- ✨ Smooth animations and victory confetti
- 🎭 Theme switcher and sound toggle
- 📱 Fully responsive design

## 🛠 Tech Stack

**Backend:**
- Node.js + Express
- Socket.IO for real-time communication
- PostgreSQL (Neon) for data persistence
- Strategic Bot AI with blocking and winning logic

**Frontend:**
- React.js
- Socket.IO Client
- CSS3 Animations
- Web Audio API for sound effects

## 📦 Project Structure

4-in-a-row/
├── backend/
│ ├── server.js # Main server with Socket.IO
│ ├── database.js # PostgreSQL connection
│ ├── gameLogic.js # Game rules and bot AI
│ └── package.json
├── frontend/
│ ├── src/
│ │ ├── App.js # Main React component
│ │ ├── App.css # Styling and animations
│ │ ├── sounds.js # Web Audio API sounds
│ │ └── themes.js # Theme configurations
│ └── package.json
└── README.md


## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database (recommend Neon.tech free tier)

### Backend Setup
cd backend
npm install

Create .env file with DATABASE_URL
node server.js

### Frontend Setup
cd frontend
npm install

Create .env with REACT_APP_SOCKET_URL
npm start

text

## 🎯 Game Rules
- 7×6 grid board
- Players alternate dropping colored discs
- Disc falls to lowest available position
- First to connect 4 discs (horizontal, vertical, or diagonal) wins
- Full board with no winner = draw

## 🎮 How to Play
1. Enter your username
2. Wait for opponent or play against bot (auto-starts after 10 seconds)
3. Click any column to drop your disc
4. First to connect 4 wins!

## 🔧 Environment Variables

**Backend (.env):**
DATABASE_URL=your_postgresql_connection_string
PORT=3000

text

**Frontend (.env):**
REACT_APP_SOCKET_URL=http://localhost:3000

text

## 📊 Database Schema

**Players Table:**
- username (PRIMARY KEY)
- games_played
- games_won
- created_at

**Games Table:**
- game_id (PRIMARY KEY)
- player1_username
- player2_username
- winner
- game_duration
- moves_count
- board_state (JSONB)
- completed_at

## 🎨 Themes
- Classic (Purple gradient)
- Dark Mode (Deep blue/black)
- Ocean (Blue/cyan)
- Sunset (Orange/yellow)
- Neon (Purple/pink)

## 🏆 Features Showcase

### Bot AI Logic
- Prioritizes winning moves
- Blocks opponent's winning moves
- Strategic column selection
- Center column preference

### Reconnection System
- 30-second grace period for disconnected players
- Automatic game state restoration
- Opponent notification on disconnect/reconnect
- Forfeit after timeout

## 👨‍💻 Author
Abhinav - Backend Engineering Intern Assignment

## 📄 License
MIT License
