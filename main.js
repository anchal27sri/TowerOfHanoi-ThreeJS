import * as THREE from "three";
import { createScene, createCamera, createRenderer, createLights, setupResize } from "./src/scene.js";
import { createGround } from "./src/ground.js";
import { createPeg } from "./src/peg.js";
import { createRings } from "./src/rings.js";
import { setupDrag, getDraggedRing } from "./src/drag.js";
import { applyGravity, resolveRingCollisions } from "./src/physics.js";
import { computePegX } from "./src/constants.js";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();

computePegX(camera);

createLights(scene);

// World group — offset downward so objects render on the carpet area of the background
const world = new THREE.Group();
world.position.y = -2.5;
scene.add(world);

createGround(world);
createPeg(world);

const rings = createRings(world);

setupDrag(renderer, camera, rings, world);
setupResize(camera, renderer);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const dragged = getDraggedRing();

  applyGravity(rings, dragged, dt);
  resolveRingCollisions(rings, dragged);

  renderer.render(scene, camera);
}

animate();
