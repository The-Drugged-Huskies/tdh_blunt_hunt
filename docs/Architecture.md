# Architecture Documentation

**Project:** TDH_BLUNT_HUNT
**Version:** v0.70

## 1. System Overview

"Blunt Hunt" is a browser-based arcade game built with Vanilla JavaScript and HTML5 Canvas. It uses a **Hybrid UI Architecture**:

- **Game World:** Rendered on an HTML5 `<canvas>` (320x240 resolution, scaled up via CSS).
- **User Interface:** Rendered using standard HTML DOM elements overlaying the canvas.

This approach ensures sharp pixel-art rendering for gameplay while allowing accessible, CSS-styled UI elements for menus and HUDs.

## 2. File Structure

### Backend (Python/Flask)

- `app.py`: Entry point. Serves the static files and handles API routes (e.g. `/api/highscore`).

### Frontend (static/js)

- **`game.js`**: The core engine.
  - Manages the Game Loop (`requestAnimationFrame`).
  - Handles State (`MENU`, `PLAYING`, `GAMEOVER`).
  - Coordinations Entities (`Slingshot`, `Husky`, `Blunt`).
- **`WalletManager.js`**: Handles MetaMask connection, network switching, and account events.
- **`LeaderboardService.js`**: Handles all Smart Contract interactions (Read/Write).
- **`wallet.js`**: (Controller) Bridges the Game, DOM, and Services (`WalletManager`, `LeaderboardService`).
- **`config.js`**: Central configuration (Contract Address, RPC, Chain ID).
- **`audio.js`**: Sound effects and music management.
- **`entities/`**: Logic for individual game objects.

### UI & Styling

- **`templates/index.html`**: The main container. Contains the `<canvas>` and all UI overlays (`#start-screen`, `#game-over-screen`, `#nes-hud`).
- **`static/css/style.css`**: Styles for the retro NES aesthetic. Uses pixel fonts and absolute positioning to align HTML elements over the canvas.

## 3. Game Loop Lifecycle

1. **Initialization**: `window.onload` triggers `AssetLoader`.
2. **Menu State**: The game initializes in `MENU` state. HTML overlays are visible. Canvas draws the background.
3. **Input**: User clicks "Start".
4. **Playing State**:
    - HTML Menu hides. HTML HUD shows.
    - Game Loop updates Physics (Entities).
    - Canvas redraws frame (~60 FPS).
5. **Game Over**: Loop stops or switches state. HTML Game Over screen appears.

## 4. Key Design Decisions

### Resolution Independence

The internal game logic operates on a fixed 320x240 coordinate system (NES standard). The browser scales this canvas to fit the user's screen (maintaining aspect ratio), ensuring pixel-art fidelity.

### DOM-Based UI

We chose DOM-based UI for this version to leverage standard CSS for:

- Text wrapping and layout.
- Input fields (if needed).
- Accessibility.
- Easy styling changes without recompiling the canvas render logic.

## 5. Future Considerations

For future iterations (v2.0), transitioning to a **Pure Canvas UI** involves:

1. Implementing a GUI rendering system inside `game.js`.
2. Removing HTML overlays.
3. Routing all click events through the Canvas coordinate mapper.
