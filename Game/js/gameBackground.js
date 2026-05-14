// gameBackground.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


export const rocks = [];
export const trees = [];
export const gltfLoader = new GLTFLoader();

const cubeTextureLoader = new THREE.CubeTextureLoader();
export const skyboxTexture = cubeTextureLoader.load([
            '/Game/assets/sky/interstellar_lf.jpg',   // Left
            '/Game/assets/sky/interstellar_rt.jpg',   // Right
            '/Game/assets/sky/interstellar_up.jpg',   // Up
            '/Game/assets/sky/interstellar_dn.jpg',   // Down
            '/Game/assets/sky/interstellar_ft.jpg',   // Front
            '/Game/assets/sky/interstellar_bk.jpg'    // Back
]);

// ======================================================
// BACKGROUND
// ======================================================

export function createBackground(scene, world) {
    scene.background = skyboxTexture;

    // Random rocks
    for (let i = 0; i < 40; i++) {

        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;

        loadRock(scene, world, x, z);
    }

    // Random trees
    for (let i = 0; i < 60; i++) {

        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;

        loadTree(scene, world, x, z);
    }
}

// ============================================================================
// ENHANCED PARKOUR MAP (Venge.io + CS2 Style)
// ============================================================================
export function createMap(scene, world, x, z) {
    // Better atmosphere
    scene.fog = new THREE.Fog(0x88aaff, 80, 450);
    // scene.background = new THREE.Color(0x88aaff);

    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a5f3a, roughness: 0.85 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.75 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555577, metalness: 0.85, roughness: 0.25 });

    // Main Ground
    const ground = new THREE.Mesh(new THREE.BoxGeometry(320, 2, 320), groundMat);
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(new CANNON.Box(new CANNON.Vec3(160, 1, 160)));
    groundBody.position.y = -1;
    world.addBody(groundBody);

    // Platform Helper
    function createPlatform(x, y, z, w, h, d, material, color = 0x888888) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            material || new THREE.MeshStandardMaterial({ color })
        );
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2)));
        body.position.set(x, y, z);
        world.addBody(body);

        return mesh;
    }

    // === STRUCTURES & PARKOUR ===
    createPlatform(-85, 10, -70, 55, 20, 45, null, 0x666666);
    createPlatform(80, 12, 75, 50, 24, 40, null, 0x555555);
    createPlatform(5, 18, -5, 18, 36, 18, null, 0x777777);

    // Ramp
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(18, 1.5, 35), concreteMat);
    ramp.position.set(-35, 6, 25);
    ramp.rotation.x = Math.PI / 5.5;
    scene.add(ramp);

    const rampBody = new CANNON.Body({ mass: 0 });
    rampBody.addShape(new CANNON.Box(new CANNON.Vec3(9, 0.75, 17.5)));
    rampBody.position.set(-35, 6, 25);
    rampBody.quaternion.setFromEuler(Math.PI / 5.5, 0, 0);
    world.addBody(rampBody);

    // Parkour Elements
    createPlatform(-50, 16, 45, 6, 1, 55, metalMat);
    createPlatform(20, 24, 35, 10, 1.2, 10, metalMat);
    createPlatform(45, 19, 70, 8, 1, 28, metalMat);
    createPlatform(-25, 28, 65, 7, 1, 7, metalMat);

    // === JUMP PADS ===
    const jumpPads = [];

    function createJumpPad(x, z, y = 0.8) {
        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(4.2, 4.8, 0.5, 32),
            new THREE.MeshStandardMaterial({
                color: 0x00eeff,
                emissive: 0x00ffff,
                emissiveIntensity: 1.2,
                metalness: 0.9,
                roughness: 0.1
            })
        );
        pad.position.set(x, y, z);
        pad.rotation.x = Math.PI / 2;
        scene.add(pad);

        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Cylinder(4.2, 4.8, 0.5, 32));
        body.position.set(x, y, z);
        world.addBody(body);

        const light = new THREE.PointLight(0x00ffff, 3, 40);
        light.position.set(x, y + 3, z);
        scene.add(light);

        jumpPads.push({ mesh: pad, body, light });
        return pad;
    }

    createJumpPad(-55, -55);
    createJumpPad(55, -70);
    createJumpPad(-15, 85);
    createJumpPad(70, 45);
    createJumpPad(0, -95);
    createJumpPad(-85, 30);

    // More structures...
    createPlatform(-20, 8, 45, 8, 16, 8, null, 0x666666);
    createPlatform(30, 7, -35, 12, 14, 12, null, 0x666666);
    createPlatform(0, 6, 80, 20, 12, 8, null, 0x777777);

    // Outer Walls
    createPlatform(0, 15, -160, 320, 30, 6, null, 0x444466);
    createPlatform(0, 15, 160, 320, 30, 6, null, 0x444466);
    createPlatform(-160, 15, 0, 6, 30, 320, null, 0x444466);
    createPlatform(160, 15, 0, 6, 30, 320, null, 0x444466);

    window.jumpPads = jumpPads;

    console.log("Enhanced Parkour Map with Jump Pads Loaded!");
}

// ======================================================
// ROCKS
// ======================================================

function loadRock(scene, world, x, z) {

    gltfLoader.load('/Game/assets/background/Rock_7.gltf', (gltf) => {

        const rock = gltf.scene;

        const scale = 0.5 + Math.random() * 0.7;

        rock.scale.set(scale, scale, scale);

        rock.position.set(
            x,
            0,
            z
        );

        rock.rotation.y = Math.random() * Math.PI * 2;

        rock.traverse((child) => {

            if (child.isMesh) {

                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(rock);

        // =================================================
        // PHYSICS COLLISION
        // =================================================

        const radius = scale * 1.5;

        const shape = new CANNON.Sphere(radius);

        const body = new CANNON.Body({
            mass: 0,
            shape: shape
        });

        body.position.set(x, radius * 0.6, z);

        world.addBody(body);

        rocks.push({
            mesh: rock,
            body: body
        });
    });
}

// ======================================================
// TREES
// ======================================================

function loadTree(scene, world, x, z) {

    gltfLoader.load('/Game/assets/background/Tree1.gltf', (gltf) => {

        const tree = gltf.scene;

        const scale = 2;

        tree.scale.set(scale, scale, scale);

        tree.position.set(x, -0.2, z);

        tree.traverse((child) => {

            if (child.isMesh) {

                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(tree);

        // =================================================
        // TREE COLLISION
        // =================================================

        const radius = 1.2;
        const height = 8;

        const shape = new CANNON.Cylinder(
            radius,
            radius,
            height,
            8
        );

        const body = new CANNON.Body({
            mass: 0
        });

        // Rotate cylinder upright
        const quat = new CANNON.Quaternion();
        quat.setFromEuler(Math.PI / 2, 0, 0);

        body.addShape(shape, new CANNON.Vec3(0, 0, 0), quat);

        body.position.set(x, height / 2, z);

        world.addBody(body);

        trees.push({
            mesh: tree,
            body: body
        });
    });
}