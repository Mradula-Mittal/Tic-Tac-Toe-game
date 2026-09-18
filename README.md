# Launch Your Web-Based Video Game with AI 🎮 🚀

> Interactive workshop presentation and code architecture guide for building and deploying a turn-based multiplayer game using **Google AI Studio Build Mode**, **Firebase (Auth & Firestore)**, and **Cloud Run**.

Based on the Google Developer Codelab: [Launch your web-based video game with AI](https://codelabs.developers.google.com/codelabs/cloud-run/launch-your-web-based-video-game-with-ai).

---

## 📌 Repository Overview

This repository contains the interactive presentation slides, core code patterns, architecture notes, and troubleshooting cheat sheets for running a hands-on developer workshop. 

### Key Topics Covered:
1. **Event Sourcing Pattern:** Storing moves as immutable append-only Firestore events (`games/{id}/events`) rather than overwriting mutable board snapshots. Enables instant time-travel and move-by-move match replay.
2. **Deterministic Minimax Algorithm:** Implementing client-side game-tree search for the AI bot rather than burning external LLM tokens or introducing API latency.
3. **Google AI Studio Build Mode:** Guiding the AI agent with prompt engineering, live inline debugging with the "Fix" loop, and 1-click Firebase provisioning.
4. **Serverless Deployment with Cloud Run:** Containerizing and shipping live multiplayer rooms with free `.ai.studio` subdomains.

---

## 📂 Repository Contents

```plaintext
.
├── turn_based_game_workshop.html   # Standalone, interactive HTML/CSS presentation slides
└── README.md                       # Workshop instructions, architecture overview & troubleshooting
```

---

## 🚀 Running the Presentation Slides

The presentation file (`turn_based_game_workshop.html`) is completely self-contained with no external build tools required.

### Quick Start:
1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   cd <repo-name>
   ```
2. Open `turn_based_game_workshop.html` in any modern web browser:
   * **macOS:** `open turn_based_game_workshop.html`
   * **Linux:** `xdg-open turn_based_game_workshop.html`
   * **Windows:** `start turn_based_game_workshop.html`
3. *(Optional)* Host via **GitHub Pages**:
   * Navigate to **Settings** > **Pages**.
   * Under **Branch**, select `main` (or root) and save.
   * Your slides will be live at `https://<your-username>.github.io/<repo-name>/turn_based_game_workshop.html`.

---

## 🧠 Core Architecture Patterns

### 1. Event Sourcing Schema (Firestore)
Instead of updating a single document, each turn is appended to a subcollection:
```typescript
interface GameEvent {
  turn: number;         // 1, 2, 3...
  player: 'X' | 'O';    // Active player
  cellIndex: number;    // Board index (0-8)
  createdAt: number;
}
```

State reconstruction is a deterministic reduction of historical events:
```typescript
function computeBoard(events: GameEvent[]) {
  const board = Array(9).fill(null);
  events.forEach(evt => {
    board[evt.cellIndex] = evt.player;
  });
  const activePlayer = events.length % 2 === 0 ? 'X' : 'O';
  return { board, activePlayer };
}
```

### 2. Minimax AI Opponent
Ensures 0 latency and 0 LLM token costs by running locally on the client:
```typescript
function minimax(board: (string | null)[], depth: number, isMax: boolean): number {
  const score = evalTerminal(board, depth);
  if (score !== null) return score;

  let best = isMax ? -Infinity : Infinity;
  for (const idx of getEmpty(board)) {
    board[idx] = isMax ? 'O' : 'X';
    const res = minimax(board, depth + 1, !isMax);
    board[idx] = null; // Backtrack
    best = isMax ? Math.max(best, res) : Math.min(best, res);
  }
  return best;
}
```

---

## ⚠️ Live Workshop Troubleshooting Cheat Sheet

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Workspace Policy Block** | Google Workspace / Education account disables AI Studio experimental features. | Use a personal `@gmail.com` account. |
| **Auth Popup Blocked** | Browser blocks third-party cookies or popup windows in preview iframes. | Allow popups for `aistudio.google.com` or open preview in a new tab. |
| **Firestore `PERMISSION_DENIED`** | Default security rules require player UID before room creation completes. | Click the AI Studio **"Fix"** button to adjust `firestore.rules`. |
| **Laggy AI Opponent** | The model generated Gemini API calls for bot moves instead of code logic. | Prompt the model: *"Refactor AI opponent to use client-side Minimax without external API calls."* |

---

## 📄 License
MIT License. Feel free to use and adapt these slides and templates for your own workshops and talks.
