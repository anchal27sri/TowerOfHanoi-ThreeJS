import * as THREE from "three";

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// --- Camera ---
// Low-angle shot, slightly above ground, facing the ring
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(1.5, 3, 7); // centered between ring and peg, higher up, pulled back
camera.lookAt(1.5, 0.5, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 8, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0x8899cc, 0.5);
fillLight.position.set(-3, 2, -2);
scene.add(fillLight);

// --- Ground plane ---
const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x3a3a50,
  roughness: 0.8,
  metalness: 0.2,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2; // lay flat
ground.receiveShadow = true;
scene.add(ground);

// --- Rings (3 to 8 randomly) lying flat on the ground ---
const RING_COLORS = [
  0xe8a525, 0xe05555, 0x55b5e0, 0x55e085, 0xc055e0,
  0xe0a055, 0xe05599, 0x55e0d0,
];
const ringCount = Math.floor(Math.random() * 6) + 3; // 3–8
const rings = [];
const ringGeo = new THREE.TorusGeometry(1, 0.15, 32, 100);

for (let i = 0; i < ringCount; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: RING_COLORS[i % RING_COLORS.length],
    roughness: 0.3,
    metalness: 0.7,
  });
  const mesh = new THREE.Mesh(ringGeo, mat);
  mesh.rotation.x = -Math.PI / 2;
  // Spread rings out along x so they don't overlap at start
  mesh.position.set(-5 + i * 2.5, 0.15, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  rings.push({ mesh, velocityY: 0, onPeg: false, threaded: false });
}

// --- Peg (rod with a wide base) on the right side ---
const pegX = 3; // position to the right

// Rod
const rodGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 32);
const rodMat = new THREE.MeshStandardMaterial({
  color: 0x8b5e3c,
  roughness: 0.6,
  metalness: 0.3,
});
const rod = new THREE.Mesh(rodGeo, rodMat);
rod.position.set(pegX, 1.25, 0);
rod.castShadow = true;
scene.add(rod);

// Base (wide disc)
const baseGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 32);
const baseMat = new THREE.MeshStandardMaterial({
  color: 0x6b4226,
  roughness: 0.7,
  metalness: 0.2,
});
const pegBase = new THREE.Mesh(baseGeo, baseMat);
pegBase.position.set(pegX, 0.05, 0);
pegBase.castShadow = true;
pegBase.receiveShadow = true;
scene.add(pegBase);

// --- Drag logic (constrained to the vertical XY plane) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const intersection = new THREE.Vector3();
let isDragging = false;
let draggedRing = null;
const offset = new THREE.Vector3();

function getMouseNDC(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

renderer.domElement.addEventListener("pointerdown", (event) => {
  getMouseNDC(event);
  raycaster.setFromCamera(mouse, camera);

  const meshes = rings.map((r) => r.mesh);
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    const hitMesh = hits[0].object;
    draggedRing = rings.find((r) => r.mesh === hitMesh);
    isDragging = true;
    draggedRing.onPeg = false;
    renderer.domElement.style.cursor = "grabbing";
    raycaster.ray.intersectPlane(dragPlane, intersection);
    offset.copy(intersection).sub(draggedRing.mesh.position);
  }
});

// --- Collision constants ---
const RING_OUTER_RADIUS = 1;    // torus major radius
const RING_TUBE_RADIUS = 0.15;  // torus tube radius
const ROD_RADIUS = 0.08;
const ROD_TOP_Y = 2.5;          // top of the rod
const BASE_HALF_WIDTH = 0.6;    // base cylinder radius
const BASE_TOP_Y = 0.1;         // top of the base

// Collision zones based on tube-to-rod geometry:
// Nearest tube center is at RING_OUTER_RADIUS from ring center.
// Tube collides with rod when: | |ringX - pegX| - RING_OUTER_RADIUS | < TUBE + ROD
const TUBE_ROD_SUM = RING_TUBE_RADIUS + ROD_RADIUS; // 0.23
const THREADED_MAX_X = RING_OUTER_RADIUS - TUBE_ROD_SUM; // 0.77 — max offset when threaded
const OUTSIDE_MIN_X = RING_OUTER_RADIUS + TUBE_ROD_SUM;  // 1.23 — min distance from outside

