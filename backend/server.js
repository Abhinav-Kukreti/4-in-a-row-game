import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import pool from './database.js';
import { GameLogic } from './gameLogic.js';
import { sendGameEvent } from './kafkaProducer.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const gameLogic = new GameLogic();

// In-memory game state
const games = new Map();
const waitingPlayers = [];
const playerSockets = new Map();

// ✅ NEW: Track disconnected players for reconnection
const disconnectedPlayers = new Map(); // username -> {gameId, disconnectTime, timeoutId}

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server running', 
    games: games.size,
    disconnectedPlayers: disconnectedPlayers.size 
  });
});

// Get leaderboard with error handling
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT username, games_played, games_won FROM players ORDER BY games_won DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Leaderboard error:', error.message);
    res.json([]);
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('✅ Player connected:', socket.id);

  socket.on('joinGame', async ({ username }) => {
    console.log('📥 joinGame event received for:', username);
    
    try {
      // Create or update player in database (non-blocking)
      try {
        await pool.query(
          'INSERT INTO players (username, games_played) VALUES ($1, 0) ON CONFLICT (username) DO NOTHING',
          [username]
        );
      } catch (dbError) {
        console.error('Database insert error:', dbError.message);
      }

      playerSockets.set(username, socket.id);
      socket.username = username;

      // Check for waiting player
      const waitingPlayer = waitingPlayers.shift();

      if (waitingPlayer && waitingPlayer !== username) {
        // Match found - start game
        console.log('🎮 Matching players:', waitingPlayer, 'vs', username);
        const gameId = uuidv4();
        const game = {
          gameId,
          players: [
            { username: waitingPlayer, color: 'red', socketId: playerSockets.get(waitingPlayer) },
            { username, color: 'yellow', socketId: socket.id }
          ],
          board: gameLogic.createEmptyBoard(),
          currentTurn: waitingPlayer,
          winner: null,
          startTime: Date.now(),
          moves: 0,
          isBot: false
        };

        games.set(gameId, game);

        // Store gameId in socket for reconnection
        socket.gameId = gameId;
        const waitingSocket = io.sockets.sockets.get(playerSockets.get(waitingPlayer));
        if (waitingSocket) waitingSocket.gameId = gameId;

        // Notify both players
        io.to(playerSockets.get(waitingPlayer)).emit('gameStart', {
          gameId,
          opponent: username,
          yourColor: 'red',
          currentTurn: waitingPlayer
        });

        socket.emit('gameStart', {
          gameId,
          opponent: waitingPlayer,
          yourColor: 'yellow',
          currentTurn: waitingPlayer
        });

        console.log('📤 Game started notifications sent to both players');

        await sendGameEvent('game.started', { gameId, players: [waitingPlayer, username] });

      } else {
        // No match - add to waiting queue
        console.log('⏳ Adding to waiting queue:', username);
        waitingPlayers.push(username);
        socket.emit('waiting', { message: 'Waiting for opponent...' });

        // Start bot after 10 seconds
        const timeoutId = setTimeout(() => {
          const index = waitingPlayers.indexOf(username);
          if (index > -1) {
            console.log('🤖 Starting bot game for:', username);
            waitingPlayers.splice(index, 1);
            startBotGame(socket, username);
          }
        }, 10000);

        socket.matchTimeout = timeoutId;
      }
    } catch (error) {
      console.error('Join game error:', error.message);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  // ✅ NEW: Reconnection handler
  socket.on('reconnectGame', async ({ username, gameId }) => {
    console.log('🔄 ========== RECONNECTION ATTEMPT ==========');
    console.log('   Username:', username);
    console.log('   Game ID:', gameId);
    
    try {
      const game = games.get(gameId);
      
      if (!game) {
        console.log('❌ Game not found for reconnection');
        socket.emit('error', { message: 'Game no longer exists' });
        return;
      }
      
      // Check if user is part of this game
      const playerIndex = game.players.findIndex(p => p.username === username);
      if (playerIndex === -1) {
        console.log('❌ User not part of this game');
        socket.emit('error', { message: 'You are not part of this game' });
        return;
      }
      
      // Clear the forfeit timeout if exists
      if (disconnectedPlayers.has(username)) {
        const disconnectInfo = disconnectedPlayers.get(username);
        clearTimeout(disconnectInfo.timeoutId);
        disconnectedPlayers.delete(username);
        console.log('✅ Forfeit timeout cleared for:', username);
      }
      
      // Update player's socket ID
      game.players[playerIndex].socketId = socket.id;
      playerSockets.set(username, socket.id);
      socket.username = username;
      socket.gameId = gameId;
      
      console.log('✅ Socket updated for reconnected player');
      
      // Send current game state to reconnected player
      socket.emit('gameStart', {
        gameId: game.gameId,
        opponent: game.players.find(p => p.username !== username)?.username,
        yourColor: game.players[playerIndex].color,
        currentTurn: game.currentTurn
      });
      
      socket.emit('gameState', {
        board: game.board,
        currentTurn: game.currentTurn,
        moves: game.moves
      });
      
      console.log('✅ Game state sent to reconnected player');
      
      // Notify opponent
      const opponent = game.players.find(p => p.username !== username);
      if (opponent && opponent.socketId) {
        io.to(opponent.socketId).emit('opponentReconnected', {
          message: `${username} has reconnected!`
        });
        console.log('✅ Opponent notified about reconnection');
      }
      
      console.log('============================================');
      
    } catch (error) {
      console.error('❌ Reconnection error:', error.message);
      socket.emit('error', { message: 'Failed to reconnect' });
    }
  });

  socket.on('makeMove', async ({ gameId, column }) => {
    console.log('🎯 Move received:', { gameId, column, player: socket.username });
    
    try {
      const game = games.get(gameId);
      if (!game) {
        console.log('❌ Game not found:', gameId);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      if (game.currentTurn !== socket.username) {
        console.log('❌ Not player turn. Current:', game.currentTurn, 'Tried:', socket.username);
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      if (!gameLogic.isValidMove(game.board, column)) {
        console.log('❌ Invalid move on column:', column);
        socket.emit('error', { message: 'Invalid move' });
        return;
      }

      // Make move
      const position = gameLogic.makeMove(game.board, column, game.currentTurn);
      game.moves++;

      console.log('✅ Move made:', { 
        player: socket.username, 
        column, 
        row: position.row,
        moveNumber: game.moves 
      });

      await sendGameEvent('game.move', {
        gameId,
        player: socket.username,
        column,
        moveNumber: game.moves
      });

      // Check for winner
      const winner = gameLogic.checkWinner(game.board);
      const isDraw = gameLogic.isBoardFull(game.board);

      if (winner || isDraw) {
        console.log('🏁 Game ending. Winner:', winner || 'Draw');
        await endGame(game, winner);
        return;
      }

      // Switch turn
      const nextPlayer = game.players.find(p => p.username !== game.currentTurn);
      game.currentTurn = nextPlayer.username;

      console.log('🔄 Turn switched to:', game.currentTurn);

      // Broadcast game state
      broadcastGameState(game);

      // Bot's turn
      if (game.isBot && game.currentTurn === 'Bot') {
        console.log('🤖 Bot turn starting...');
        setTimeout(() => makeBotMove(game), 1000);
      }
    } catch (error) {
      console.error('❌ Make move error:', error.message);
      socket.emit('error', { message: 'Move failed' });
    }
  });

  // ✅ UPDATED: Enhanced disconnect handler with 30-second reconnection window
  socket.on('disconnect', () => {
    console.log('🔌 ========== PLAYER DISCONNECTED ==========');
    console.log('   Socket ID:', socket.id);
    console.log('   Username:', socket.username);
    console.log('   Game ID:', socket.gameId);
    
    // Clear any pending matchmaking timeout
    if (socket.matchTimeout) {
      clearTimeout(socket.matchTimeout);
    }
    
    // Remove from waiting queue
    const index = waitingPlayers.indexOf(socket.username);
    if (index > -1) {
      waitingPlayers.splice(index, 1);
      console.log('   Removed from waiting queue');
    }
    
    // Handle in-game disconnection
    if (socket.gameId && socket.username) {
      const game = games.get(socket.gameId);
      
      if (game && game.winner === null) { // Only if game is still active
        console.log('⏰ Starting 30-second reconnection timer');
        
        // Notify opponent about disconnection
        const opponent = game.players.find(p => p.username !== socket.username);
        if (opponent && opponent.socketId) {
          io.to(opponent.socketId).emit('opponentDisconnected', {
            message: `${socket.username} disconnected. Waiting 30 seconds for reconnection...`
          });
          console.log('   Opponent notified about disconnection');
        }
        
        // Set 30-second timeout for forfeit
        const timeoutId = setTimeout(() => {
          console.log('⏱️ ========== 30 SECONDS ELAPSED ==========');
          console.log('   Player did not reconnect:', socket.username);
          console.log('   Forfeiting game...');
          
          const currentGame = games.get(socket.gameId);
          if (currentGame && currentGame.winner === null) {
            const winner = opponent?.username;
            
            console.log('   Winner by forfeit:', winner);
            
            // End game with forfeit reason
            endGame(currentGame, winner, 'forfeit');
            
            // Notify opponent
            if (opponent && opponent.socketId) {
              io.to(opponent.socketId).emit('gameOver', {
                winner: winner,
                board: currentGame.board,
                duration: Math.floor((Date.now() - currentGame.startTime) / 1000),
                moves: currentGame.moves,
                reason: 'forfeit'
              });
              console.log('   Forfeit notification sent to opponent');
            }
          }
          
          disconnectedPlayers.delete(socket.username);
          console.log('==========================================');
        }, 30000); // 30 seconds
        
        // Store disconnection info
        disconnectedPlayers.set(socket.username, {
          gameId: socket.gameId,
          disconnectTime: Date.now(),
          timeoutId: timeoutId
        });
        
        console.log('   Disconnection tracked for reconnection');
      }
    }
    
    console.log('==========================================');
  });
});

// Start game with bot
function startBotGame(socket, username) {
  const gameId = uuidv4();
  const game = {
    gameId,
    players: [
      { username, color: 'red', socketId: socket.id },
      { username: 'Bot', color: 'yellow', socketId: null }
    ],
    board: gameLogic.createEmptyBoard(),
    currentTurn: username,
    winner: null,
    startTime: Date.now(),
    moves: 0,
    isBot: true
  };

  games.set(gameId, game);
  socket.gameId = gameId; // ✅ Store for reconnection

  console.log('🎮 Bot game started for:', username);
  socket.emit('gameStart', {
    gameId,
    opponent: 'Bot',
    yourColor: 'red',
    currentTurn: username
  });

  sendGameEvent('game.started', { gameId, players: [username, 'Bot'], botGame: true });
}

// Bot makes move
function makeBotMove(game) {
  if (!games.has(game.gameId)) {
    console.log('⚠️ Game no longer exists, skipping bot move');
    return;
  }

  const botPlayer = 'Bot';
  const humanPlayer = game.players.find(p => p.username !== 'Bot').username;
  
  const column = gameLogic.getBotMove(game.board, botPlayer, humanPlayer);
  gameLogic.makeMove(game.board, column, botPlayer);
  game.moves++;

  console.log('🤖 Bot moved to column:', column, '| Move #:', game.moves);

  sendGameEvent('game.move', {
    gameId: game.gameId,
    player: 'Bot',
    column,
    moveNumber: game.moves
  });

  const winner = gameLogic.checkWinner(game.board);
  const isDraw = gameLogic.isBoardFull(game.board);

  if (winner || isDraw) {
    console.log('🏁 Bot game ending. Winner:', winner || 'Draw');
    endGame(game, winner);
    return;
  }

  game.currentTurn = humanPlayer;
  
  console.log('🔄 Turn switched back to:', humanPlayer);
  
  broadcastGameState(game);
}

// Broadcast game state to all players
function broadcastGameState(game) {
  console.log('📡 Broadcasting game state to all players');
  console.log('   Current turn:', game.currentTurn);
  console.log('   Move count:', game.moves);
  
  game.players.forEach(player => {
    if (player.socketId) {
      console.log('   → Sending to:', player.username);
      io.to(player.socketId).emit('gameState', {
        board: game.board,
        currentTurn: game.currentTurn,
        moves: game.moves
      });
    } else {
      console.log('   ⚠️ No socket for:', player.username);
    }
  });
  
  console.log('📡 Broadcast complete');
}

// ✅ UPDATED: End game with optional reason parameter
async function endGame(game, winner, reason = null) {
  const duration = Math.floor((Date.now() - game.startTime) / 1000);
  game.winner = winner;

  console.log('🏁 Game ended. Winner:', winner || 'Draw', '| Duration:', duration, 's', reason ? `| Reason: ${reason}` : '');

  // Save to database
  try {
    await pool.query(
      'INSERT INTO games (game_id, player1_username, player2_username, winner, game_duration, moves_count, board_state, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
      [game.gameId, game.players[0].username, game.players[1].username, winner, duration, game.moves, JSON.stringify(game.board)]
    );

    if (winner) {
      await pool.query(
        'UPDATE players SET games_played = games_played + 1, games_won = games_won + 1 WHERE username = $1',
        [winner]
      );

      const loser = game.players.find(p => p.username !== winner)?.username;
      if (loser && loser !== 'Bot') {
        await pool.query(
          'UPDATE players SET games_played = games_played + 1 WHERE username = $1',
          [loser]
        );
      }
    }

    console.log('💾 Game saved to database');

    await sendGameEvent('game.completed', {
      gameId: game.gameId,
      winner,
      duration,
      moves: game.moves,
      reason
    });
  } catch (error) {
    console.error('End game database error:', error.message);
  }

  // Notify players
  console.log('📤 Sending gameOver to all players');
  game.players.forEach(player => {
    if (player.socketId) {
      console.log('   → Notifying:', player.username);
      io.to(player.socketId).emit('gameOver', {
        winner: winner || 'draw',
        board: game.board,
        duration,
        moves: game.moves,
        reason
      });
    }
  });

  games.delete(game.gameId);
  console.log('🗑️ Game deleted from memory');
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Leaderboard API: http://localhost:${PORT}/api/leaderboard`);
  console.log(`🎮 Ready for connections!`);
  console.log(`🔄 30-second reconnection enabled`);
});
