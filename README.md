# Blockly Desktop

A powerful, visual programming environment built with **Blockly**, designed for AI education, computer vision, and hands-on robotics. This application provides a desktop-first experience powered by **Electron** and **Next.js**, allowing users to create complex AI-driven programs without writing code manually.

## 🚀 Key Features

- **Visual Programming**: Interactive Blockly workspace with custom blocks for advanced logic.
- **AI & Deep Learning**:
  - **Teachable Machine**: Real-time image and audio classification.
  - **MediaPipe Integration**: Finger landmark detection, hand tracking, and facial feature analysis (pose, expression, gender, and age detection).
  - **Object Detection**: Integrated COCO-SSD for identifying everyday objects via webcam.
- **Computer Vision**: OpenCV.js support for image manipulation, drawing, and resizing within blocks.
- **Integrated Education**:
  - Built-in tutorial system with step-by-step guidance.
  - Support for PDF resources and video tutorials mapped to specific activities.
- **Local Persistence**: SQLite database for managing users, projects, and tutorial progress locally.
- **System Capabilities**: File handling (read/write), Serial communication for hardware, and Speech synthesis.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (Version 16.x), React 19, [Tailwind CSS 4](https://tailwindcss.com/)
- **Desktop Wrapper**: [Electron](https://www.electronjs.org/)
- **Database**: [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)
- **Logic & Execution**: [Blockly](https://developers.google.com/blockly), [Skulpt](https://skulpt.org/) (Python in JS)
- **AI Libraries**: TensorFlow.js, MediaPipe, OpenCV.js, Face-API.js

## 🧪 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

- **Development Build (Next.js + Electron)**:
  ```bash
   npm run electron-dev
  ```
  This command starts the Next.js dev server and launches Electron concurrently.

- **Standalone Web Preview**:
  ```bash
  npm run dev
  ```

- **Production Build**:
  ```bash
  npm run build
  ```
  *Note: This runs a custom script to download necessary AI models and assets for offline use.*

## 📂 Project Structure

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable React components (UI via Radix, Navigation, etc.).
- `electron.js`: Main process for Electron-specific logic and IPC handlers.
- `download_scripts.mjs`: Utility to fetch AI models and Blockly assets.
- `database.sqlite`: Local storage for the application.
- `public/`: Static assets including images and downloaded JS libraries.

## 📜 Available Scripts

- `npm run electron`: Start the Electron app (assumes Next.js is already running or built).
- `npm run dist`: Build and package the application for distribution using `electron-builder`.

---

© 2026 Blockly Desktop Team. All Rights Reserved.
