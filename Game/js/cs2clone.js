import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
    createBackground,
    createMap
} from './gameBackground.js';
import {
    createMuzzleFlash,
    createBulletTracer,
    ejectShell,
    applyWeaponKickback,
    setWeaponContext,
    updateCurrentWeapon
} from './weaponBehaviour.js';

// Expose startGame to HTML buttons
async function startGame(mode) {
    gameMode = mode;
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('loadingScreen').style.display = 'flex';

    try {
        initThreeJS();
        initPhysics();
        createBackground(scene, world);
        createMap(scene, world);

        // Load weapon models
        rifleModel = await loadWeaponModel('M4a1', 'M4a1', 0.2, RIFLE_HIP_POS, new THREE.Euler(0, 0, 0));
        pistolModel = await loadWeaponModel('Glock18', 'Glock18', 0.12, PISTOL_HIP_POS, new THREE.Euler(0, 0, 0));

        if (rifleModel) {
            rifleModel.visible = true;
            camera.add(rifleModel);
            // === APPLY SKIN ===
            changeWeaponSkin(rifleModel, '/Game/assets/skins/skin2.jpg'); // Change to your skin
        }

        if (pistolModel) {
            pistolModel.visible = false;
            camera.add(pistolModel);
            // === APPLY SKIN ===
            changeWeaponSkin(pistolModel, '/Game/assets/skins/skin1.jpg'); // Change to your skin
        }

        // ADD THIS BLOCK
        setWeaponContext({
            scene: scene,
            camera: camera,
            rifleModel: rifleModel,
            pistolModel: pistolModel,
            currentWeapon: currentWeapon
        });

        initControls();

        if (mode === 'singleplayer') {
            spawnBots(5);
            startGameplay();
        } else {
            await initMultiplayer();
        }
    } catch (error) {
        console.error("Game initialization failed:", error);
        alert("Failed to start game. Check console (F12) for details.");
        document.getElementById('loadingScreen').style.display = 'none';
    }
};
window.startGame = startGame;

// ============================================================================
// GLOBAL GAME STATE
// ============================================================================

let scene, camera, renderer, world;
let playerBody, playerMesh;
let currentWeapon = 'rifle'; // 'rifle' or 'pistol'
let rifleModel, pistolModel;
let gameMode = null; // 'singleplayer' or 'multiplayer'
let isPointerLocked = false;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isSprinting = false, isCrouching = false;
let canJump = true;
let playerHealth = 100;
let rifleAmmo = 30, rifleReserve = 100000;
let pistolAmmo = 17, pistolReserve = 100000;
let isReloading = false;
let bots = [];
let multiplayerPlayers = new Map();
let localPlayerId = null;
let isAiming = false;

let lastShotTime = 0;
const RIFLE_FIRE_RATE = 80;   // milliseconds between shots (lower = faster)
const PISTOL_FIRE_RATE = 250;

let isMouseDown = false;

const PLAYER_HEIGHT = 1.8;
const CROUCH_HEIGHT = 1.2;
const MOVE_SPEED = 20;
const SPRINT_SPEED = 30;
const CROUCH_SPEED = 5;
const JUMP_FORCE = 8;

// ============================================================================
// WEAPON POSITIONS
// ============================================================================
// Rifle
const RIFLE_HIP_POS = new THREE.Vector3(0.32, -0.28, -0.70);
const RIFLE_HIP_ROT = new THREE.Euler(0, 0, 0);
const RIFLE_AIM_POS = new THREE.Vector3(0.0, -0.40, -1.0);
const RIFLE_AIM_ROT = new THREE.Euler(0, 0, 0);
// Pistol
const PISTOL_HIP_POS = new THREE.Vector3(0.32, -0.28, -0.55);
const PISTOL_HIP_ROT = new THREE.Euler(0, 0, 0);
const PISTOL_AIM_POS = new THREE.Vector3(0.0, -0.24, -0.40);
const PISTOL_AIM_ROT = new THREE.Euler(0, 0, 0);

const textureLoader = new THREE.TextureLoader();

