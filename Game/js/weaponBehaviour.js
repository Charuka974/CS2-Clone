import * as THREE from 'three';

// ============================================================================
// INTERNAL REFERENCES
// ============================================================================

let sceneRef = null;
let cameraRef = null;

let rifleModelRef = null;
let pistolModelRef = null;
let currentWeaponRef = 'rifle';

// ============================================================================
// CONTEXT SETUP
// ============================================================================

export function setWeaponContext({
    scene,
    camera,
    rifleModel,
    pistolModel,
    currentWeapon
}) {

    sceneRef = scene;
    cameraRef = camera;

    rifleModelRef = rifleModel;
    pistolModelRef = pistolModel;

    if (currentWeapon) {
        currentWeaponRef = currentWeapon;
    }
}

export function updateCurrentWeapon(currentWeapon) {
    currentWeaponRef = currentWeapon;
}

// ============================================================================
// HELPERS
// ============================================================================

export function getCurrentWeaponModel() {

    return currentWeaponRef === 'rifle'
        ? rifleModelRef
        : pistolModelRef;
}

function validateVector3(vec) {

    return (
        vec &&
        typeof vec.x === 'number' &&
        typeof vec.y === 'number' &&
        typeof vec.z === 'number'
    );
}

// ============================================================================
// CONFIG
// ============================================================================

export function getWeaponConfig(currentWeapon = currentWeaponRef) {

    return currentWeapon === 'rifle'
        ? {
            recoilX: 0.028,
            recoilY: 0.012,
            tracerColor: 0xffaa33,
            flashSize: 0.22,
            smokeSize: 0.12,
            shellScale: 0.05
        }
        : {
            recoilX: 0.045,
            recoilY: 0.02,
            tracerColor: 0xffdd66,
            flashSize: 0.14,
            smokeSize: 0.08,
            shellScale: 0.035
        };
}

// ============================================================================
// MUZZLE FLASH
// ============================================================================

export function createMuzzleFlash(
    position,
    direction,
    currentWeapon = currentWeaponRef
) {

    // ============================================
    // SAFETY CHECKS
    // ============================================

    if (!sceneRef) {
        console.error('createMuzzleFlash: sceneRef is missing');
        return;
    }

    if (!validateVector3(position)) {
        console.error(
            'createMuzzleFlash: invalid position',
            position
        );
        return;
    }

    if (!validateVector3(direction)) {
        console.error(
            'createMuzzleFlash: invalid direction',
            direction
        );
        return;
    }

    const config = getWeaponConfig(currentWeapon);

    const flashGroup = new THREE.Group();

    // ============================================
    // FLASH CONE
    // ============================================

    const cone = new THREE.Mesh(
        new THREE.ConeGeometry(
            config.flashSize,
            config.flashSize * 2,
            8
        ),
        new THREE.MeshBasicMaterial({
            color: 0xffcc66,
            transparent: true,
            opacity: 1
        })
    );

    cone.rotation.x = Math.PI / 2;

    flashGroup.add(cone);

    // ============================================
    // CORE
    // ============================================

    const core = new THREE.Mesh(
        new THREE.SphereGeometry(
            config.flashSize * 0.5,
            8,
            8
        ),
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        })
    );

    flashGroup.add(core);

    // ============================================
    // POSITION
    // ============================================

    flashGroup.position.copy(position);

    const lookTarget = position
        .clone()
        .add(direction);

    flashGroup.lookAt(lookTarget);

    sceneRef.add(flashGroup);

    // ============================================
    // LIGHT
    // ============================================

    const light = new THREE.PointLight(
        0xffaa55,
        3,
        5
    );

    light.position.copy(position);

    sceneRef.add(light);

    // ============================================
    // ANIMATION
    // ============================================

    const start = performance.now();

    function animate() {

        const elapsed =
            performance.now() - start;

        flashGroup.scale.multiplyScalar(0.82);

        cone.material.opacity *= 0.72;

        core.material.opacity *= 0.7;

        light.intensity *= 0.55;

        if (elapsed < 60) {

            requestAnimationFrame(animate);

        } else {

            sceneRef.remove(flashGroup);
            sceneRef.remove(light);
        }
    }

    animate();

    // ============================================
    // SMOKE
    // ============================================

    createGunSmoke(
        position,
        direction,
        currentWeapon
    );
}

// ============================================================================
// BULLET TRACER
// ============================================================================

