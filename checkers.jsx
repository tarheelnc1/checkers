const { useState, useEffect } = React;

const CheckersGame = () => {
  const firebaseConfig = {
    apiKey: "AIzaSyDxlebolta66r7YGj-E7x9dxf-ZyP6sOJo",
    authDomain: "gridhunter.firebaseapp.com",
    databaseURL: "https://gridhunter-default-rtdb.firebaseio.com",
    projectId: "gridhunter",
    storageBucket: "gridhunter.firebasestorage.app",
    messagingSenderId: "312117358671",
    appId: "1:312117358671:web:bd3d98b3dd1bc6bd2a0f83"
  };

  const [app] = useState(() => firebase.initializeApp(firebaseConfig));
  const [db] = useState(() => firebase.database());
  const [gameId, setGameId] = useState('');
  const [gameState, setGameState] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [screen, setScreen] = useState('menu');
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('checkersPlayerName') || '';
  });
  const [joinCode, setJoinCode] = useState(() => {
    return localStorage.getItem('checkersLastCode') || '';
  });
  const [playerStats, setPlayerStats] = useState({ wins: 0, losses: 0, points: 0 });
  const [opponentStats, setOpponentStats] = useState({ wins: 0, losses: 0, points: 0 });
  const [shareableLink, setShareableLink] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState([]);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [joinedViaLink, setJoinedViaLink] = useState(false);
  
  // ADMIN PASSWORD - Change this to your own secure password!
  const ADMIN_PASSWORD = 'checkers2025';

  // Get or create a unique player token for this browser
  const getPlayerToken = () => {
    let token = localStorage.getItem('checkersPlayerToken');
    if (!token) {
      token = Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
      localStorage.setItem('checkersPlayerToken', token);
    }
    return token;
  };

  // Get or create a persistent player ID for this browser
  const getPlayerId = () => {
    let id = localStorage.getItem('checkersPlayerId');
    if (!id) {
      id = Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem('checkersPlayerId', id);
    }
    return id;
  };

  const playerToken = getPlayerToken();
  const playerId = getPlayerId();

  console.log('===== PLAYER IDENTITY =====');
  console.log('Player ID:', playerId);
  console.log('Player Token:', playerToken);
  console.log('===========================');

  // Check URL parameters for join code on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get('join');
    const restoreParam = urlParams.get('restore');
    const adminParam = urlParams.get('admin');
    
    if (joinParam) {
      setJoinCode(joinParam.toUpperCase());
      setJoinedViaLink(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (restoreParam) {
      handleRestoreToken(restoreParam);
    }
    
    if (adminParam === 'true') {
      setShowAdmin(true);
    }
  }, []);

  // Function to create a safe key from player name
  const sanitizePlayerName = (name) => {
    return name.trim().toLowerCase().replace(/[.#$[\]]/g, '_');
  };

  // Calculate points based on game outcome
  const calculatePoints = (won, piecesRemaining, capturesMade, kingsCreated) => {
    const BASE_WIN = 100;
    const PIECE_BONUS = 10;
    const CAPTURE_BONUS = 5;
    const KING_BONUS = 15;
    
    if (!won) return 0;
    
    return BASE_WIN + 
           (piecesRemaining * PIECE_BONUS) + 
           (capturesMade * CAPTURE_BONUS) + 
           (kingsCreated * KING_BONUS);
  };

  // Admin function: Handle restore token from URL
  const handleRestoreToken = async (token) => {
    try {
      const tokenRef = db.ref(`restoreTokens/${token}`);
      const snapshot = await tokenRef.once('value');
      const tokenData = snapshot.val();
      
      if (!tokenData) {
        alert('Invalid or expired restore link.');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (Date.now() - tokenData.createdAt > twentyFourHours) {
        alert('This restore link has expired (24 hours).');
        await tokenRef.remove();
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      if (tokenData.used) {
        alert('This restore link has already been used.');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      const playerKey = tokenData.playerKey;
      const statsRef = db.ref(`checkers_playerStats/${playerKey}`);
      await statsRef.update({
        token: playerToken,
        restoredAt: Date.now(),
        lastPlayed: Date.now()
      });
      
      await tokenRef.update({ used: true, usedAt: Date.now() });
      
      const statsSnapshot = await statsRef.once('value');
      const stats = statsSnapshot.val();
      
      if (stats) {
        setPlayerName(stats.name);
        localStorage.setItem('checkersPlayerName', stats.name);
        setPlayerStats({ wins: stats.wins || 0, losses: stats.losses || 0, points: stats.points || 0 });
        alert(`✅ Success! Your name "${stats.name}" has been restored!\n\nStats: ${stats.wins}W - ${stats.losses}L - ${stats.points}pts`);
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Restore error:', error);
      alert('Error restoring your account.');
    }
  };

  // Admin functions
  const authenticateAdmin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminAuthenticated(true);
      setAdminPassword('');
    } else {
      alert('Incorrect admin password');
    }
  };

  const searchPlayers = async () => {
    if (!adminSearch.trim()) {
      alert('Please enter a search term');
      return;
    }
    
    try {
      const statsRef = db.ref('checkers_playerStats');
      const snapshot = await statsRef.once('value');
      const allStats = snapshot.val();
      
      if (!allStats) {
        setAdminSearchResults([]);
        return;
      }
      
      const searchTerm = adminSearch.toLowerCase();
      const results = Object.entries(allStats)
        .filter(([key, stats]) => 
          stats.name.toLowerCase().includes(searchTerm) ||
          key.includes(searchTerm)
        )
        .map(([key, stats]) => ({
          key,
          ...stats,
          daysInactive: Math.floor((Date.now() - (stats.lastPlayed || stats.createdAt || 0)) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
      
      setAdminSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching players');
    }
  };

  const generateRestoreLink = async (playerKey, playerName) => {
    try {
      const token = Math.random().toString(36).substr(2, 20) + Date.now().toString(36);
      const tokenRef = db.ref(`restoreTokens/${token}`);
      
      await tokenRef.set({
        playerKey,
        playerName,
        createdAt: Date.now(),
        used: false,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      });
      
      const currentUrl = window.location.origin + window.location.pathname;
      const restoreLink = `${currentUrl}?restore=${token}`;
      
      try {
        await navigator.clipboard.writeText(restoreLink);
        alert(`✅ Restore link copied!\n\n${restoreLink}\n\nExpires in 24 hours.`);
      } catch (err) {
        prompt('Copy this restore link:', restoreLink);
      }
    } catch (error) {
      console.error('Generate link error:', error);
      alert('Error generating restore link');
    }
  };

  // Check if name is available
  const checkNameAvailable = async (name) => {
    const playerKey = sanitizePlayerName(name);
    const statsRef = db.ref(`checkers_playerStats/${playerKey}`);
    const snapshot = await statsRef.once('value');
    const stats = snapshot.val();
    
    if (!stats) {
      return { available: true, isOwner: false, canReclaim: false };
    }
    
    const isOwner = stats.token === playerToken;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const lastPlayed = stats.lastPlayed || stats.createdAt || 0;
    const isInactive = lastPlayed < thirtyDaysAgo;
    
    return { 
      available: isOwner || isInactive, 
      isOwner: isOwner,
      canReclaim: isInactive && !isOwner,
      lastPlayed: lastPlayed,
      existingStats: stats
    };
  };

  // Load player stats when name changes
  useEffect(() => {
    if (playerName.trim()) {
      const playerKey = sanitizePlayerName(playerName);
      const statsRef = db.ref(`checkers_playerStats/${playerKey}`);
      
      statsRef.once('value', (snapshot) => {
        const stats = snapshot.val();
        if (stats) {
          setPlayerStats(stats);
        } else {
          setPlayerStats({ wins: 0, losses: 0, points: 0 });
        }
      });
    }
  }, [playerName, db]);

  // Load opponent stats
  useEffect(() => {
    if (gameState?.players) {
      const opponentId = Object.keys(gameState.players).find(id => id !== playerId);
      if (opponentId) {
        const opponentName = gameState.players[opponentId].name;
        if (opponentName) {
          const opponentKey = sanitizePlayerName(opponentName);
          const statsRef = db.ref(`checkers_playerStats/${opponentKey}`);
          
          statsRef.once('value', (snapshot) => {
            const stats = snapshot.val();
            if (stats) {
              setOpponentStats(stats);
            } else {
              setOpponentStats({ wins: 0, losses: 0, points: 0 });
            }
          });
        }
      }
    }
  }, [gameState?.players, playerId, db]);

  // Reload stats when game finishes
  useEffect(() => {
    if (gameState?.phase === 'finished' && gameState.players) {
      if (playerName.trim()) {
        const playerKey = sanitizePlayerName(playerName);
        db.ref(`checkers_playerStats/${playerKey}`).once('value', (snapshot) => {
          const stats = snapshot.val();
          if (stats) setPlayerStats(stats);
        });
      }
      
      const opponentId = Object.keys(gameState.players).find(id => id !== playerId);
      if (opponentId) {
        const opponentName = gameState.players[opponentId].name;
        if (opponentName) {
          const opponentKey = sanitizePlayerName(opponentName);
          db.ref(`checkers_playerStats/${opponentKey}`).once('value', (snapshot) => {
            const stats = snapshot.val();
            if (stats) setOpponentStats(stats);
          });
        }
      }
    }
  }, [gameState?.phase, gameState?.players, playerName, playerId, db]);

  // Initialize board with standard checkers setup
  const initializeBoard = () => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Place black pieces (rows 0-2)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { color: 'black', king: false };
        }
      }
    }
    
    // Place red pieces (rows 5-7)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { color: 'red', king: false };
        }
      }
    }
    
    return board;
  };

  const createGame = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    const nameCheck = await checkNameAvailable(playerName);
    
    if (!nameCheck.available) {
      alert(`The name "${playerName}" is already taken. Please choose a different name.`);
      return;
    }
    
    if (nameCheck.canReclaim) {
      const lastPlayedDate = new Date(nameCheck.lastPlayed);
      const daysInactive = Math.floor((Date.now() - nameCheck.lastPlayed) / (1000 * 60 * 60 * 24));
      
      const confirmed = confirm(
        `The name "${playerName}" was last used ${daysInactive} days ago (${lastPlayedDate.toLocaleDateString()}).\n\n` +
        `Stats: ${nameCheck.existingStats.wins}W - ${nameCheck.existingStats.losses}L\n` +
        `Points: ${nameCheck.existingStats.points || 0}\n\n` +
        `Do you want to reclaim this name and keep these stats?`
      );
      
      if (!confirmed) return;
      
      const playerKey = sanitizePlayerName(playerName);
      await db.ref(`checkers_playerStats/${playerKey}`).update({
        token: playerToken,
        reclaimedAt: Date.now(),
        lastPlayed: Date.now()
      });
      
      setPlayerStats({
        wins: nameCheck.existingStats.wins || 0,
        losses: nameCheck.existingStats.losses || 0,
        points: nameCheck.existingStats.points || 0
      });
    } else if (!nameCheck.isOwner) {
      const playerKey = sanitizePlayerName(playerName);
      await db.ref(`checkers_playerStats/${playerKey}`).set({
        name: playerName.trim(),
        wins: 0,
        losses: 0,
        points: 0,
        token: playerToken,
        createdAt: Date.now(),
        lastPlayed: Date.now()
      });
    }
    
    localStorage.setItem('checkersPlayerName', playerName.trim());
    
    const newGameRef = db.ref('checkers_games').push();
    const newGameId = newGameRef.key;
    const gameCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    localStorage.setItem('checkersLastCode', gameCode);
    
    const currentUrl = window.location.origin + window.location.pathname;
    const link = `${currentUrl}?join=${gameCode}`;
    setShareableLink(link);
    
    await newGameRef.set({
      code: gameCode,
      host: playerId,
      phase: 'lobby',
      currentTurn: null,
      board: initializeBoard(),
      players: {
        [playerId]: {
          name: playerName,
          color: 'red',
          ready: false,
          wins: 0,
          points: 0,
          captures: 0,
          kingsCreated: 0
        }
      },
      createdAt: Date.now()
    });
    
    setGameId(newGameId);
    setScreen('lobby');
  };

  const joinGame = async () => {
    if (!playerName.trim() || !joinCode.trim()) {
      alert('Please enter your name and game code');
      return;
    }
    
    const nameCheck = await checkNameAvailable(playerName);
    
    if (!nameCheck.available) {
      alert(`The name "${playerName}" is already taken. Please choose a different name.`);
      return;
    }
    
    if (nameCheck.canReclaim) {
      const lastPlayedDate = new Date(nameCheck.lastPlayed);
      const daysInactive = Math.floor((Date.now() - nameCheck.lastPlayed) / (1000 * 60 * 60 * 24));
      
      const confirmed = confirm(
        `The name "${playerName}" was last used ${daysInactive} days ago (${lastPlayedDate.toLocaleDateString()}).\n\n` +
        `Stats: ${nameCheck.existingStats.wins}W - ${nameCheck.existingStats.losses}L\n` +
        `Points: ${nameCheck.existingStats.points || 0}\n\n` +
        `Do you want to reclaim this name and keep these stats?`
      );
      
      if (!confirmed) return;
      
      const playerKey = sanitizePlayerName(playerName);
      await db.ref(`checkers_playerStats/${playerKey}`).update({
        token: playerToken,
        reclaimedAt: Date.now(),
        lastPlayed: Date.now()
      });
      
      setPlayerStats({
        wins: nameCheck.existingStats.wins || 0,
        losses: nameCheck.existingStats.losses || 0,
        points: nameCheck.existingStats.points || 0
      });
    } else if (!nameCheck.isOwner) {
      const playerKey = sanitizePlayerName(playerName);
      await db.ref(`checkers_playerStats/${playerKey}`).set({
        name: playerName.trim(),
        wins: 0,
        losses: 0,
        points: 0,
        token: playerToken,
        createdAt: Date.now(),
        lastPlayed: Date.now()
      });
    }
    
    localStorage.setItem('checkersPlayerName', playerName.trim());
    localStorage.setItem('checkersLastCode', joinCode.trim().toUpperCase());
    
    try {
      const gamesRef = db.ref('checkers_games');
      const snapshot = await gamesRef.once('value');
      const games = snapshot.val();
      
      if (games) {
        const foundGame = Object.entries(games).find(([id, game]) => 
          game.code === joinCode.toUpperCase()
        );
        
        if (foundGame) {
          const [foundGameId, foundGameData] = foundGame;
          
          console.log('=== REJOIN DEBUG ===');
          console.log('Current playerId:', playerId);
          console.log('Players in game:', Object.keys(foundGameData.players || {}));
          
          if (Object.keys(foundGameData.players || {}).length >= 2) {
            const wasInGame = foundGameData.players[playerId];
            if (!wasInGame) {
              alert('Game is full - maximum 2 players');
              return;
            }
          }
          
          const playersInGame = foundGameData.players || {};
          const nameAlreadyInGame = Object.entries(playersInGame).some(
            ([pid, player]) => 
              player.name.toLowerCase() === playerName.toLowerCase() && 
              pid !== playerId
          );
          
          if (nameAlreadyInGame) {
            alert(`The name "${playerName}" is already in this game. Please use a different name.`);
            return;
          }
          
          if (foundGameData.players && foundGameData.players[playerId]) {
            await db.ref(`checkers_games/${foundGameId}/players/${playerId}`).update({
              name: playerName,
              ready: foundGameData.phase === 'lobby' ? false : true
            });
            alert('✅ Reconnected to game!');
          } else {
            await db.ref(`checkers_games/${foundGameId}/players/${playerId}`).set({
              name: playerName,
              color: 'black',
              ready: false,
              wins: 0,
              points: 0,
              captures: 0,
              kingsCreated: 0
            });
          }
          
          setGameId(foundGameId);
          setScreen('lobby');
        } else {
          alert('Game not found. Check the code and try again.');
        }
      } else {
        alert('No games found.');
      }
    } catch (error) {
      console.error('Join error:', error);
      alert('Error joining game');
    }
  };

  const startGame = async () => {
    if (gameState?.host !== playerId) return;
    
    const players = Object.keys(gameState.players || {});
    if (players.length < 2) {
      alert('Need 2 players to start');
      return;
    }
    
    // Red player (host) goes first
    const redPlayer = Object.entries(gameState.players).find(([id, p]) => p.color === 'red')[0];
    
    await db.ref(`checkers_games/${gameId}`).update({
      phase: 'playing',
      currentTurn: redPlayer
    });
  };

  // Get valid moves for a piece
  const getValidMoves = (board, row, col, piece) => {
    const moves = [];
    const jumps = [];
    
    if (!piece) return { moves: [], jumps: [] };
    
    const directions = piece.king 
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] 
      : piece.color === 'red' 
        ? [[-1, -1], [-1, 1]] 
        : [[1, -1], [1, 1]];
    
    // Check regular moves
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        if (!board[newRow][newCol]) {
          moves.push({ row: newRow, col: newCol, type: 'move' });
        }
      }
    }
    
    // Check jumps
    for (const [dr, dc] of directions) {
      const jumpRow = row + dr * 2;
      const jumpCol = col + dc * 2;
      const midRow = row + dr;
      const midCol = col + dc;
      
      if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
        const midPiece = board[midRow][midCol];
        if (midPiece && midPiece.color !== piece.color && !board[jumpRow][jumpCol]) {
          jumps.push({ 
            row: jumpRow, 
            col: jumpCol, 
            type: 'jump',
            captureRow: midRow,
            captureCol: midCol
          });
        }
      }
    }
    
    return { moves, jumps };
  };

  const selectPiece = (row, col) => {
    if (gameState?.phase !== 'playing') return;
    if (gameState?.currentTurn !== playerId) return;
    
    const piece = gameState.board[row][col];
    const myColor = gameState.players[playerId].color;
    
    if (!piece || piece.color !== myColor) return;
    
    // Check if any jumps are available on the board (forced capture rule)
    let hasJumps = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = gameState.board[r][c];
        if (p && p.color === myColor) {
          const { jumps } = getValidMoves(gameState.board, r, c, p);
          if (jumps.length > 0) {
            hasJumps = true;
            break;
          }
        }
      }
      if (hasJumps) break;
    }
    
    const { moves, jumps } = getValidMoves(gameState.board, row, col, piece);
    
    // If jumps exist anywhere, only allow jumps
    const validOptions = hasJumps ? jumps : [...moves, ...jumps];
    
    setSelectedPiece({ row, col });
    setValidMoves(validOptions);
  };

  const movePiece = async (toRow, toCol) => {
    if (!selectedPiece) return;
    
    const move = validMoves.find(m => m.row === toRow && m.col === toCol);
    if (!move) return;
    
    const newBoard = gameState.board.map(row => [...row]);
    const piece = newBoard[selectedPiece.row][selectedPiece.col];
    
    // Move the piece
    newBoard[toRow][toCol] = piece;
    newBoard[selectedPiece.row][selectedPiece.col] = null;
    
    let capturesMade = gameState.players[playerId].captures || 0;
    let kingsCreated = gameState.players[playerId].kingsCreated || 0;
    
    // Handle capture
    if (move.type === 'jump') {
      newBoard[move.captureRow][move.captureCol] = null;
      capturesMade++;
    }
    
    // Check for king promotion
    const wasKing = piece.king;
    if (!wasKing) {
      if ((piece.color === 'red' && toRow === 0) || (piece.color === 'black' && toRow === 7)) {
        newBoard[toRow][toCol].king = true;
        kingsCreated++;
      }
    }
    
    // Check for multi-jump
    const { jumps } = getValidMoves(newBoard, toRow, toCol, newBoard[toRow][toCol]);
    const canContinueJumping = move.type === 'jump' && jumps.length > 0;
    
    if (canContinueJumping) {
      // Update board but keep turn
      await db.ref(`checkers_games/${gameId}`).update({
        board: newBoard,
        [`players/${playerId}/captures`]: capturesMade,
        [`players/${playerId}/kingsCreated`]: kingsCreated
      });
      
      setSelectedPiece({ row: toRow, col: toCol });
      setValidMoves(jumps);
      return;
    }
    
    // Check win condition
    const opponentId = Object.keys(gameState.players).find(id => id !== playerId);
    const opponentColor = gameState.players[opponentId].color;
    
    let opponentHasPieces = false;
    let opponentHasMoves = false;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = newBoard[r][c];
        if (p && p.color === opponentColor) {
          opponentHasPieces = true;
          const { moves, jumps } = getValidMoves(newBoard, r, c, p);
          if (moves.length > 0 || jumps.length > 0) {
            opponentHasMoves = true;
            break;
          }
        }
      }
      if (opponentHasMoves) break;
    }
    
    const gameWon = !opponentHasPieces || !opponentHasMoves;
    
    if (gameWon) {
      // Calculate pieces remaining
      let piecesRemaining = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = newBoard[r][c];
          if (p && p.color === gameState.players[playerId].color) {
            piecesRemaining++;
          }
        }
      }
      
      const pointsEarned = calculatePoints(true, piecesRemaining, capturesMade, kingsCreated);
      
      // Update winner stats
      const currentWins = gameState.players[playerId].wins || 0;
      await db.ref(`checkers_games/${gameId}/players/${playerId}`).update({
        wins: currentWins + 1,
        points: (gameState.players[playerId].points || 0) + pointsEarned,
        captures: capturesMade,
        kingsCreated: kingsCreated
      });
      
      // Update lifetime stats
      const winnerName = gameState.players[playerId].name;
      const loserName = gameState.players[opponentId].name;
      
      const winnerKey = sanitizePlayerName(winnerName);
      const loserKey = sanitizePlayerName(loserName);
      
      const winnerStatsRef = db.ref(`checkers_playerStats/${winnerKey}`);
      const loserStatsRef = db.ref(`checkers_playerStats/${loserKey}`);
      
      const winnerSnapshot = await winnerStatsRef.once('value');
      const loserSnapshot = await loserStatsRef.once('value');
      
      const winnerStats = winnerSnapshot.val() || { wins: 0, losses: 0, points: 0 };
      const loserStats = loserSnapshot.val() || { wins: 0, losses: 0, points: 0 };
      
      await winnerStatsRef.set({
        name: winnerName,
        wins: winnerStats.wins + 1,
        losses: winnerStats.losses,
        points: (winnerStats.points || 0) + pointsEarned,
        token: winnerStats.token || playerToken,
        lastPlayed: Date.now(),
        createdAt: winnerStats.createdAt || Date.now()
      });
      
      await loserStatsRef.set({
        name: loserName,
        wins: loserStats.wins,
        losses: loserStats.losses + 1,
        points: loserStats.points || 0,
        token: loserStats.token || playerToken,
        lastPlayed: Date.now(),
        createdAt: loserStats.createdAt || Date.now()
      });
      
      await db.ref(`checkers_games/${gameId}`).update({
        phase: 'finished',
        winner: playerId,
        board: newBoard,
        pointsEarned: pointsEarned
      });
    } else {
      // Switch turns
      await db.ref(`checkers_games/${gameId}`).update({
        board: newBoard,
        currentTurn: opponentId,
        [`players/${playerId}/captures`]: capturesMade,
        [`players/${playerId}/kingsCreated`]: kingsCreated
      });
    }
    
    setSelectedPiece(null);
    setValidMoves([]);
  };

  const playAgain = async () => {
    if (gameState?.host !== playerId) return;
    
    const players = Object.keys(gameState.players);
    const playerUpdates = {};
    
    for (const pid of players) {
      playerUpdates[`players/${pid}/ready`] = false;
      playerUpdates[`players/${pid}/captures`] = 0;
      playerUpdates[`players/${pid}/kingsCreated`] = 0;
    }
    
    const redPlayer = Object.entries(gameState.players).find(([id, p]) => p.color === 'red')[0];
    
    await db.ref(`checkers_games/${gameId}`).update({
      ...playerUpdates,
      phase: 'playing',
      winner: null,
      pointsEarned: null,
      board: initializeBoard(),
      currentTurn: redPlayer
    });
  };

  const leaveGame = async () => {
    if (gameId && gameState) {
      const remainingPlayers = Object.keys(gameState.players).filter(id => id !== playerId);
      
      if (remainingPlayers.length === 0) {
        await db.ref(`checkers_games/${gameId}`).remove();
      } else {
        await db.ref(`checkers_games/${gameId}/players/${playerId}`).remove();
        
        if (gameState.host === playerId && remainingPlayers.length > 0) {
          await db.ref(`checkers_games/${gameId}/host`).set(remainingPlayers[0]);
        }
      }
    }
    
    setGameId('');
    setGameState(null);
    setSelectedPiece(null);
    setValidMoves([]);
    setShareableLink('');
    setJoinedViaLink(false);
    setScreen('menu');
  };

  // Listen for game updates
  useEffect(() => {
    if (gameId) {
      const gameRef = db.ref(`checkers_games/${gameId}`);
      
      const unsubscribe = (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setGameState(data);
          
          if (data.phase === 'lobby') {
            setScreen('lobby');
          } else if (data.phase === 'playing') {
            setScreen('playing');
          } else if (data.phase === 'finished') {
            setScreen('finished');
          }
        } else {
          setScreen('menu');
          setGameId('');
        }
      };
      
      gameRef.on('value', unsubscribe);
      return () => gameRef.off('value', unsubscribe);
    }
  }, [gameId, db, playerId]);

  return (
    <div className="app">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Share Tech Mono', monospace;
          background: #0a0e27;
          color: #00ff9d;
          overflow-x: hidden;
        }
        
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          position: relative;
        }
        
        .app::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            repeating-linear-gradient(
              0deg,
              rgba(0, 255, 157, 0.03) 0px,
              transparent 1px,
              transparent 2px,
              rgba(0, 255, 157, 0.03) 3px
            );
          pointer-events: none;
          animation: scanlines 8s linear infinite;
        }
        
        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(10px); }
        }
        
        .screen {
          background: rgba(10, 14, 39, 0.95);
          border: 2px solid #00ff9d;
          border-radius: 15px;
          padding: 30px;
          max-width: 600px;
          width: 100%;
          box-shadow: 
            0 0 20px rgba(0, 255, 157, 0.3),
            inset 0 0 20px rgba(0, 255, 157, 0.1);
          position: relative;
          z-index: 1;
        }
        
        h1 {
          font-family: 'Orbitron', sans-serif;
          font-size: 2.5em;
          text-align: center;
          margin-bottom: 10px;
          text-shadow: 0 0 20px #00ff9d;
          letter-spacing: 3px;
        }
        
        .subtitle {
          text-align: center;
          color: #00c2ff;
          font-size: 0.9em;
          margin-bottom: 30px;
          letter-spacing: 2px;
        }
        
        .input-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          color: #00ff9d;
          font-size: 0.85em;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        input {
          width: 100%;
          padding: 12px;
          background: rgba(0, 255, 157, 0.1);
          border: 1px solid #00ff9d;
          border-radius: 8px;
          color: #00ff9d;
          font-family: 'Share Tech Mono', monospace;
          font-size: 1em;
          transition: all 0.3s;
        }
        
        input:focus {
          outline: none;
          box-shadow: 0 0 15px rgba(0, 255, 157, 0.4);
          background: rgba(0, 255, 157, 0.15);
        }
        
        button {
          width: 100%;
          padding: 15px;
          margin-top: 10px;
          background: linear-gradient(135deg, #00ff9d 0%, #00c2ff 100%);
          border: none;
          border-radius: 8px;
          color: #0a0e27;
          font-family: 'Orbitron', sans-serif;
          font-size: 1.1em;
          font-weight: 700;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 2px;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(0, 255, 157, 0.3);
        }
        
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 255, 157, 0.5);
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        button.secondary {
          background: transparent;
          border: 2px solid #00ff9d;
          color: #00ff9d;
        }
        
        .board-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        
        .checkerboard {
          display: grid;
          grid-template-columns: repeat(8, 60px);
          grid-template-rows: repeat(8, 60px);
          gap: 0;
          border: 3px solid #00ff9d;
          box-shadow: 0 0 20px rgba(0, 255, 157, 0.4);
        }
        
        .square {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        
        .square.light {
          background: #e8d4b8;
        }
        
        .square.dark {
          background: #8b4513;
        }
        
        .square.selected {
          box-shadow: inset 0 0 20px rgba(0, 255, 157, 0.8);
          border: 2px solid #00ff9d;
        }
        
        .square.valid-move {
          cursor: pointer;
        }
        
        .square.valid-move::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(0, 194, 255, 0.5);
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        
        .piece {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          border: 3px solid #000;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          position: relative;
          transition: transform 0.2s;
        }
        
        .piece:hover {
          transform: scale(1.1);
        }
        
        .piece.red {
          background: radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a);
        }
        
        .piece.black {
          background: radial-gradient(circle at 30% 30%, #495057, #212529);
        }
        
        .piece.king::after {
          content: '♔';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          color: gold;
          text-shadow: 0 0 5px rgba(255, 215, 0, 0.8);
        }
        
        .game-info {
          text-align: center;
          padding: 15px;
          background: rgba(0, 255, 157, 0.1);
          border: 1px solid #00ff9d;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .turn-indicator {
          font-size: 1.2em;
          font-weight: 700;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        
        .turn-indicator.my-turn {
          background: rgba(0, 255, 157, 0.2);
          color: #00ff9d;
          border: 2px solid #00ff9d;
          animation: glow 1.5s infinite;
        }
        
        .turn-indicator.opponent-turn {
          background: rgba(0, 194, 255, 0.1);
          color: #00c2ff;
          border: 2px solid #00c2ff;
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 157, 0.5); }
          50% { box-shadow: 0 0 20px rgba(0, 255, 157, 0.8); }
        }
        
        .scoreboard {
          display: flex;
          justify-content: space-around;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .score-item {
          flex: 1;
          padding: 12px;
          background: rgba(0, 255, 157, 0.1);
          border: 1px solid #00ff9d;
          border-radius: 8px;
          text-align: center;
        }
        
        .score-you {
          color: #00ff9d;
          font-weight: 700;
        }
        
        .score-opponent {
          color: #00c2ff;
          font-weight: 700;
        }
        
        .winner-message {
          font-size: 2.5em;
          text-align: center;
          margin: 20px 0;
          font-family: 'Orbitron', sans-serif;
          text-shadow: 0 0 20px currentColor;
          animation: victory 1s ease-in-out;
        }
        
        @keyframes victory {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .player-list {
          margin-bottom: 20px;
        }
        
        .player-item {
          background: rgba(0, 255, 157, 0.1);
          border: 1px solid #00ff9d;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .player-name {
          font-weight: 700;
          color: #00ff9d;
        }
        
        .player-lifetime-stats {
          font-size: 0.75em;
          color: #00c2ff;
          margin-top: 4px;
          opacity: 0.8;
        }
        
        .status {
          color: #00c2ff;
          font-size: 0.85em;
        }
        
        .game-code {
          background: rgba(0, 194, 255, 0.2);
          border: 2px solid #00c2ff;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        
        .code-display {
          font-size: 2em;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          color: #00c2ff;
          letter-spacing: 5px;
          margin-top: 10px;
          text-shadow: 0 0 10px #00c2ff;
        }
        
        .shareable-link-box {
          background: rgba(0, 255, 157, 0.15);
          border: 2px solid #00ff9d;
          border-radius: 12px;
          padding: 15px;
          margin: 20px 0;
        }
        
        .shareable-link-box label {
          color: #00ff9d;
          font-size: 0.75em;
          margin-bottom: 10px;
          text-align: center;
          display: block;
        }
        
        .link-container {
          display: flex;
          gap: 10px;
          align-items: stretch;
        }
        
        .link-input {
          flex: 1;
          padding: 10px;
          font-size: 0.75em;
          background: rgba(0, 255, 157, 0.1);
          border: 1px solid #00ff9d;
          border-radius: 6px;
          color: #00ff9d;
          font-family: 'Share Tech Mono', monospace;
          cursor: pointer;
        }
        
        .copy-link-btn {
          width: auto;
          padding: 10px 20px;
          margin: 0;
          font-size: 0.85em;
          white-space: nowrap;
        }
        
        .lifetime-stats {
          background: linear-gradient(135deg, rgba(0, 255, 157, 0.15) 0%, rgba(0, 194, 255, 0.15) 100%);
          border: 2px solid #00ff9d;
          border-radius: 12px;
          padding: 15px;
          text-align: center;
          margin-bottom: 25px;
        }
        
        .stat-label {
          font-size: 0.75em;
          color: #00c2ff;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        
        .stat-numbers {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.3em;
          font-weight: 700;
          color: #00ff9d;
          text-shadow: 0 0 10px #00ff9d;
        }
        
        .win-rate {
          font-size: 0.7em;
          color: #00c2ff;
          margin-left: 10px;
          opacity: 0.8;
        }
        
        .info-text {
          text-align: center;
          color: #00c2ff;
          margin: 15px 0;
          font-size: 0.9em;
        }
        
        .admin-player-card {
          background: rgba(0, 255, 157, 0.1);
          border: 1px solid #00ff9d;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }
        
        .admin-player-info {
          flex: 1;
        }
        
        .admin-player-name {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.1em;
          font-weight: 700;
          color: #00ff9d;
          margin-bottom: 5px;
        }
        
        .admin-player-stats {
          font-size: 0.9em;
          color: #00c2ff;
          margin-bottom: 3px;
        }
        
        .admin-player-meta {
          font-size: 0.75em;
          color: #00ff9d;
          opacity: 0.7;
        }
        
        .clear-name-btn {
          width: auto;
          padding: 5px 10px;
          margin: 0 0 0 10px;
          font-size: 0.7em;
          background: transparent;
          border: 1px solid #00c2ff;
          color: #00c2ff;
        }
        
        @media (max-width: 600px) {
          .checkerboard {
            grid-template-columns: repeat(8, 45px);
            grid-template-rows: repeat(8, 45px);
          }
          
          .square {
            width: 45px;
            height: 45px;
          }
          
          .piece {
            width: 35px;
            height: 35px;
          }
          
          h1 {
            font-size: 1.8em;
          }
        }
      `}</style>

      {screen === 'menu' && (
        <div className="screen">
          <h1>♟️ CHECKERS</h1>
          <p className="subtitle">Classic Strategy Game</p>
          
          {joinCode && joinedViaLink && (
            <div style={{
              background: 'rgba(0, 194, 255, 0.2)',
              border: '2px solid #00c2ff',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{color: '#00c2ff', fontSize: '0.9em', marginBottom: '5px'}}>
                🎮 Ready to join game <strong>{joinCode}</strong>!
              </div>
              <div style={{color: '#00ff9d', fontSize: '0.8em'}}>
                Just enter your name below
              </div>
            </div>
          )}
          
          {playerStats.wins + playerStats.losses > 0 && playerName.trim() && (
            <div className="lifetime-stats">
              <div className="stat-label">YOUR LIFETIME RECORD</div>
              <div className="stat-numbers">
                {playerStats.wins}W - {playerStats.losses}L
                {playerStats.wins + playerStats.losses > 0 && (
                  <span className="win-rate">
                    ({Math.round((playerStats.wins / (playerStats.wins + playerStats.losses)) * 100)}% win rate)
                  </span>
                )}
              </div>
              <div style={{fontSize: '0.9em', color: '#00c2ff', marginTop: '5px'}}>
                {playerStats.points || 0} Total Points
              </div>
            </div>
          )}
          
          <div className="input-group">
            <label>
              Player Name
              {localStorage.getItem('checkersPlayerName') && (
                <button 
                  className="clear-name-btn"
                  onClick={() => {
                    localStorage.removeItem('checkersPlayerName');
                    setPlayerName('');
                  }}
                  type="button"
                >
                  Change Name
                </button>
              )}
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  if (joinCode && joinedViaLink) {
                    joinGame();
                  } else {
                    createGame();
                  }
                }
              }}
            />
            {!localStorage.getItem('checkersPlayerName') && (
              <small style={{color: '#00c2ff', fontSize: '0.75em', marginTop: '5px', display: 'block', opacity: 0.8}}>
                💡 Each name is unique. Inactive names (30+ days) can be reclaimed.
              </small>
            )}
          </div>
          
          <button onClick={joinCode && joinedViaLink ? joinGame : createGame}>
            {joinCode && joinedViaLink ? 'Join Game' : 'Create New Game'}
          </button>
          
          {!(joinCode && joinedViaLink) && (
            <>
              <div style={{margin: '20px 0', textAlign: 'center', color: '#00c2ff'}}>
                — OR —
              </div>
              
              <div className="input-group">
                <label>Game Code</label>
                <input
                  type="text"
                  placeholder="Enter code"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setJoinedViaLink(false);
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && joinGame()}
                />
                {joinCode && !joinedViaLink && localStorage.getItem('checkersLastCode') && joinCode === localStorage.getItem('checkersLastCode') && (
                  <small style={{color: '#00c2ff', fontSize: '0.8em', marginTop: '5px', display: 'block'}}>
                    💾 Last played game code (may be expired)
                  </small>
                )}
              </div>
              
              <button onClick={joinGame}>Join Game</button>
            </>
          )}
          
          <div style={{
            textAlign: 'center',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(0, 255, 157, 0.2)'
          }}>
            <button 
              onClick={() => setShowAdmin(true)}
              style={{
                width: 'auto',
                padding: '8px 16px',
                fontSize: '0.75em',
                background: 'transparent',
                border: '1px solid rgba(0, 255, 157, 0.3)',
                color: 'rgba(0, 255, 157, 0.5)',
                margin: 0
              }}
            >
              Admin Access
            </button>
          </div>
        </div>
      )}

      {screen === 'lobby' && (
        <div className="screen">
          <h1>♟️ CHECKERS</h1>
          <p className="subtitle">Waiting Room</p>
          
          <div className="game-code">
            <label>Share this code with your opponent:</label>
            <div className="code-display">{gameState?.code}</div>
          </div>
          
          {shareableLink && (
            <div className="shareable-link-box">
              <label>Or share this link (auto-fills code):</label>
              <div className="link-container">
                <input 
                  type="text" 
                  value={shareableLink} 
                  readOnly 
                  className="link-input"
                  onClick={(e) => e.target.select()}
                />
                <button 
                  className="copy-link-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableLink);
                    alert('Link copied! Send it to your opponent.');
                  }}
                >
                  📋 Copy
                </button>
              </div>
            </div>
          )}
          
          <div className="player-list">
            <label>Players ({Object.keys(gameState?.players || {}).length}/2)</label>
            {Object.entries(gameState?.players || {}).map(([id, player]) => {
              const isYou = id === playerId;
              const stats = isYou ? playerStats : opponentStats;
              const totalGames = stats.wins + stats.losses;
              
              return (
                <div key={id} className="player-item">
                  <div>
                    <span className="player-name">
                      {player.name} {isYou ? '(You)' : ''} - {player.color === 'red' ? '🔴' : '⚫'}
                    </span>
                    {totalGames > 0 && (
                      <div className="player-lifetime-stats">
                        Lifetime: {stats.wins}W - {stats.losses}L • {stats.points || 0} pts
                      </div>
                    )}
                  </div>
                  <span className="status">Session: {player.wins || 0}W</span>
                </div>
              );
            })}
          </div>
          
          <p className="info-text">
            🔴 Red moves first • Must capture when possible • King when reaching opposite end
          </p>
          
          {gameState?.host === playerId ? (
            <>
              <button 
                onClick={startGame}
                disabled={Object.keys(gameState?.players || {}).length < 2}
              >
                Start Game
              </button>
              {Object.keys(gameState?.players || {}).length < 2 && (
                <p className="info-text">Waiting for opponent to join...</p>
              )}
            </>
          ) : (
            <p className="info-text">Waiting for host to start the game...</p>
          )}
          
          <button className="secondary" onClick={leaveGame}>
            Leave Game
          </button>
        </div>
      )}

      {screen === 'playing' && (
        <div className="screen" style={{maxWidth: '700px'}}>
          <h1>♟️ CHECKERS</h1>
          
          <div className="scoreboard">
            {Object.entries(gameState?.players || {}).map(([id, player]) => {
              const isYou = id === playerId;
              const stats = isYou ? playerStats : opponentStats;
              
              return (
                <div key={id} className="score-item">
                  <div>
                    <span className={isYou ? 'score-you' : 'score-opponent'}>
                      {player.color === 'red' ? '🔴' : '⚫'} {player.name}: {player.wins || 0}W
                    </span>
                    <div style={{fontSize: '0.7em', marginTop: '3px'}}>
                      Session: {player.points || 0} pts
                    </div>
                  </div>
                  {stats.wins + stats.losses > 0 && (
                    <div style={{fontSize: '0.65em', opacity: 0.7, textAlign: 'right'}}>
                      Lifetime<br/>
                      {stats.wins}-{stats.losses}<br/>
                      {stats.points || 0}pts
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className={`turn-indicator ${gameState?.currentTurn === playerId ? 'my-turn' : 'opponent-turn'}`}>
            {gameState?.currentTurn === playerId ? '🎯 YOUR TURN' : '⏳ Opponent\'s Turn'}
          </div>
          
          <div className="board-container">
            <div className="checkerboard">
              {gameState?.board?.map((row, rowIndex) => 
                row.map((piece, colIndex) => {
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
                  const isValidMove = validMoves.some(m => m.row === rowIndex && m.col === colIndex);
                  
                  return (
                    <div 
                      key={`${rowIndex}-${colIndex}`}
                      className={`square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''}`}
                      onClick={() => {
                        if (isValidMove) {
                          movePiece(rowIndex, colIndex);
                        } else {
                          selectPiece(rowIndex, colIndex);
                        }
                      }}
                    >
                      {piece && (
                        <div className={`piece ${piece.color} ${piece.king ? 'king' : ''}`} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <button className="secondary" onClick={leaveGame} style={{marginTop: '20px'}}>
            Leave Game
          </button>
        </div>
      )}

      {screen === 'finished' && (
        <div className="screen">
          <h1>♟️ CHECKERS</h1>
          
          <div className="winner-message">
            {gameState?.winner === playerId ? '🎉 VICTORY!' : '💥 DEFEATED'}
          </div>
          
          {gameState?.winner === playerId && gameState?.pointsEarned && (
            <div style={{
              textAlign: 'center',
              padding: '15px',
              margin: '10px 0',
              background: 'rgba(0, 255, 157, 0.2)',
              border: '2px solid #00ff9d',
              borderRadius: '12px'
            }}>
              <div style={{fontSize: '1.5em', fontFamily: 'Orbitron', fontWeight: '700', color: '#00ff9d', textShadow: '0 0 10px #00ff9d'}}>
                +{gameState.pointsEarned} POINTS
              </div>
              <div style={{fontSize: '0.8em', color: '#00c2ff', marginTop: '5px'}}>
                {gameState.players[playerId].captures || 0} captures • {gameState.players[playerId].kingsCreated || 0} kings
              </div>
            </div>
          )}
          
          <div className="scoreboard">
            {Object.entries(gameState?.players || {}).map(([id, player]) => {
              const isYou = id === playerId;
              const stats = isYou ? playerStats : opponentStats;
              
              return (
                <div key={id} className="score-item">
                  <div>
                    <span className={isYou ? 'score-you' : 'score-opponent'}>
                      {player.name}: {player.wins || 0} {player.wins === 1 ? 'win' : 'wins'}
                    </span>
                    <div style={{fontSize: '0.75em', marginTop: '3px'}}>
                      Session: {player.points || 0} pts
                    </div>
                  </div>
                  {stats.wins + stats.losses > 0 && (
                    <div style={{fontSize: '0.7em', opacity: 0.8, textAlign: 'right'}}>
                      Lifetime<br/>
                      {stats.wins}W - {stats.losses}L<br/>
                      {stats.points || 0} pts
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <p className="info-text">
            {gameState?.winner === playerId 
              ? 'You captured all opponent pieces or blocked all moves!'
              : 'Your pieces were all captured or blocked!'}
          </p>
          
          {gameState?.host === playerId ? (
            <button onClick={playAgain}>
              Play Again
            </button>
          ) : (
            <p className="info-text">Waiting for host to start next round...</p>
          )}
          
          <button className="secondary" onClick={leaveGame}>
            Leave Game
          </button>
        </div>
      )}

      {/* Admin Panel */}
      {showAdmin && !adminAuthenticated && (
        <div className="screen">
          <h1>🔐 ADMIN PANEL</h1>
          <p className="subtitle">Enter Password</p>
          
          <div className="input-group">
            <label>Admin Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && authenticateAdmin()}
            />
          </div>
          
          <button onClick={authenticateAdmin}>Login</button>
          <button className="secondary" onClick={() => setShowAdmin(false)}>
            Back to Game
          </button>
        </div>
      )}

      {showAdmin && adminAuthenticated && (
        <div className="screen" style={{maxWidth: '800px'}}>
          <h1>🔐 ADMIN PANEL</h1>
          <p className="subtitle">Player Account Recovery</p>
          
          <div className="input-group">
            <label>Search Player by Name</label>
            <div style={{display: 'flex', gap: '10px'}}>
              <input
                type="text"
                placeholder="Enter player name"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchPlayers()}
                style={{flex: 1}}
              />
              <button onClick={searchPlayers} style={{width: 'auto', padding: '12px 20px'}}>
                Search
              </button>
            </div>
          </div>
          
          {adminSearchResults.length > 0 && (
            <div style={{marginTop: '20px'}}>
              <label>Search Results ({adminSearchResults.length})</label>
              <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                {adminSearchResults.map((player) => (
                  <div key={player.key} className="admin-player-card">
                    <div className="admin-player-info">
                      <div className="admin-player-name">{player.name}</div>
                      <div className="admin-player-stats">
                        Stats: {player.wins}W - {player.losses}L • {player.points || 0} pts
                      </div>
                      <div className="admin-player-meta">
                        Last Played: {player.lastPlayed ? new Date(player.lastPlayed).toLocaleDateString() : 'Never'}
                        {' '}({player.daysInactive} days ago)
                      </div>
                      <div className="admin-player-meta" style={{fontSize: '0.7em', opacity: 0.6}}>
                        Key: {player.key}
                      </div>
                    </div>
                    <button 
                      onClick={() => generateRestoreLink(player.key, player.name)}
                      style={{width: 'auto', padding: '10px 20px', fontSize: '0.9em'}}
                    >
                      Generate Restore Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {adminSearchResults.length === 0 && adminSearch && (
            <p className="info-text">No players found matching "{adminSearch}"</p>
          )}
          
          <div style={{marginTop: '30px', padding: '15px', background: 'rgba(0, 194, 255, 0.1)', border: '1px solid #00c2ff', borderRadius: '8px'}}>
            <div style={{fontSize: '0.85em', color: '#00c2ff', marginBottom: '10px'}}>
              <strong>How to use:</strong>
            </div>
            <div style={{fontSize: '0.75em', color: '#00ff9d', lineHeight: '1.6'}}>
              1. Search for player by name<br/>
              2. Click "Generate Restore Link"<br/>
              3. Link is copied to clipboard<br/>
              4. Send link to user<br/>
              5. User clicks link → Account restored!<br/>
              <br/>
              <em>Links expire in 24 hours and can only be used once.</em>
            </div>
          </div>
          
          <button 
            className="secondary" 
            onClick={() => {
              setAdminAuthenticated(false);
              setShowAdmin(false);
              setAdminSearchResults([]);
              setAdminSearch('');
            }}
            style={{marginTop: '20px'}}
          >
            Logout & Back to Game
          </button>
        </div>
      )}
    </div>
  );
};

ReactDOM.render(<CheckersGame />, document.getElementById('root'));