// Movement state
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Mouse movement
let mouseX = 0, mouseY = 0;
const rotationSpeed = 0.002;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 12, 0);

    // ADD THIS LINE: Without this, weapons attached to the camera will be invisible!
    scene.add(camera);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('gameCanvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    scene.add(sunLight);

    // Window resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}


function loadWeaponModel(folderName, fileName, scale, position, rotation) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        // Path to your .glb file
        const path = `/Game/assets/3dmodals/${folderName}/${fileName}.glb`;

        loader.load(path, (gltf) => {
            const model = gltf.scene;

            // Apply scaling, positioning, and rotation
            model.scale.set(scale, scale, scale);
            model.position.copy(position);

            // If you passed a THREE.Euler or Vector3 for rotation
            if (rotation) {
                model.rotation.set(rotation.x, rotation.y, rotation.z);
            }

            // Optional: Enable shadows for a more realistic CS2 look
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            resolve(model); // Returns the loaded 3D object
        },
            (xhr) => {
                console.log(`${fileName}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error(`Error loading ${fileName}:`, error);
                reject(error);
            });
    });
}

function changeWeaponSkin(model, skinUrl) {
    if (!model) return;

    textureLoader.load(skinUrl, (texture) => {
        texture.flipY = false;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Sharper texture

        model.traverse((node) => {
            if (node.isMesh && node.material) {

                // Handle both single material and multi-material models
                const materials = Array.isArray(node.material) ? node.material : [node.material];

                materials.forEach(mat => {
                    if (mat.map) {
                        mat.map = texture;           // Main color texture
                    } else {
                        mat.color.set(0xffffff);     // Fallback
                        mat.map = texture;
                    }

                    // Make it look metallic & premium (CS2 style)
                    mat.metalness = 0.7;
                    mat.roughness = 0.4;

                    // Optional: If your skin has normal map, you can add it later
                    mat.needsUpdate = true;
                });
            }
        });

        console.log(`Skin applied: ${skinUrl}`);
    }, undefined, (err) => {
        console.error("Failed to load skin:", skinUrl, err);
    });
}

function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -20, 0);
    world.solver.iterations = 10;

    // Create a slippery material for the player
    const playerMat = new CANNON.Material("playerMaterial");
    const groundMat = new CANNON.Material("groundMaterial");
    const contact = new CANNON.ContactMaterial(playerMat, groundMat, {
        friction: 0.0, // Essential for smooth movement
        restitution: 0.0
    });
    world.addContactMaterial(contact);

    const playerShape = new CANNON.Cylinder(0.5, 0.5, PLAYER_HEIGHT, 8);
    playerBody = new CANNON.Body({
        mass: 80,
        position: new CANNON.Vec3(0, 10, 0),
        shape: playerShape,
        material: playerMat // Apply the slippery material
    });

    playerBody.fixedRotation = true;
    playerBody.updateMassProperties();
    world.addBody(playerBody);
}

// ============================================================================
// WEAPON MODELS (Procedural Low-Poly)
// ============================================================================

function createRifleModel() {
    const rifle = new THREE.Group();

    // Body
    const bodyGeom = new THREE.BoxGeometry(0.1, 0.1, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    rifle.add(body);

    // Barrel
    const barrelGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const barrel = new THREE.Mesh(barrelGeom, barrelMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.6);
    barrel.castShadow = true;
    rifle.add(barrel);

    // Stock
    const stockGeom = new THREE.BoxGeometry(0.08, 0.08, 0.3);
    const stock = new THREE.Mesh(stockGeom, bodyMat);
    stock.position.set(0, 0, 0.5);
    stock.castShadow = true;
    rifle.add(stock);

    // Magazine
    const magGeom = new THREE.BoxGeometry(0.06, 0.15, 0.2);
    const magMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
    const mag = new THREE.Mesh(magGeom, magMat);
    mag.position.set(0, -0.1, -0.1);
    mag.castShadow = true;
    rifle.add(mag);

    // Grip
    const gripGeom = new THREE.BoxGeometry(0.05, 0.12, 0.08);
    const grip = new THREE.Mesh(gripGeom, bodyMat);
    grip.position.set(0, -0.08, 0.1);
    grip.castShadow = true;
    rifle.add(grip);

    rifle.position.set(0.3, -0.3, -0.5);
    rifle.rotation.y = -0.1;

    return rifle;
}

function createPistolModel() {
    const pistol = new THREE.Group();

    // Slide
    const slideGeom = new THREE.BoxGeometry(0.08, 0.08, 0.35);
    const slideMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const slide = new THREE.Mesh(slideGeom, slideMat);
    slide.castShadow = true;
    pistol.add(slide);

    // Frame
    const frameGeom = new THREE.BoxGeometry(0.07, 0.1, 0.25);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.set(0, -0.05, 0.05);
    frame.castShadow = true;
    pistol.add(frame);

    // Barrel
    const barrelGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    const barrel = new THREE.Mesh(barrelGeom, barrelMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.25);
    barrel.castShadow = true;
    pistol.add(barrel);

    // Grip
    const gripGeom = new THREE.BoxGeometry(0.06, 0.15, 0.1);
    const grip = new THREE.Mesh(gripGeom, frameMat);
    grip.position.set(0, -0.12, 0.1);
    grip.castShadow = true;
    pistol.add(grip);

    pistol.position.set(0.25, -0.25, -0.4);
    pistol.rotation.y = -0.15;

    return pistol;
}


// ============================================================================
// BOT AI (Singleplayer)
// ============================================================================

class Bot {
    constructor(id) {
        this.id = id;
        this.health = 100;
        this.position = new THREE.Vector3(
            Math.random() * 80 - 40,
            2,
            Math.random() * 80 - 40
        );

        // Visual mesh
        const geometry = new THREE.BoxGeometry(1, PLAYER_HEIGHT, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Physics body
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, PLAYER_HEIGHT / 2, 0.5));
        this.body = new CANNON.Body({
            mass: 80,
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            shape: shape
        });
        world.addBody(this.body);

        this.lastShootTime = 0;
        this.shootInterval = 3000; // Shoot every 3 seconds
    }

    update(deltaTime) {
        if (this.health <= 0) return;

        // Move toward player with simple lerp
        const playerPos = playerBody.position;
        const botPos = this.body.position;
        const direction = new CANNON.Vec3(
            playerPos.x - botPos.x,
            0,
            playerPos.z - botPos.z
        );
        direction.normalize();

        const speed = 2;
        this.body.velocity.x = direction.x * speed;
        this.body.velocity.z = direction.z * speed;

        // Sync mesh with physics
        this.mesh.position.copy(this.body.position);

        // Shooting logic
        const now = Date.now();
        if (now - this.lastShootTime > this.shootInterval) {
            this.shoot();
            this.lastShootTime = now;
        }
    }

    shoot() {

        const origin = new THREE.Vector3(
            this.body.position.x,
            this.body.position.y + 1,
            this.body.position.z
        );

        const playerPos = new THREE.Vector3(
            playerBody.position.x,
            playerBody.position.y + 1,
            playerBody.position.z
        );

        const direction = playerPos
            .clone()
            .sub(origin)
            .normalize();

        const raycaster = new THREE.Raycaster(
            origin,
            direction,
            0,
            100
        );

        const allObjects =
            scene.children.concat(camera.children);

        const intersects =
            raycaster.intersectObjects(allObjects, true)
            .filter(intersect => {

                const obj = intersect.object;

                if (
                    rifleModel &&
                    (obj === rifleModel ||
                    rifleModel.children.includes(obj))
                ) return false;

                if (
                    pistolModel &&
                    (obj === pistolModel ||
                    pistolModel.children.includes(obj))
                ) return false;

                return true;
            });

        if (intersects.length > 0) {

            const hit = intersects[0];

            createMuzzleFlash(origin, direction);

            createBulletTracer(
                origin,
                hit.point
            );

            if (origin.distanceTo(playerPos) < 80) {
                damagePlayer(0);
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        scene.remove(this.mesh);
        world.removeBody(this.body);
        addKillFeedMessage('You', `Bot ${this.id}`);
    }
}

function spawnBots(count) {
    for (let i = 0; i < count; i++) {
        const bot = new Bot(i + 1);
        bots.push(bot);
    }
}

// ============================================================================
// MULTIPLAYER (Playroom Kit)
// ============================================================================

async function initMultiplayer() {
    document.getElementById('loadingScreen').style.display = 'flex';

    try {
        await Playroom.insertCoin({
            skipLobby: false,
            maxPlayersPerRoom: 8
        });

        const myPlayer = Playroom.myPlayer();
        localPlayerId = myPlayer.id;

        // Set initial state
        myPlayer.setState('position', { x: 0, y: 2, z: 0 });
        myPlayer.setState('rotation', 0);
        myPlayer.setState('health', 100);
        myPlayer.setState('isShooting', false);
        myPlayer.setState('isCrouching', false);

        // Listen for other players
        Playroom.onPlayerJoin((player) => {
            console.log('Player joined:', player.id);
            createRemotePlayer(player);
        });

        document.getElementById('loadingScreen').style.display = 'none';
        startGameplay();

    } catch (error) {
        console.error('Multiplayer initialization failed:', error);
        alert('Failed to connect to multiplayer. Starting singleplayer instead.');
        gameMode = 'singleplayer';
        document.getElementById('loadingScreen').style.display = 'none';
        startGameplay();
    }
}

function createRemotePlayer(player) {
    const geometry = new THREE.BoxGeometry(1, PLAYER_HEIGHT, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    scene.add(mesh);

    multiplayerPlayers.set(player.id, {
        player: player,
        mesh: mesh
    });

    // Listen for state changes
    player.onQuit(() => {
        scene.remove(mesh);
        multiplayerPlayers.delete(player.id);
    });
}

function updateMultiplayerState() {
    if (gameMode !== 'multiplayer') return;

    const myPlayer = Playroom.myPlayer();
    if (!myPlayer) return;

    // Update my position
    myPlayer.setState('position', {
        x: playerBody.position.x,
        y: playerBody.position.y,
        z: playerBody.position.z
    });
    myPlayer.setState('rotation', camera.rotation.y);
    myPlayer.setState('health', playerHealth);
    myPlayer.setState('isCrouching', isCrouching);

    // Update other players
    multiplayerPlayers.forEach((data, playerId) => {
        if (playerId === localPlayerId) return;

        const pos = data.player.getState('position');
        const rotation = data.player.getState('rotation');
        const health = data.player.getState('health');

        if (pos && data.mesh) {
            data.mesh.position.set(pos.x, pos.y, pos.z);
            data.mesh.rotation.y = rotation || 0;

            // Hide if dead
            data.mesh.visible = health > 0;
        }
    });
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

function initControls() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyD': moveRight = true; break;
            case 'ShiftLeft': isSprinting = true; break;
            case 'KeyC':
                isCrouching = !isCrouching;
                updateCameraHeight();
                break;
            case 'Space':
                if (canJump) {
                    playerBody.velocity.y = JUMP_FORCE;
                    canJump = false;
                }
                break;
            case 'KeyR':
                reload();
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyD': moveRight = false; break;
            case 'ShiftLeft': isSprinting = false; break;
        }
    });

    // Mouse
    document.addEventListener('click', () => {
        if (!isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isPointerLocked) return;

        mouseX -= e.movementX * rotationSpeed;
        mouseY -= e.movementY * rotationSpeed;
        mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseY));
    });

    // Mouse buttons
    // Mouse Down - Start Shooting
    document.addEventListener('mousedown', (e) => {
        if (!isPointerLocked) return;
        if (e.button === 0) {
            isMouseDown = true;
            shoot(); // First shot immediately
        } else if (e.button === 2) {
            isAiming = true;
            updateWeaponPosition();
        }
    });

    // Mouse Up - Stop Shooting
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            isMouseDown = false;
        } else if (e.button === 2) {
            isAiming = false;
            updateWeaponPosition();
        }
    });

    // Scroll wheel listener
    document.addEventListener('wheel', (e) => {
        if (!isPointerLocked) return;

        // e.deltaY is positive when scrolling down, negative when scrolling up
        if (e.deltaY > 0) {
            switchWeapon('next');
        } else {
            switchWeapon('prev');
        }
    }, { passive: true });

    // Prevent context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function updateCameraHeight() {
    const eyeHeight = isCrouching ? 1.0 : 1.6;

    camera.position.set(
        playerBody.position.x,
        playerBody.position.y + eyeHeight,
        playerBody.position.z
    );
}

// ============================================================================
// COMBAT SYSTEM (FULLY FIXED)
// ============================================================================

// ============================================================================
// COMBAT SYSTEM (FULLY FIXED)
// ============================================================================

function shoot() {

    // ============================================
    // BLOCK CONDITIONS
    // ============================================

    if (isReloading) return;

    const now = Date.now();

    const fireRate =
        currentWeapon === 'rifle'
            ? RIFLE_FIRE_RATE
            : PISTOL_FIRE_RATE;

    if (now - lastShotTime < fireRate) {
        return;
    }

    lastShotTime = now;

    // ============================================
    // CURRENT WEAPON
    // ============================================

    const weapon =
        currentWeapon === 'rifle'
            ? rifleModel
            : pistolModel;

    // ============================================
    // AMMO
    // ============================================

    const currentAmmo =
        currentWeapon === 'rifle'
            ? rifleAmmo
            : pistolAmmo;

    if (currentAmmo <= 0) {
        reload();
        return;
    }

    // REMOVE AMMO
    if (currentWeapon === 'rifle') {
        rifleAmmo--;
    } else {
        pistolAmmo--;
    }

    updateHUD();

    // ============================================
    // CAMERA DIRECTION
    // ============================================

    const shootDirection = new THREE.Vector3();

    camera.getWorldDirection(shootDirection);

    shootDirection.normalize();

    // ============================================
    // MUZZLE POSITION (FIXED)
    // ============================================

    // ============================================
    // MUZZLE POSITION (ADS FIXED)
    // ============================================

    const muzzlePos = new THREE.Vector3();

    camera.getWorldPosition(muzzlePos);

    // Camera vectors
    const right = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(camera.quaternion);

    const up = new THREE.Vector3(0, 1, 0)
        .applyQuaternion(camera.quaternion);

    const forward = shootDirection.clone();

    // ============================================
    // RIFLE
    // ============================================

    if (currentWeapon === 'rifle') {

        if (isAiming) {

            // CENTERED ADS
            muzzlePos
                .add(up.clone().multiplyScalar(-0.08))
                .add(forward.clone().multiplyScalar(0.95));

        } else {

            // HIP FIRE
            muzzlePos
                .add(right.clone().multiplyScalar(0.28))
                .add(up.clone().multiplyScalar(-0.04))
                .add(forward.clone().multiplyScalar(1.35));
        }
    }

    // ============================================
    // PISTOL
    // ============================================

    else {

        if (isAiming) {

            // SLIGHTLY HIGHER ADS
            muzzlePos
                .add(up.clone().multiplyScalar(-0.04))
                .add(forward.clone().multiplyScalar(0.65));

        } else {

            // HIP FIRE
            muzzlePos
                .add(right.clone().multiplyScalar(0.20))
                .add(up.clone().multiplyScalar(-0.05))
                .add(forward.clone().multiplyScalar(0.70));
        }
    }

    // ============================================
    // FX
    // ============================================

    createMuzzleFlash(
        muzzlePos,
        shootDirection,
        currentWeapon
    );

    ejectShell(
        weapon,
        currentWeapon
    );

    applyWeaponKickback(
        weapon,
        currentWeapon,
        updateWeaponPosition
    );

    // ============================================
    // RAYCAST
    // ============================================

    const raycaster = new THREE.Raycaster(
        camera.position,
        shootDirection,
        0,
        250
    );

    const intersects = raycaster
        .intersectObjects(scene.children, true)
        .filter(intersect => {

            let current = intersect.object;

            while (current) {

                // IGNORE PLAYER WEAPONS
                if (
                    current === rifleModel ||
                    current === pistolModel
                ) {
                    return false;
                }

                current = current.parent;
            }

            return true;
        });

    // ============================================
    // HIT
    // ============================================

    if (intersects.length > 0) {

        const hit = intersects[0];

        // IMPACT FX
        createImpactEffect(hit.point);

        // BULLET TRACER
        createBulletTracer(
            muzzlePos,
            hit.point,
            currentWeapon
        );

        // ========================================
        // SINGLEPLAYER DAMAGE
        // ========================================

        if (gameMode === 'singleplayer') {

            for (const bot of bots) {

                if (!bot || bot.health <= 0) continue;

                let current = hit.object;
                let hitBot = false;

                while (current) {

                    if (current === bot.mesh) {
                        hitBot = true;
                        break;
                    }

                    current = current.parent;
                }

                if (hitBot) {

                    const damage =
                        currentWeapon === 'rifle'
                            ? 22
                            : 28;

                    bot.takeDamage(damage);

                    console.log(
                        `Hit Bot ${bot.id} for ${damage}`
                    );

                    break;
                }
            }
        }

        // ========================================
        // MULTIPLAYER DAMAGE
        // ========================================

        if (gameMode === 'multiplayer') {

            multiplayerPlayers.forEach((data, playerId) => {

                if (
                    playerId === localPlayerId ||
                    !data.mesh
                ) {
                    return;
                }

                let current = hit.object;
                let hitPlayer = false;

                while (current) {

                    if (current === data.mesh) {
                        hitPlayer = true;
                        break;
                    }

                    current = current.parent;
                }

                if (hitPlayer) {

                    const currentHealth =
                        data.player.getState('health') || 100;

                    const damage =
                        currentWeapon === 'rifle'
                            ? 22
                            : 28;

                    const newHealth =
                        Math.max(0, currentHealth - damage);

                    data.player.setState(
                        'health',
                        newHealth
                    );

                    if (newHealth <= 0) {

                        addKillFeedMessage(
                            'You',
                            `Player ${playerId.substring(0, 6)}`
                        );
                    }
                }
            });
        }

    } else {

        // ========================================
        // MISS
        // ========================================

        const missPoint = muzzlePos.clone().add(
            shootDirection.clone()
                .multiplyScalar(200)
        );

        createBulletTracer(
            muzzlePos,
            missPoint,
            currentWeapon
        );
    }

    // ============================================
    // MULTIPLAYER SYNC
    // ============================================

    if (gameMode === 'multiplayer') {

        const myPlayer = Playroom.myPlayer();

        if (myPlayer) {

            myPlayer.setState(
                'isShooting',
                true
            );

            setTimeout(() => {

                myPlayer.setState(
                    'isShooting',
                    false
                );

            }, 60);
        }
    }
}

// ============================================================================
// GET SHOOTABLE OBJECTS
// ============================================================================

function getShootableObjects() {

    return scene.children.filter(obj => {

        // Ignore rifle
        if (rifleModel) {

            let current = obj;

            while (current) {

                if (current === rifleModel) {
                    return false;
                }

                current = current.parent;
            }
        }

        // Ignore pistol
        if (pistolModel) {

            let current = obj;

            while (current) {

                if (current === pistolModel) {
                    return false;
                }

                current = current.parent;
            }
        }

        return true;
    });
}

// ============================================================================
// RELOAD
// ============================================================================

function reload() {

    if (isReloading) return;

    const reserve =
        currentWeapon === 'rifle'
            ? rifleReserve
            : pistolReserve;

    const maxAmmo =
        currentWeapon === 'rifle'
            ? 30
            : 17;

    const currentAmmo =
        currentWeapon === 'rifle'
            ? rifleAmmo
            : pistolAmmo;

    // No reload needed
    if (
        reserve <= 0 ||
        currentAmmo === maxAmmo
    ) {
        return;
    }

    isReloading = true;

    document.getElementById(
        'reloadIndicator'
    ).style.display = 'block';

    // ============================================
    // RELOAD SHAKE
    // ============================================

    const originalRot = {
        x: camera.rotation.x,
        y: camera.rotation.y
    };

    const shake = setInterval(() => {

        camera.rotation.x =
            originalRot.x +
            (Math.random() - 0.5) * 0.04;

        camera.rotation.y =
            originalRot.y +
            (Math.random() - 0.5) * 0.02;

    }, 50);

    // ============================================
    // FINISH RELOAD
    // ============================================

    setTimeout(() => {

        clearInterval(shake);

        camera.rotation.x =
            originalRot.x;

        camera.rotation.y =
            originalRot.y;

        const needed =
            maxAmmo - currentAmmo;

        const toReload =
            Math.min(needed, reserve);

        if (currentWeapon === 'rifle') {

            rifleAmmo += toReload;
            rifleReserve -= toReload;

        } else {

            pistolAmmo += toReload;
            pistolReserve -= toReload;
        }

        isReloading = false;

        document.getElementById(
            'reloadIndicator'
        ).style.display = 'none';

        updateHUD();

    }, 1800);
}

// ============================================================================
// SWITCH WEAPON
// ============================================================================

function switchWeapon(direction = 'next') {

    const weaponCycle = [
        'rifle',
        'pistol'
    ];

    let currentIndex =
        weaponCycle.indexOf(
            currentWeapon
        );

    if (direction === 'next') {

        currentIndex =
            (currentIndex + 1)
            % weaponCycle.length;

    } else {

        currentIndex =
            (currentIndex - 1 + weaponCycle.length)
            % weaponCycle.length;
    }

    currentWeapon =
        weaponCycle[currentIndex];

    // IMPORTANT
    updateCurrentWeapon(currentWeapon);

    if (rifleModel && pistolModel) {

        rifleModel.visible =
            currentWeapon === 'rifle';

        pistolModel.visible =
            currentWeapon === 'pistol';

        isAiming = false;

        updateWeaponPosition();
    }

    updateHUD();
}

function updateWeaponPosition() {

    // Smooth FOV
    camera.fov = isAiming ? 45 : 75;
    camera.updateProjectionMatrix();

    // Crosshair
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        const color = isAiming ? 'rgba(255, 8, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
        crosshair.style.setProperty('--crosshair-color', color);
    }

    // =========================
    // RIFLE
    // =========================
    if (currentWeapon === 'rifle' && rifleModel) {

        if (isAiming) {

            // PERFECT CENTER ADS
            rifleModel.position.copy(RIFLE_AIM_POS);

            // Straight forward
            rifleModel.rotation.copy(RIFLE_AIM_ROT);

        } else {

            // Hip fire position
            rifleModel.position.copy(RIFLE_HIP_POS);

            // Slight left tilt like CSGO/Valorant
            rifleModel.rotation.copy(RIFLE_HIP_ROT);
        }
    }

    // =========================
    // PISTOL
    // =========================
    else if (currentWeapon === 'pistol' && pistolModel) {

        if (isAiming) {

            // TRUE CENTER ADS
            pistolModel.position.copy(PISTOL_AIM_POS);

            // Fully straighten model
            pistolModel.rotation.copy(PISTOL_AIM_ROT);

        } else {

            // Hip fire position
            pistolModel.position.copy(PISTOL_HIP_POS);

            // FPS cinematic angle
            pistolModel.rotation.copy(PISTOL_HIP_ROT);
        }
    }
}

function checkJumpPadBoost() {
    if (!playerBody) return;

    const playerPos = playerBody.position;

    // Check distance to each jump pad
    for (let pad of window.jumpPads || []) {
        const distX = playerPos.x - pad.body.position.x;
        const distZ = playerPos.z - pad.body.position.z;
        const dist = Math.sqrt(distX*distX + distZ*distZ);

        if (dist < 4.5 && playerBody.velocity.y < 2) {
            // BIG BOOST!
            playerBody.velocity.y = 28; // Strong upward force
            createJumpEffect(pad.body.position); // Optional visual effect
        }
    }
}

function createImpactEffect(position) {
    // Sparks
    for (let i = 0; i < 5; i++) {
        const geometry = new THREE.SphereGeometry(0.02);
        const material = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
        const spark = new THREE.Mesh(geometry, material);
        spark.position.copy(position);
        scene.add(spark);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        );

        const animate = () => {
            spark.position.add(velocity.clone().multiplyScalar(0.05));
            velocity.y -= 0.05; // Gravity

            if (spark.position.y > 0) {
                requestAnimationFrame(animate);
            } else {
                scene.remove(spark);
            }
        };
        animate();
    }
}

function createJumpEffect(position) {
    for (let i = 0; i < 12; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        particle.position.copy(position);
        particle.position.y += 1;
        scene.add(particle);

        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            Math.random() * 10 + 5,
            (Math.random() - 0.5) * 8
        );

        const animateParticle = () => {
            particle.position.add(vel);
            vel.y -= 0.4;
            particle.scale.multiplyScalar(0.95);

            if (particle.scale.x > 0.05) {
                requestAnimationFrame(animateParticle);
            } else {
                scene.remove(particle);
            }
        };
        animateParticle();
    }
}

function damagePlayer(amount) {
    playerHealth = Math.max(0, playerHealth - amount);
    updateHUD();

    if (playerHealth <= 0) {
        die();
    }
}

function die() {
    document.getElementById('deathScreen').style.display = 'flex';
    isPointerLocked = false;
    document.exitPointerLock();

    setTimeout(() => {
        // Respawn
        playerHealth = 100;
        playerBody.position.set(0, 10, 0);
        playerBody.velocity.set(0, 0, 0);
        rifleAmmo = 30;
        rifleReserve = 90;
        pistolAmmo = 17;
        pistolReserve = 51;
        document.getElementById('deathScreen').style.display = 'none';
        updateHUD();
    }, 3000);
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function updateHUD() {
    // 1. Update Health
    const healthEl = document.getElementById('healthText');
    healthEl.textContent = playerHealth;

    if (playerHealth < 30) healthEl.style.color = "#ff4444";
    else if (playerHealth < 60) healthEl.style.color = "#ffbb00";
    else healthEl.style.color = "#00ff88";

    // 2. Update Ammo
    const currentAmmo = currentWeapon === 'rifle' ? rifleAmmo : pistolAmmo;
    const reserve = currentWeapon === 'rifle' ? rifleReserve : pistolReserve;

    document.getElementById('currentAmmo').textContent = currentAmmo;
    document.getElementById('reserveAmmo').textContent = `/ ${reserve}`;

    // Update Weapon HUD Visuals
    const nameEl = document.getElementById('weaponName');
    const imageEl = document.getElementById('weaponImage');

    if (currentWeapon === 'rifle') {
        nameEl.textContent = "M4A1-S";
        nameEl.style.color = "#4b69ff";
        if (imageEl) imageEl.src = "/Game/assets/images/M4A1S.png";
    } else if (currentWeapon === 'pistol') {
        nameEl.textContent = "GLOCK-18";
        nameEl.style.color = "#ffffff";
        if (imageEl) imageEl.src = "/Game/assets/images/glock18.png";
    } else {
        console.log("Unknown weapon type: " + currentWeapon);
    }

}

function addKillFeedMessage(killer, victim) {
    const killFeed = document.getElementById('killFeed');
    const message = document.createElement('div');
    message.className = 'kill-message';
    message.textContent = `${killer} ☠ ${victim}`;
    killFeed.insertBefore(message, killFeed.firstChild);

    // Remove after 5 seconds
    setTimeout(() => message.remove(), 5000);

    // Keep max 5 messages
    while (killFeed.children.length > 5) {
        killFeed.removeChild(killFeed.lastChild);
    }
}

// ============================================================================
// GAME LOOP
// ============================================================================

let lastTime = performance.now();

function gameLoop() {
    requestAnimationFrame(gameLoop);

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Physics
    world.step(1 / 60, deltaTime, 3);
    

    // Player movement
    if (isPointerLocked) {
        // 1. Determine Speed
        let speed = moveForward || moveBackward || moveLeft || moveRight ?
            (isSprinting ? SPRINT_SPEED : (isCrouching ? CROUCH_SPEED : MOVE_SPEED)) : 0;

        // 2. Calculate Directional Vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        let moveVec = new THREE.Vector3(0, 0, 0);
        if (moveForward) moveVec.add(forward);
        if (moveBackward) moveVec.sub(forward);
        if (moveRight) moveVec.add(right);
        if (moveLeft) moveVec.sub(right);

        if (moveVec.length() > 0) {
            moveVec.normalize().multiplyScalar(speed);

            // 3. Direct Velocity Injection (Fixed Slowness)
            playerBody.velocity.x = moveVec.x;
            playerBody.velocity.z = moveVec.z;

        } else {
            // Stop immediately if no keys pressed
            playerBody.velocity.x *= 0.1;
            playerBody.velocity.z *= 0.1;
        }

        // Check for "Grounding" to allow jumping
        if (Math.abs(playerBody.velocity.y) < 0.01) {
            canJump = true;
        }

        // === AUTOMATIC FIRING ===
        if (isMouseDown && !isReloading) {
            shoot();
        }

        // Inside gameLoop(), after physics step
        checkJumpPadBoost();

        updateCameraHeight();
        camera.rotation.order = 'YXZ';
        camera.rotation.y = mouseX;
        camera.rotation.x = mouseY;

    }

    // Update bots
    if (gameMode === 'singleplayer') {
        bots.forEach(bot => bot.update(deltaTime));
    }

    // Update multiplayer
    if (gameMode === 'multiplayer') {
        updateMultiplayerState();
    }

    renderer.render(scene, camera);
}

// ============================================================================
// GAME START
// ============================================================================

function startGameplay() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('hud').style.display = 'flex';
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('killFeed').style.display = 'block';
    updateHUD();
    gameLoop();
}