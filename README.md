# Sprite-Packer Web 🎮

[![Live Demo](https://img.shields.io/badge/Live_Demo-Play_Now-success?style=for-the-badge)](https://cadakerem.github.io/sprite-packer-web/)

A modern, browser-based Sprite Sheet packing tool designed specifically for game developers. Drag and drop your loose PNG animation frames, pack them efficiently using the MaxRects algorithm, and export the generated Sprite Sheet and coordinate JSON metadata instantly—all without a server.

## Features ✨
- **100% Client-Side:** No servers, no uploads. Everything processes securely and instantly in your browser using HTML5 Canvas.
- **Drag & Drop Interface:** Upload images natively by dropping them into the app.
- **MaxRects Packing Algorithm:** Industry-standard bin packing that eliminates wasted transparent space.
- **Auto-Size (Tight Fit):** Automatically calculates the smallest possible bounding box and crops the final Canvas to fit perfectly.
- **Live Canvas Preview & Zoom:** Real-time visualization of the packed sprite sheet on a checkerboard background to inspect padding.
- **Game Engine Ready Export:** Downloads both the `spritesheet.png` and a `.json` file containing precise X/Y coordinates for engines like MonoGame, Unity, and Godot.

## How to Use
1. Visit the [Live Site](https://cadakerem.github.io/sprite-packer-web/).
2. Drag and drop your individual sprite/animation frames into the central dropzone.
3. Adjust the `Padding` if you need spacing between sprites to prevent bleeding.
4. Keep `AUTO-SIZE CANVAS` checked for the best fit, or uncheck it to force a custom Power-of-Two (POT) resolution.
5. Click **EXPORT SPRITESHEET** to get your `.png` and `.json`.

## 🛠 Tech Stack
- **React 19**
- **TypeScript**
- **Vite**
- **HTML5 Canvas** (for all rendering and image processing)

## 📝 License
This project is licensed under the [MIT License](LICENSE).

## Local Development
```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build
```
