import * as THREE from "three";
import {
  GROUND_Y, PEG_X,
  RING_OUTER_RADIUS, RING_TUBE_RADIUS,
  ROD_TOP_Y, BASE_RADIUS, BASE_TOP_Y,
  THREADED_MAX_X, OUTSIDE_MIN_X,
  RING_HALF_W, RING_HALF_H,
} from "./constants.js";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const intersection = new THREE.Vector3();
const offset = new THREE.Vector3();

let isDragging = false;
let draggedRing = null;

export function getDraggedRing() {
  return draggedRing;
}

function toNDC(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function clampDragPosition(ring, newX, newY, rings) {
  // Ground
  if (newY < GROUND_Y) newY = GROUND_Y;

  const distXToPeg = newX - PEG_X;
  const absDistX = Math.abs(distXToPeg);

  // Rod collision — threaded vs outside
  if (newY < ROD_TOP_Y) {
    if (ring.threaded) {
      if (absDistX > THREADED_MAX_X) {
        newX = PEG_X + (distXToPeg >= 0 ? THREADED_MAX_X : -THREADED_MAX_X);
      }
    } else {
      if (absDistX < OUTSIDE_MIN_X) {
        if (newY < ROD_TOP_Y - RING_TUBE_RADIUS) {
          newX = PEG_X + (distXToPeg >= 0 ? OUTSIDE_MIN_X : -OUTSIDE_MIN_X);
        }
      }
    }
  } else {
    if (absDistX < THREADED_MAX_X) {
      ring.threaded = true;
    } else if (absDistX > OUTSIDE_MIN_X) {
      ring.threaded = false;
    }
  }

  // Base collision
  const ringOuterEdge = RING_OUTER_RADIUS + RING_TUBE_RADIUS;
  if (
    Math.abs(newX - PEG_X) < ringOuterEdge + BASE_RADIUS &&
    newY - RING_TUBE_RADIUS < BASE_TOP_Y &&
    newY + RING_TUBE_RADIUS > 0
  ) {
    if (ring.mesh.position.y >= BASE_TOP_Y + RING_TUBE_RADIUS - 0.01) {
      newY = BASE_TOP_Y + RING_TUBE_RADIUS;
    } else {
      const pushDist = ringOuterEdge + BASE_RADIUS;
      newX = PEG_X + (distXToPeg >= 0 ? pushDist : -pushDist);
    }
  }

  // Ring-to-ring AABB collision
  for (const other of rings) {
    if (other === ring) continue;
    const dx = newX - other.mesh.position.x;
    const dy = newY - other.mesh.position.y;
    const overlapX = 2 * RING_HALF_W - Math.abs(dx);
    const overlapY = 2 * RING_HALF_H - Math.abs(dy);
    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        newX += dx >= 0 ? overlapX : -overlapX;
      } else {
        newY += dy >= 0 ? overlapY : -overlapY;
      }
      if (newY < GROUND_Y) newY = GROUND_Y;
    }
  }

  return { x: newX, y: newY };
}

export function setupDrag(renderer, camera, rings) {
  renderer.domElement.addEventListener("pointerdown", (event) => {
    toNDC(event);
    raycaster.setFromCamera(mouse, camera);

    const meshes = rings.map((r) => r.mesh);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      draggedRing = rings.find((r) => r.mesh === hits[0].object);
      isDragging = true;
      draggedRing.onPeg = false;
      renderer.domElement.style.cursor = "grabbing";
      raycaster.ray.intersectPlane(dragPlane, intersection);
      offset.copy(intersection).sub(draggedRing.mesh.position);
    }
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!isDragging || !draggedRing) return;
    toNDC(event);
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(dragPlane, intersection);

    const rawX = intersection.x - offset.x;
    const rawY = intersection.y - offset.y;
    const clamped = clampDragPosition(draggedRing, rawX, rawY, rings);

    draggedRing.mesh.position.x = clamped.x;
    draggedRing.mesh.position.y = clamped.y;
  });

  window.addEventListener("pointerup", () => {
    if (isDragging && draggedRing) {
      isDragging = false;
      renderer.domElement.style.cursor = "default";
      draggedRing.velocityY = 0;
      draggedRing.onPeg = false;
      draggedRing = null;
    }
  });
}
