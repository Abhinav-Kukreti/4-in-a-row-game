import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';
import { playDropSound, playWinSound, playLoseSound, playHoverSound } from './sounds';
import { themes } from './themes';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [gameState, setGameState] = useState(null);
  const [board, setBoard] = useState(Array(6).fill(null).map(() => Array(7).fill(null)));
  const [message, setMessage] = useState('');
  const [gameInfo, setGameInfo] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [hoverColumn, setHoverColumn] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  
  // New states for themes and sounds
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', (data) => {
      console.log('⏳ Waiting for opponent');
      setMessage('Waiting for opponent... (Bot will join in 10 seconds)');
    });

    socket.on('gameStart', (data) => {
      console.log('🎮 Game started:', data);
      localStorage.setItem('currentGameId', data.gameId);
      localStorage.setItem('currentUsername', username);
      
      setGameInfo(data);
      const emptyBoard = Array(6).fill(null).map(() => Array(7).fill(null));
      setBoard(emptyBoard);
      setRenderKey(prev => prev + 1);
      
      setMessage(`Game started! You are ${data.yourColor}. ${data.currentTurn === username ? 'Your turn!' : 'Opponent\'s turn'}`);
      setGameState('playing');
    });

    socket.on('gameState', (data) => {
      console.log('📊 Game state update:', data);
      
      const newBoard = JSON.parse(JSON.stringify(data.board));
      setBoard(newBoard);
      setRenderKey(prev => prev + 1);
      
      setGameInfo(prev => ({
        ...prev,
        currentTurn: data.currentTurn
      }));
      
      const turnMessage = data.currentTurn === username ? '✅ Your turn!' : `⏳ ${data.currentTurn}'s turn`;
      setMessage(turnMessage);
      
      // Play drop sound
      if (soundEnabled) {
        playDropSound();
      }
    });

    socket.on('gameOver', (data) => {
      console.log('🏁 Game over:', data);
      
      localStorage.removeItem('currentGameId');
      localStorage.removeItem('currentUsername');
      
      const finalBoard = JSON.parse(JSON.stringify(data.board));
      setBoard(finalBoard);
      setRenderKey(prev => prev + 1);
      
      // Handle game over messages and sounds
      if (data.reason === 'forfeit') {
        if (data.winner === username) {
          setMessage('🎉 You Won! (Opponent disconnected)');
          if (soundEnabled) playWinSound();
          triggerConfetti();
        } else {
          setMessage('😞 You Lost (Connection timeout)');
          if (soundEnabled) playLoseSound();
        }
      } else if (data.winner === 'draw') {
        setMessage('Game Over - It\'s a Draw!');
      } else if (data.winner === username) {
        setMessage('🎉 You Won!');
        if (soundEnabled) playWinSound();
        triggerConfetti();
      } else {
        setMessage(`Game Over - ${data.winner} won!`);
        if (soundEnabled) playLoseSound();
      }
      
      setGameState('finished');
      fetchLeaderboard();
    });

    socket.on('opponentDisconnected', (data) => {
      console.log('⚠️ Opponent disconnected');
      setMessage(`⚠️ ${data.message}`);
    });

    socket.on('opponentReconnected', (data) => {
      console.log('✅ Opponent reconnected');
      setMessage('✅ Opponent reconnected! Game resumed.');
      setTimeout(() => {
        if (gameInfo?.currentTurn === username) {
          setMessage('✅ Your turn!');
        } else {
          setMessage(`⏳ ${gameInfo?.currentTurn}'s turn`);
        }
      }, 3000);
    });

    socket.on('error', (data) => {
      console.error('❌ Socket error:', data);
      setMessage(`Error: ${data.message}`);
    });

    return () => {
      socket.off('waiting');
      socket.off('gameStart');
      socket.off('gameState');
      socket.off('gameOver');
      socket.off('opponentDisconnected');
      socket.off('opponentReconnected');
      socket.off('error');
    };
  }, [socket, username, gameInfo, soundEnabled]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const handleJoinGame = () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    const storedGameId = localStorage.getItem('currentGameId');
    const storedUsername = localStorage.getItem('currentUsername');
    
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected! Socket ID:', newSocket.id);
      
      if (storedGameId && storedUsername === username) {
        console.log('🔄 Attempting reconnection...');
        newSocket.emit('reconnectGame', { username, gameId: storedGameId });
        setMessage('Reconnecting to game...');
      } else {
        newSocket.emit('joinGame', { username });
        setMessage('Connected! Waiting for opponent...');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      alert('Failed to connect. Make sure backend is running.');
      setMessage('Connection failed.');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
      if (reason === 'io client disconnect') {
        localStorage.removeItem('currentGameId');
        localStorage.removeItem('currentUsername');
      }
    });

    setSocket(newSocket);
    setMessage('Connecting...');
  };

  const handleColumnClick = useCallback((col) => {
    if (!gameState || gameState !== 'playing') return;
    if (!gameInfo) return;
    if (gameInfo.currentTurn !== username) return;

    console.log('🎯 Making move on column:', col);
    socket.emit('makeMove', { gameId: gameInfo.gameId, column: col });
  }, [gameState, gameInfo, username, socket]);

  const handleNewGame = () => {
    console.log('🔄 Starting new game');
    localStorage.removeItem('currentGameId');
    localStorage.removeItem('currentUsername');
    
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);
    setGameState(null);
    setBoard(Array(6).fill(null).map(() => Array(7).fill(null)));
    setMessage('');
    setGameInfo(null);
    setHoverColumn(null);
    setRenderKey(0);
    setConfetti([]);
    fetchLeaderboard();
  };

  const handleMouseEnter = (col) => {
    if (gameState === 'playing' && gameInfo?.currentTurn === username) {
      setHoverColumn(col);
      if (soundEnabled) playHoverSound();
    }
  };

  const triggerConfetti = () => {
    const newConfetti = [];
    for (let i = 0; i < 50; i++) {
      newConfetti.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        color: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'][Math.floor(Math.random() * 5)]
      });
    }
    setConfetti(newConfetti);
    setTimeout(() => setConfetti([]), 3000);
  };

  const theme = themes[currentTheme];

  if (!gameState) {
    return (
      <div className="App" style={{ background: theme.background }}>
        {/* Theme Switcher */}
        <div className="theme-switcher">
          <button 
            className="theme-button"
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
          >
            🎨 {themes[currentTheme].name}
          </button>
          {showThemeDropdown && (
            <div className="theme-dropdown">
              {Object.entries(themes).map(([key, value]) => (
                <div
                  key={key}
                  className={`theme-option ${currentTheme === key ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentTheme(key);
                    setShowThemeDropdown(false);
                  }}
                >
                  {value.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sound Toggle */}
        <button 
          className="sound-toggle"
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        <div className="container" style={{ background: theme.containerBg, color: theme.primaryText }}>
          <h1 style={{ color: theme.primaryText }}>🎮 4 in a Row</h1>
          <div className="join-section">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
            />
            <button onClick={handleJoinGame}>Join Game</button>
          </div>
          {message && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '15px', 
              padding: '10px', 
              background: message.includes('⚠️') ? '#fff3cd' : '#e3f2fd', 
              borderRadius: '8px',
              color: message.includes('⚠️') ? '#856404' : '#1976d2',
              fontWeight: 'bold'
            }}>
              {message}
            </div>
          )}
          <button className="leaderboard-btn" onClick={() => setShowLeaderboard(!showLeaderboard)}>
            {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
          </button>
          {showLeaderboard && (
            <div className="leaderboard">
              <h2>🏆 Leaderboard</h2>
              {leaderboard.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No games played yet!
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Won</th>
                      <th>Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((player, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{player.username}</td>
                        <td>{player.games_won}</td>
                        <td>{player.games_played}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const isMyTurn = gameState === 'playing' && gameInfo?.currentTurn === username;

  return (
    <div className="App" style={{ background: theme.background }}>
      {/* Confetti */}
      {confetti.map((conf) => (
        <div
          key={conf.id}
          className="confetti"
          style={{
            left: `${conf.left}%`,
            background: conf.color,
            animationDelay: `${conf.delay}s`
          }}
        />
      ))}

      {/* Theme Switcher */}
      <div className="theme-switcher">
        <button 
          className="theme-button"
          onClick={() => setShowThemeDropdown(!showThemeDropdown)}
        >
          🎨 {themes[currentTheme].name}
        </button>
        {showThemeDropdown && (
          <div className="theme-dropdown">
            {Object.entries(themes).map(([key, value]) => (
              <div
                key={key}
                className={`theme-option ${currentTheme === key ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTheme(key);
                  setShowThemeDropdown(false);
                }}
              >
                {value.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sound Toggle */}
      <button 
        className="sound-toggle"
        onClick={() => setSoundEnabled(!soundEnabled)}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      <div className="container" style={{ background: theme.containerBg, color: theme.primaryText }}>
        <h1 style={{ color: theme.primaryText }}>🎮 4 in a Row</h1>
        <div className="game-info">
          <p><strong>Player:</strong> {username} ({gameInfo?.yourColor})</p>
          <p><strong>Opponent:</strong> {gameInfo?.opponent}</p>
          <p className="message">{message}</p>
        </div>
        <div className="board" key={renderKey} style={{ background: theme.boardBg }}>
          {board.map((row, rowIndex) => (
            <div key={`row-${rowIndex}-${renderKey}`} className="row">
              {row.map((cell, colIndex) => {
                const isHovered = hoverColumn === colIndex && rowIndex === 0;
                const isMyDisc = cell === username;
                const isOpponentDisc = cell && (cell === gameInfo?.opponent || cell === 'Bot');
                
                let discColor = null;
                if (cell) {
                  if (isMyDisc) {
                    discColor = gameInfo?.yourColor === 'red' ? '#ff4444' : '#ffeb3b';
                  } else if (isOpponentDisc) {
                    discColor = gameInfo?.yourColor === 'red' ? '#ffeb3b' : '#ff4444';
                  }
                }
                
                return (
                  <div
                    key={`cell-${rowIndex}-${colIndex}-${renderKey}`}
                    className="cell"
                    onClick={() => handleColumnClick(colIndex)}
                    onMouseEnter={() => handleMouseEnter(colIndex)}
                    onMouseLeave={() => setHoverColumn(null)}
                    style={{ 
                      cursor: isMyTurn ? 'pointer' : 'default',
                      background: isHovered ? '#526d82' : theme.cellBg,
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {cell && discColor && (
                      <div 
                        className={gameState === 'finished' ? 'disc victory-animation' : 'disc'}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: discColor === '#ff4444' 
                            ? 'radial-gradient(circle at 30% 30%, #ff4444, #cc0000)'
                            : 'radial-gradient(circle at 30% 30%, #ffeb3b, #ffc107)',
                          border: discColor === '#ff4444' ? '3px solid #ff0000' : '3px solid #ffa000',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)'
                        }}
                      ></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', color: theme.primaryText }}>
          {isMyTurn ? '👆 Click any column to drop your disc' : '⏳ Waiting for opponent...'}
        </div>
        {gameState === 'finished' && (
          <button className="new-game-btn" onClick={handleNewGame}>
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
