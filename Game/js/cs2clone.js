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
        let rifleAmmo = 30, rifleReserve = 90;
        let pistolAmmo = 17, pistolReserve = 51;
        let isReloading = false;
        let bots = [];
        let multiplayerPlayers = new Map();
        let localPlayerId = null;
        let bobTimer = 0;
        let isAiming = false;

        const BOB_SPEED = 0;
        const BOB_AMOUNT = 0;
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
        const RIFLE_HIP_POS = new THREE.Vector3(0.32, -0.28, -0.55);
        const RIFLE_AIM_POS = new THREE.Vector3(0.0, -0.12, -0.35);
        // Pistol
        const PISTOL_HIP_POS = new THREE.Vector3(0.22, -0.30, -0.45);
        const PISTOL_AIM_POS = new THREE.Vector3(0.0, -0.05, -0.28);

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
            scene.background = new THREE.Color(0x87CEEB); // Sky blue
            scene.fog = new THREE.Fog(0x87CEEB, 0, 300);

            // Camera
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, PLAYER_HEIGHT, 0);
            
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

        // Function to load external .obj and .mtl files
        function loadWeaponModel(folderName, fileName, scale, position, rotation) {
            return new Promise((resolve, reject) => {
                const group = new THREE.Group();
                const mtlLoader = new THREE.MTLLoader();
                
                // Point to the folder where your model is (e.g., /assets/3dmodals/Weapon/)
                const path = `/Game/assets/3dmodals/${folderName}/`;
                mtlLoader.setPath(path);
                
                mtlLoader.load(`${fileName}.mtl`, (materials) => {
                    materials.preload();
                    
                    const objLoader = new THREE.OBJLoader();
                    objLoader.setMaterials(materials);
                    objLoader.setPath(path);
                    
                    objLoader.load(`${fileName}.obj`, (object) => {
                        // Apply scaling, positioning, and rotation to make it look like an FPS game
                        object.scale.set(scale, scale, scale);
                        object.position.copy(position);                        
                        group.add(object);
                        resolve(group); // Successfully loaded
                    }, 
                    (xhr) => { console.log(`${fileName}: ${(xhr.loaded / xhr.total * 100)}% loaded`); }, 
                    (error) => { console.error(`Error loading ${fileName}:`, error); reject(error); });
                }, undefined, reject);
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
        // MAP GENERATION (Dust 2 Inspired)
        // ============================================================================

        function createMap() {
            const groundMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xD2B48C, // Tan/sand color
                roughness: 0.9 
            });
            
            const wallMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xA0826D,
                roughness: 0.8 
            });

            const boxMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B7355,
                roughness: 0.7 
            });

            // Ground
            const groundGeom = new THREE.BoxGeometry(200, 1, 200);
            const ground = new THREE.Mesh(groundGeom, groundMaterial);
            ground.position.y = -0.5;
            ground.receiveShadow = true;
            scene.add(ground);

            const groundShape = new CANNON.Box(new CANNON.Vec3(100, 0.5, 100));
            const groundBody = new CANNON.Body({ mass: 0 });
            groundBody.addShape(groundShape);
            groundBody.position.y = -0.5;
            world.addBody(groundBody);

            // Helper function to create physics-enabled box
            function createBox(x, y, z, w, h, d, mat) {
                const geom = new THREE.BoxGeometry(w, h, d);
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.set(x, y, z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);

                const shape = new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2));
                const body = new CANNON.Body({ mass: 0 });
                body.addShape(shape);
                body.position.set(x, y, z);
                world.addBody(body);

                return mesh;
            }

            // Outer walls
            createBox(0, 5, -100, 200, 10, 2, wallMaterial); // North
            createBox(0, 5, 100, 200, 10, 2, wallMaterial);  // South
            createBox(-100, 5, 0, 2, 10, 200, wallMaterial); // West
            createBox(100, 5, 0, 2, 10, 200, wallMaterial);  // East

            // Site A structures (top-left area)
            createBox(-60, 3, -60, 30, 6, 30, boxMaterial);
            createBox(-40, 1.5, -40, 10, 3, 10, boxMaterial);
            createBox(-70, 2, -40, 8, 4, 8, boxMaterial);

            // Site B structures (bottom-right area)
            createBox(60, 3, 60, 30, 6, 30, boxMaterial);
            createBox(40, 1.5, 40, 10, 3, 10, boxMaterial);
            createBox(70, 2, 40, 8, 4, 8, boxMaterial);

            // Mid section walls and cover
            createBox(0, 4, 0, 4, 8, 40, wallMaterial);
            createBox(-20, 2, 20, 15, 4, 15, boxMaterial);
            createBox(20, 2, -20, 15, 4, 15, boxMaterial);

            // Additional scattered cover boxes
            const coverPositions = [
                [-30, 10], [30, -10], [-10, 30], [10, -30],
                [-50, 20], [50, -20], [0, 40], [0, -40]
            ];

            coverPositions.forEach(([x, z]) => {
                const height = Math.random() * 2 + 1;
                createBox(x, height, z, 4, height * 2, 4, boxMaterial);
            });

            // Zone markers
            function createZoneMarker(x, z, label) {
                const geom = new THREE.PlaneGeometry(20, 20);
                const mat = new THREE.MeshBasicMaterial({ 
                    color: label === 'A' ? 0xff6b35 : 0x4CAF50,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide
                });
                const plane = new THREE.Mesh(geom, mat);
                plane.rotation.x = -Math.PI / 2;
                plane.position.set(x, 0.1, z);
                scene.add(plane);
            }

            createZoneMarker(-60, -60, 'A');
            createZoneMarker(60, 60, 'B');
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
                const shape = new CANNON.Box(new CANNON.Vec3(0.5, PLAYER_HEIGHT/2, 0.5));
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
                // Raycast toward player
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
                const direction = playerPos.clone().sub(origin).normalize();

                const raycaster = new THREE.Raycaster(origin, direction, 0, 100);
                const intersects = raycaster.intersectObjects(scene.children, true);

                // Check if hit player (simple distance check)
                const distToPlayer = origin.distanceTo(playerPos);
                if (distToPlayer < 2) {
                    damagePlayer(10);
                    createMuzzleFlash(origin);
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
                switch(e.code) {
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
                switch(e.code) {
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
            document.addEventListener('mousedown', (e) => {
                if (!isPointerLocked) return;
                if (e.button === 0) {
                    shoot();
                } else if (e.button === 2) {
                    isAiming = true;
                    updateWeaponPosition();
                }
            });

            document.addEventListener('mouseup', (e) => {
                if (e.button === 2) { // Right click Up
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
            const targetHeight = isCrouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
            camera.position.y = playerBody.position.y + targetHeight - PLAYER_HEIGHT/2;
        }

        // ============================================================================
        // COMBAT SYSTEM
        // ============================================================================

        function shoot() {
            if (isReloading) return;

            const currentAmmo = currentWeapon === 'rifle' ? rifleAmmo : pistolAmmo;
            if (currentAmmo <= 0) {
                // Click sound or empty mag indication
                return;
            }

            // Decrement ammo
            if (currentWeapon === 'rifle') {
                rifleAmmo--;
            } else {
                pistolAmmo--;
            }
            updateHUD();

            // Muzzle flash
            const muzzlePos = new THREE.Vector3();
            camera.getWorldPosition(muzzlePos);
            muzzlePos.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.5));
            createMuzzleFlash(muzzlePos);

            // Raycast
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const hit = intersects[0];
                createImpactEffect(hit.point);

                // Check if hit a bot
                if (gameMode === 'singleplayer') {
                    bots.forEach(bot => {
                        if (bot.mesh === hit.object) {
                            bot.takeDamage(25);
                        }
                    });
                }

                // Check if hit a player (multiplayer)
                if (gameMode === 'multiplayer') {
                    multiplayerPlayers.forEach((data, playerId) => {
                        if (data.mesh === hit.object) {
                            const player = data.player;
                            const currentHealth = player.getState('health') || 100;
                            const newHealth = Math.max(0, currentHealth - 25);
                            player.setState('health', newHealth);

                            if (newHealth <= 0) {
                                addKillFeedMessage('You', `Player ${playerId.substring(0, 6)}`);
                            }
                        }
                    });
                }
            }

            // Recoil camera shake
            camera.rotation.x += (Math.random() - 0.5) * 0.02;
            camera.rotation.y += (Math.random() - 0.5) * 0.02;

            // Sync shooting state for multiplayer
            if (gameMode === 'multiplayer') {
                const myPlayer = Playroom.myPlayer();
                if (myPlayer) {
                    myPlayer.setState('isShooting', true);
                    setTimeout(() => {
                        myPlayer.setState('isShooting', false);
                    }, 100);
                }
            }
        }

        function reload() {
            if (isReloading) return;

            const reserve = currentWeapon === 'rifle' ? rifleReserve : pistolReserve;
            const maxAmmo = currentWeapon === 'rifle' ? 30 : 17;
            const currentAmmo = currentWeapon === 'rifle' ? rifleAmmo : pistolAmmo;

            if (reserve <= 0 || currentAmmo === maxAmmo) return;

            isReloading = true;
            document.getElementById('reloadIndicator').style.display = 'block';

            // Camera shake animation
            const originalRotation = { x: camera.rotation.x, y: camera.rotation.y };
            const shakeInterval = setInterval(() => {
                camera.rotation.x = originalRotation.x + (Math.random() - 0.5) * 0.05;
                camera.rotation.y = originalRotation.y + (Math.random() - 0.5) * 0.05;
            }, 50);

            setTimeout(() => {
                clearInterval(shakeInterval);
                camera.rotation.x = originalRotation.x;
                camera.rotation.y = originalRotation.y;

                const needed = maxAmmo - currentAmmo;
                const toReload = Math.min(needed, reserve);

                if (currentWeapon === 'rifle') {
                    rifleAmmo += toReload;
                    rifleReserve -= toReload;
                } else {
                    pistolAmmo += toReload;
                    pistolReserve -= toReload;
                }

                isReloading = false;
                document.getElementById('reloadIndicator').style.display = 'none';
                updateHUD();
            }, 2000);
        }

        function switchWeapon(direction = 'next') {
            const weaponCycle = ['rifle', 'pistol'];
            let currentIndex = weaponCycle.indexOf(currentWeapon);
            
            if (direction === 'next') {
                currentIndex = (currentIndex + 1) % weaponCycle.length;
            } else {
                currentIndex = (currentIndex - 1 + weaponCycle.length) % weaponCycle.length;
            }
            
            currentWeapon = weaponCycle[currentIndex];

            if (rifleModel && pistolModel) {
                rifleModel.visible = (currentWeapon === 'rifle');
                pistolModel.visible = (currentWeapon === 'pistol');
                
                // FIX: Reset aiming state when switching weapons
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
                crosshair.style.display = isAiming ? 'none' : 'block';
            }

            // =========================
            // RIFLE
            // =========================
            if (currentWeapon === 'rifle' && rifleModel) {

                if (isAiming) {

                    // PERFECT CENTER ADS
                    rifleModel.position.copy(RIFLE_AIM_POS);

                    // Straight forward
                    rifleModel.rotation.set(0, 0, 0);

                } else {

                    // Hip fire position
                    rifleModel.position.copy(RIFLE_HIP_POS);

                    // Slight left tilt like CSGO/Valorant
                    rifleModel.rotation.set(0, -0.15, 0);
                }
            }

            // =========================
            // PISTOL
            // =========================
            else if (currentWeapon === 'pistol' && pistolModel) {

                if (isAiming) {

                    // TRUE CENTER ADS
                    pistolModel.position.set(
                        0.02,   // tiny right offset
                        -0.08,  // vertical align
                        -0.22   // push forward
                    );

                    // Fully straighten model
                    pistolModel.rotation.set(
                        0.02,   // X
                        1.57,   // Y
                        0       // Z
                    );

                } else {

                    // Hip fire position
                    pistolModel.position.set(
                        0.22,
                        0.08,
                        -0.42
                    );

                    // FPS cinematic angle
                    pistolModel.rotation.set(
                        0.03,   // slight upward tilt
                        2.33,   // angle toward center
                        0.0   // slight weapon tilt
                    );
                }
            }
        }

        function createMuzzleFlash(position) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const flash = new THREE.Mesh(geometry, material);
            flash.position.copy(position);
            scene.add(flash);

            setTimeout(() => scene.remove(flash), 50);
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
                if(imageEl) imageEl.src = "assets/images/M4A1S.png";
            } else if (currentWeapon === 'pistol') {
                nameEl.textContent = "GLOCK-18";
                nameEl.style.color = "#ffffff";
                if(imageEl) imageEl.src = "assets/images/glock18.png";
            } else{
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
            world.step(1/60, deltaTime, 3);

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

                    // 4. Handle Head Bobbing Logic
                    bobTimer += deltaTime * (isSprinting ? BOB_SPEED * 1.5 : BOB_SPEED);
                    const bobY = Math.sin(bobTimer) * BOB_AMOUNT;
                    const bobX = Math.cos(bobTimer * 0.5) * (BOB_AMOUNT * 0.5);
                    
                    // Apply Bobbing to Camera
                    camera.position.y += bobY;
                    camera.position.x += bobX;
                    
                    // Subtle tilt (roll) for realism
                    camera.rotation.z = Math.sin(bobTimer * 0.5) * 0.02;
                } else {
                    // Stop immediately if no keys pressed
                    playerBody.velocity.x *= 0.1;
                    playerBody.velocity.z *= 0.1;
                    bobTimer = 0; // Reset bobbing when still
                    camera.rotation.z *= 0.9;
                }

                // 5. Finalize Camera Position
                camera.position.x = playerBody.position.x;
                camera.position.z = playerBody.position.z;
                
                // Check for "Grounding" to allow jumping
                if (Math.abs(playerBody.velocity.y) < 0.01) {
                    canJump = true;
                }

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

        async function startGame(mode) {
            gameMode = mode;
            document.getElementById('mainMenu').style.display = 'none';

            initThreeJS();
            initPhysics();
            createMap();

            try {
                // Load the M4A1
                rifleModel = await loadWeaponModel(
                    'M4a1',                  // Folder name
                    'M4a1',                  // File name (without .obj/.mtl)
                    0.2,                    // Scale (Downloaded models are usually huge, so scale them down!)
                    RIFLE_HIP_POS, // Position (Right, Down, Forward)
                    0                  // Rotation (Flip it 180 degrees so it faces forward)
                );
                
                // Load the Glock18
                pistolModel = await loadWeaponModel(
                    'Glock18',               // Folder name from your screenshot
                    'Glock18',               // File name from your screenshot
                    0.12,                    // Scale
                    PISTOL_HIP_POS, 
                    1.5                  // Rotation
                );

                // Hide pistol initially, add both to camera
                rifleModel.visible = true;
                pistolModel.visible = false;
                camera.add(rifleModel);
                camera.add(pistolModel);
                
            } catch (error) {
                console.error("CRITICAL: Failed to load 3D weapon models. Check your file paths!", error);
                alert("Failed to load weapon models. Check the console (F12).");
            }

            initControls();

            if (mode === 'singleplayer') {
                spawnBots(5);
                startGameplay();
            } else {
                await initMultiplayer();
            }
        }

        function startGameplay() {
            document.getElementById('hud').style.display = 'flex';
            document.getElementById('crosshair').style.display = 'block';
            document.getElementById('killFeed').style.display = 'block';
            updateHUD();
            gameLoop();
        }
