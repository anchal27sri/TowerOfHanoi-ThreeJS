import * as THREE from "three";
import { RING_OUTER_RADIUS, RING_TUBE_RADIUS, RING_COLORS, GROUND_Y, PEG_X } from "./constants.js";

export function createRings(scene) {
  const count = Math.floor(Math.random() * 3) + 3; // 3–5 rings
  const geometry = new THREE.TorusGeometry(RING_OUTER_RADIUS, RING_TUBE_RADIUS, 32, 100);
  const rings = [];

  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: RING_COLORS[i % RING_COLORS.length],
      roughness: 0.25,
      metalness: 0.2,
      emissive: RING_COLORS[i % RING_COLORS.length],
      emissiveIntensity: 0.15,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    // Place all rings to the left of the peg, rightmost ring first
    const spacing = 1.5;
    const startX = PEG_X - 2 - (count - 1) * spacing;
    mesh.position.set(startX + i * spacing, GROUND_Y, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    rings.push({ mesh, velocityY: 0, onPeg: false, threaded: false });
  }

  return rings;
}
