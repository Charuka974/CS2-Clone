CS2 Web Browser Game

A lightweight, browser-based tactical shooter prototype inspired by CS2, built using
HTML5, JavaScript (Three.js), and CSS3.
Three.js WebGL GLTF/GLB Frontend Only

1. Project Overview
This project implements a 3D environment where players can control a simple
character, interact with animated enemies, and navigate a tactical map. It focuses on
high performance and low-latency input handling directly in the browser.

2. Technical Stack
Engine: Three.js (WebGL Wrapper)
Models: GLB/GLTF (converted from FBX/Blend)
Animations: NLA (Non-Linear Animation) strips for Walk and Action states
Styling: CSS3 for HUD (Heads-Up Display) and UI overlays

3. Asset Pipeline
To ensure the game runs smoothly, assets must follow this pipeline:
Source: character.blend / FBX.fbx
Animation: Pushed to NLA Strips in Blender (Walk, MoveHands).
Export: Exported as .glb with Group by NLA Track enabled.
Loading: Loaded via GLTFLoader in the main JS loop.
•
•
•
•

1.
2.
3.
4.

4. Directory Structure

/root
├── index.html # Main game entry point
├── style.css # Game UI and Crosshair styling
├── main.js # Game loop and Three.js initialization
├── /assets
│ └── character.glb # Animated character model
│ └── map.glb # Level geometry
└── /js
└── Player.js # Movement logic
└── Enemy.js # AI and Animation state machine

5. Controls

[W, A, S, D] -> Move Character
[Space] -> Trigger Hand Animation / Interaction
[Mouse] -> Look Around (Pointer Lock API)
[Left Click] -> Primary Action

6. Setup Instructions
To run this project locally without CORS issues:
Clone the repository.
Open a terminal in the project folder.
Run a local server: npx serve or python -m http.server .
Navigate to http://localhost:8000 in your browser.
1.
2.
3.
4.

7. Key Implementation Details
Animation Controller
The character uses an AnimationMixer to blend between states. Specifically, the hand
movement is triggered as a LoopOnce action to allow for specific interactions (waving/
reloading) while maintaining the walking gait.