export function createBulletTracer(
    start,
    end,
    currentWeapon
) {

    if (!sceneRef) return;

    const config = getWeaponConfig(currentWeapon);

    const direction = end.clone().sub(start);

    const distance = direction.length();

    const geometry = new THREE.CylinderGeometry(
        0.006,
        0.006,
        distance,
        6
    );

    const material = new THREE.MeshBasicMaterial({
        color: config.tracerColor,
        transparent: true,
        opacity: 1
    });

    const tracer = new THREE.Mesh(
        geometry,
        material
    );

    tracer.position.copy(
        start.clone().lerp(end, 0.5)
    );

    tracer.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
    );

    sceneRef.add(tracer);

    const startTime = performance.now();

    function animateTracer() {

        tracer.material.opacity *= 0.82;

        if (
            performance.now() - startTime < 90
        ) {

            requestAnimationFrame(
                animateTracer
            );

        } else {

            sceneRef.remove(tracer);

            geometry.dispose();
            material.dispose();
        }
    }

    animateTracer();
}

// ============================================================================
// GUN SMOKE
// ============================================================================

export function createGunSmoke(
    position,
    direction,
    currentWeapon = currentWeaponRef
) {

    if (!sceneRef) return;

    if (
        !validateVector3(position) ||
        !validateVector3(direction)
    ) {
        return;
    }

    const config =
        getWeaponConfig(currentWeapon);

    for (let i = 0; i < 6; i++) {

        const smoke = new THREE.Mesh(
            new THREE.SphereGeometry(
                config.smokeSize,
                6,
                6
            ),
            new THREE.MeshBasicMaterial({
                color: 0x999999,
                transparent: true,
                opacity: 0.35
            })
        );

        smoke.position.copy(position);

        sceneRef.add(smoke);

        const velocity =
            direction.clone()
                .multiplyScalar(
                    0.03 + Math.random() * 0.03
                );

        velocity.x +=
            (Math.random() - 0.5) * 0.01;

        velocity.y +=
            Math.random() * 0.02;

        velocity.z +=
            (Math.random() - 0.5) * 0.01;

        const start =
            performance.now();

        function animateSmoke() {

            smoke.position.add(velocity);

            smoke.scale.multiplyScalar(1.03);

            smoke.material.opacity *= 0.96;

            if (
                performance.now() - start < 500
            ) {

                requestAnimationFrame(
                    animateSmoke
                );

            } else {

                sceneRef.remove(smoke);
            }
        }

        animateSmoke();
    }
}

// ============================================================================
// SHELL EJECTION
// ============================================================================

export function ejectShell(
    weapon = getCurrentWeaponModel(),
    currentWeapon = currentWeaponRef
) {

    if (!sceneRef) return;

    if (!weapon) return;

    const config =
        getWeaponConfig(currentWeapon);

    const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(
            config.shellScale,
            config.shellScale,
            config.shellScale * 2,
            6
        ),
        new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 1,
            roughness: 0.3
        })
    );

    const shellPos =
        new THREE.Vector3();

    weapon.getWorldPosition(shellPos);

    shell.position.copy(shellPos);

    sceneRef.add(shell);

    const velocity =
        new THREE.Vector3(
            0.06 + Math.random() * 0.03,
            0.05 + Math.random() * 0.03,
            (Math.random() - 0.5) * 0.03
        );

    const rotationVelocity =
        new THREE.Vector3(
            Math.random() * 0.4,
            Math.random() * 0.4,
            Math.random() * 0.4
        );

    function animateShell() {

        shell.position.add(velocity);

        velocity.y -= 0.003;

        shell.rotation.x +=
            rotationVelocity.x;

        shell.rotation.y +=
            rotationVelocity.y;

        shell.rotation.z +=
            rotationVelocity.z;

        if (shell.position.y > -10) {

            requestAnimationFrame(
                animateShell
            );

        } else {

            sceneRef.remove(shell);
        }
    }

    animateShell();
}

// ============================================================================
// KICKBACK
// ============================================================================

export function applyWeaponKickback(
    weapon = getCurrentWeaponModel(),
    currentWeapon = currentWeaponRef,
    updateWeaponPosition = null
) {

    if (!weapon || !cameraRef) return;

    const config =
        getWeaponConfig(currentWeapon);

    // ============================================
    // WEAPON PUSHBACK
    // ============================================

    weapon.position.z +=
        currentWeapon === 'rifle'
            ? 0.08
            : 0.05;

    weapon.rotation.x -=
        currentWeapon === 'rifle'
            ? 0.03
            : 0.05;

    // ============================================
    // CAMERA RECOIL
    // ============================================

    cameraRef.rotation.x -=
        config.recoilX;

    cameraRef.rotation.y +=
        (Math.random() - 0.5)
        * config.recoilY;

    // ============================================
    // RECOVER
    // ============================================

    if (updateWeaponPosition) {

        setTimeout(() => {
            updateWeaponPosition();
        }, 45);
    }
}