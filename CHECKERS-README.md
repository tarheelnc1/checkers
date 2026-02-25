# ♟️ Checkers - Multiplayer Game

A real-time multiplayer checkers game with all the features you loved from Grid Hunter!

---

## 🎮 Features

### Core Gameplay
- **8×8 Standard Checkers** - Classic American rules
- **Turn-Based Strategy** - Red moves first
- **Forced Captures** - Must jump when possible
- **King Promotion** - Reach opposite end to become king
- **Multi-Jump Chains** - Continue jumping in one turn
- **Win Detection** - Capture all pieces or block all moves

### Multiplayer System
- ✅ **Unique Player Names** - Token-based identity
- ✅ **Game Codes** - Easy 6-character lobby codes
- ✅ **Shareable Links** - One-click join with code in URL
- ✅ **Rejoin After Disconnect** - Resume your game
- ✅ **Admin Recovery Panel** - Restore lost accounts
- ✅ **30-Day Name Reclaim** - Auto-reclaim inactive names

### Stats & Progression
- ✅ **Lifetime Stats** - Wins, losses, points tracked forever
- ✅ **Session Scores** - Track performance in current game
- ✅ **Point System** - Rewards for captures, kings, efficiency
- ✅ **Win Bonuses** - More points for pieces remaining

---

## 🔧 Setup

### Requirements
- Firebase account (free tier works!)
- Web hosting (Netlify, Vercel, GitHub Pages, etc.)

### Step 1: Firebase Setup

**You're already done!** This game uses the **same Firebase project** as Grid Hunter:
```
Database: https://gridhunter-default-rtdb.firebaseio.com
Project: gridhunter
```

The game stores data in separate paths:
- `checkers_games/` - Active games
- `checkers_playerStats/` - Player lifetime stats
- `restoreTokens/` - Shared admin recovery (works for both games)

**No additional Firebase setup needed!** ✅

---

### Step 2: Deploy the Game

**Files You Need:**
1. `checkers.html` - HTML wrapper
2. `checkers.jsx` - Game component

**Option A: Netlify (Recommended)**
1. Drag folder into Netlify Drop
2. Done! Get instant URL

**Option B: Local Testing**
1. Use VS Code Live Server
2. Or: `python3 -m http.server 8000`
3. Open: `http://localhost:8000/checkers.html`

**Option C: Other Hosts**
- Vercel: Deploy via CLI or GitHub
- GitHub Pages: Push to repo, enable Pages
- Any static host works!

---

## 🎯 Point System

### Formula
```
Base Win: 100 points
+ Pieces Remaining × 10 points
+ Captures Made × 5 points  
+ Kings Created × 15 points
```

### Examples
**Dominant Win:**
- 10 pieces remaining
- 12 captures
- 3 kings created
- **Total: 100 + 100 + 60 + 45 = 305 points** 🔥

**Close Win:**
- 3 pieces remaining
- 9 captures
- 1 king created
- **Total: 100 + 30 + 45 + 15 = 190 points**

**Narrow Victory:**
- 1 piece remaining
- 11 captures
- 0 kings
- **Total: 100 + 10 + 55 + 0 = 165 points**

---

## 🕹️ How to Play

### Setup
1. **Player 1:** Create game → Get code (e.g., ABC123)
2. **Player 2:** Enter code → Join
3. **Player 1:** Click "Start Game"

### Rules
- **🔴 Red pieces (bottom)** - Moves first
- **⚫ Black pieces (top)** - Moves second
- **Move diagonally forward** - Regular pieces
- **Kings move both ways** - After reaching opposite end
- **Must capture** - If jump is available, you MUST take it
- **Multi-jumps** - Can chain multiple jumps in one turn
- **Win by:** Capturing all opponent pieces OR blocking all moves

### Controls
- **Click piece** - Select it (highlights valid moves)
- **Click blue dot** - Move to that square
- **Multi-jump** - After jumping, continue with same piece

---

## 👥 Player System

### Unique Names
- Each name can only be used by one person
- Protected by browser token
- Example: Only one "Alex" can exist

### Name Reclaim
- Inactive for 30+ days → Anyone can reclaim
- Shows existing stats before reclaim
- Keeps stats when reclaimed

### Admin Recovery
- Lost access? Admin generates restore link
- 24-hour expiration
- One-time use
- Restores name + stats to new device

---

## 🔐 Admin Panel

### Access
- Click "Admin Access" on menu
- Default password: `checkers2025`
- **Change this!** Edit line 20 in `checkers.jsx`

### Features
- Search players by name
- Generate restore links
- View player stats
- Last played dates

### Usage
1. User loses access to "Alex"
2. Admin searches "Alex"
3. Click "Generate Restore Link"
4. Send link to user
5. User clicks → Account restored!

---