renderer.domElement.addEventListener("pointermove", (event) => {
  if (!isDragging || !draggedRing) return;
  getMouseNDC(event);
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(dragPlane, intersection);

  let newX = intersection.x - offset.x;
  let newY = intersection.y - offset.y;

  // 1) Ground collision
  if (newY < GROUND_Y) {
    newY = GROUND_Y;
  }

  const distXToPeg = newX - pegX;
  const absDistX = Math.abs(distXToPeg);

  // 2) Rod collision — two regimes: threaded (inside hole) vs outside
  if (newY < ROD_TOP_Y) {
    if (draggedRing.threaded) {
      // Ring is on the peg — clamp horizontal movement within the hole
      if (absDistX > THREADED_MAX_X) {
        newX = pegX + (distXToPeg >= 0 ? THREADED_MAX_X : -THREADED_MAX_X);
      }
    } else {
      // Ring is outside — block from entering
      if (absDistX < OUTSIDE_MIN_X) {
        if (newY >= ROD_TOP_Y - RING_TUBE_RADIUS) {
          // Near top — allow sliding over
        } else {
          newX = pegX + (distXToPeg >= 0 ? OUTSIDE_MIN_X : -OUTSIDE_MIN_X);
        }
      }
    }
  } else {
    // Above the rod — check if ring moves over the peg center to toggle threaded
    if (absDistX < THREADED_MAX_X) {
      draggedRing.threaded = true;
    } else if (absDistX > OUTSIDE_MIN_X) {
      draggedRing.threaded = false;
    }
  }

  // 3) Base collision
  const ringOuterEdge = RING_OUTER_RADIUS + RING_TUBE_RADIUS;
  if (Math.abs(newX - pegX) < ringOuterEdge + BASE_HALF_WIDTH &&
      newY - RING_TUBE_RADIUS < BASE_TOP_Y &&
      newY + RING_TUBE_RADIUS > 0) {
    if (draggedRing.mesh.position.y >= BASE_TOP_Y + RING_TUBE_RADIUS - 0.01) {
      newY = BASE_TOP_Y + RING_TUBE_RADIUS;
    } else {
      const pushDist = ringOuterEdge + BASE_HALF_WIDTH;
      newX = pegX + (distXToPeg >= 0 ? pushDist : -pushDist);
    }
  }

  // 4) Ring-to-ring AABB collision
  const halfW = RING_OUTER_RADIUS + RING_TUBE_RADIUS; // 1.15
  const halfH = RING_TUBE_RADIUS;                     // 0.15
  for (const other of rings) {
    if (other === draggedRing) continue;
    const dx = newX - other.mesh.position.x;
    const dy = newY - other.mesh.position.y;
    const overlapX = 2 * halfW - Math.abs(dx);
    const overlapY = 2 * halfH - Math.abs(dy);
    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        newX += (dx >= 0 ? overlapX : -overlapX);
      } else {
        newY += (dy >= 0 ? overlapY : -overlapY);
      }
      if (newY < GROUND_Y) newY = GROUND_Y;
    }
  }

  draggedRing.mesh.position.x = newX;
  draggedRing.mesh.position.y = newY;
});

// --- Physics ---
const GRAVITY = -9.8;
const GROUND_Y = 0.15; // ring rests at this y (tube radius)
const PEG_REST_Y = 0.1 + 0.15; // base height + tube radius

window.addEventListener("pointerup", () => {
  if (isDragging && draggedRing) {
    isDragging = false;
    renderer.domElement.style.cursor = "default";
    draggedRing.velocityY = 0;
    draggedRing.onPeg = false;
    draggedRing = null;
  }
});

// --- Handle resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  const halfW = RING_OUTER_RADIUS + RING_TUBE_RADIUS; // 1.15
  const halfH = RING_TUBE_RADIUS;                     // 0.15

  // 1) Apply gravity to all non-dragged rings
  for (const r of rings) {
    if (r === draggedRing) continue;

    const restY = r.onPeg ? PEG_REST_Y : GROUND_Y;

    r.velocityY += GRAVITY * dt;
    r.mesh.position.y += r.velocityY * dt;

    if (r.mesh.position.y <= restY) {
      r.mesh.position.y = restY;
      r.velocityY = 0;
    }

    if (r.onPeg) {
      r.mesh.position.x = pegX;
    }
  }

  // 2) Resolve ring-to-ring AABB collisions (multiple passes for stability)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < rings.length; i++) {
      for (let j = i + 1; j < rings.length; j++) {
        const a = rings[i];
        const b = rings[j];
        const dx = a.mesh.position.x - b.mesh.position.x;
        const dy = a.mesh.position.y - b.mesh.position.y;
        const overlapX = 2 * halfW - Math.abs(dx);
        const overlapY = 2 * halfH - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            const push = overlapX / 2;
            const sign = dx >= 0 ? 1 : -1;
            if (a !== draggedRing) a.mesh.position.x += sign * push;
            if (b !== draggedRing) b.mesh.position.x -= sign * push;
          } else {
            // Vertical push — upper ring sits on lower ring
            if (a !== draggedRing && b !== draggedRing) {
              // Push both equally
              const push = overlapY / 2;
              const sign = dy >= 0 ? 1 : -1;
              a.mesh.position.y += sign * push;
              a.velocityY = 0;
              b.mesh.position.y -= sign * push;
              b.velocityY = 0;
            } else if (a !== draggedRing) {
              // Only push a
              const sign = dy >= 0 ? 1 : -1;
              a.mesh.position.y += sign * overlapY;
              a.velocityY = 0;
            } else if (b !== draggedRing) {
              // Only push b
              const sign = dy >= 0 ? 1 : -1;
              b.mesh.position.y -= sign * overlapY;
              b.velocityY = 0;
            }
            // Clamp to ground
            if (a.mesh.position.y < GROUND_Y) a.mesh.position.y = GROUND_Y;
            if (b.mesh.position.y < GROUND_Y) b.mesh.position.y = GROUND_Y;
          }
        }
      }
    }
  }

  renderer.render(scene, camera);
}
animate();
