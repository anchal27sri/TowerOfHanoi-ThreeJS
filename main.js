import * as THREE from "three";
import { createScene, createCamera, createRenderer, createLights, setupResize } from "./src/scene.js";
import { createGround } from "./src/ground.js";
import { createPeg } from "./src/peg.js";
import { createRings } from "./src/rings.js";
import { setupDrag, getDraggedRing } from "./src/drag.js";
import { applyGravity, resolveRingCollisions } from "./src/physics.js";

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();

createLights(scene);
createGround(scene);
createPeg(scene);

const rings = createRings(scene);

setupDrag(renderer, camera, rings);
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