## 📊 Database Structure

### Games (`checkers_games/`)
```javascript
{
  "gameId123": {
    "code": "ABC123",
    "host": "playerId1",
    "phase": "playing",
    "currentTurn": "playerId1",
    "board": [...],  // 8x8 array
    "players": {
      "playerId1": {
        "name": "Alex",
        "color": "red",
        "wins": 2,
        "points": 485,
        "captures": 8,
        "kingsCreated": 2
      },
      "playerId2": {
        "name": "Jordan",
        "color": "black",
        "wins": 1,
        "points": 220
      }
    }
  }
}
```

### Player Stats (`checkers_playerStats/`)
```javascript
{
  "alex": {
    "name": "Alex",
    "wins": 15,
    "losses": 8,
    "points": 3420,
    "token": "abc123...",
    "lastPlayed": 1736467200000,
    "createdAt": 1736380800000
  }
}
```

---

## 🎨 Customization

### Colors
Find these in the `<style>` section:

**Primary Colors:**
- Main green: `#00ff9d`
- Accent blue: `#00c2ff`
- Background: `#0a0e27`

**Checkers Board:**
- Light squares: `#e8d4b8`
- Dark squares: `#8b4513`
- Red pieces: `#ff6b6b` → `#c92a2a`
- Black pieces: `#495057` → `#212529`

### Admin Password
Line 20 in `checkers.jsx`:
```javascript
const ADMIN_PASSWORD = 'checkers2025'; // Change this!
```

---

## 🚀 Deployment Guide

### Same Domain as Grid Hunter
```
your-site.com/
├── index.html          (Grid Hunter)
├── grid-hunter.jsx
├── checkers.html       (Checkers)
└── checkers.jsx
```

Navigate:
- `your-site.com/` → Grid Hunter
- `your-site.com/checkers.html` → Checkers

### Separate Domain
Deploy each game to its own URL:
- `gridhunter.com` → Grid Hunter
- `checkers.com` → Checkers

Both can still use the same Firebase database!

---

## 🔧 Troubleshooting

### "Game not found"
- Check game code is correct (6 characters)
- Game may have been deleted
- Try creating a new game

### Can't rejoin after disconnect
- Check browser didn't clear localStorage
- Try using admin restore link
- Ensure using same browser/device

### Name already taken
- Someone else owns that name
- Try different name
- Check if it's your name on different device (use admin restore)

### Admin panel not working
- Check password is correct
- Look in browser console for errors
- Ensure Firebase connection working

---

## 📱 Mobile Support

Fully responsive! Works on:
- ✅ Desktop browsers
- ✅ Mobile phones
- ✅ Tablets
- ✅ Any device with modern browser

Board automatically resizes for smaller screens.

---

## 🎯 Advanced Features

### Forced Capture
Game automatically restricts moves when jumps are available:
- If ANY piece can jump → ONLY jump moves allowed
- Can't make regular move if jump exists
- Follows standard checkers rules

### Multi-Jump
After jumping once:
- If another jump available with same piece → Continue
- Game keeps your turn until no more jumps
- All jumps must be taken

### King Mechanics
- Red: Reaches row 0 → Becomes king
- Black: Reaches row 7 → Becomes king
- Kings move forward AND backward
- Kings can multi-jump in any direction

---

## 🌟 Future Enhancements

Potential additions:
- **Time Controls** - Optional turn timers
- **Undo Move** - Take back last move
- **Move History** - View all moves made
- **Spectator Mode** - Watch games
- **Tournaments** - Bracket system
- **Rankings** - Global leaderboards
- **Themes** - Different board colors
- **Variants** - International checkers rules

---

## 🔗 Integration with Grid Hunter

Both games share:
- ✅ Same Firebase project
- ✅ Same admin restore system
- ✅ Similar UI/UX design
- ✅ Same deployment process

Separate:
- ❌ Player identities (different names)
- ❌ Stats tracking (separate leaderboards)
- ❌ Game sessions (can't join Grid Hunter game from Checkers)

**Why separate identities?**
- Clean separation of games
- Prevents confusion
- Can add unified system later if desired

---

## 📞 Support

### For Players
1. Lost name access? → Contact admin for restore link
2. Bug/issue? → Contact game host
3. Can't join? → Check game code, try new game

### For Admins
1. Access admin panel via "Admin Access"
2. Search player by name
3. Generate restore link
4. Send to user within 24 hours

---

## 🎉 Ready to Play!

Your Checkers game is ready to deploy! Same Firebase, same features, new game.

**Quick Start:**
1. Download both files (`checkers.html` + `checkers.jsx`)
2. Deploy to any host (Netlify recommended)
3. Share URL with friends
4. Start playing! ♟️

---

Enjoy your multiplayer Checkers game! 🎮✨
