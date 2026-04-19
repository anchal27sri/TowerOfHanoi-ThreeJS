import * as THREE from "three";
import { RING_OUTER_RADIUS, RING_TUBE_RADIUS, RING_COLORS, GROUND_Y } from "./constants.js";

export function createRings(scene) {
  const count = Math.floor(Math.random() * 6) + 3;
  const geometry = new THREE.TorusGeometry(RING_OUTER_RADIUS, RING_TUBE_RADIUS, 32, 100);
  const rings = [];

  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: RING_COLORS[i % RING_COLORS.length],
      roughness: 0.3,
      metalness: 0.7,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(-5 + i * 2.5, GROUND_Y, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    rings.push({ mesh, velocityY: 0, onPeg: false, threaded: false });
  }

  return rings;
}
