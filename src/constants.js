export const RING_OUTER_RADIUS = 1;
export const RING_TUBE_RADIUS = 0.15;
export const ROD_RADIUS = 0.08;
export const ROD_HEIGHT = 2.5;
export const ROD_TOP_Y = ROD_HEIGHT;
export const BASE_RADIUS = 0.6;
export const BASE_HEIGHT = 0.1;
export const BASE_TOP_Y = BASE_HEIGHT;

export const TUBE_ROD_SUM = RING_TUBE_RADIUS + ROD_RADIUS;
export const THREADED_MAX_X = RING_OUTER_RADIUS - TUBE_ROD_SUM;
export const OUTSIDE_MIN_X = RING_OUTER_RADIUS + TUBE_ROD_SUM;

export const GRAVITY = -9.8;
export const GROUND_Y = RING_TUBE_RADIUS;
export const PEG_REST_Y = BASE_HEIGHT + RING_TUBE_RADIUS;

export const RING_HALF_W = RING_OUTER_RADIUS + RING_TUBE_RADIUS;
export const RING_HALF_H = RING_TUBE_RADIUS;

export const RING_COLORS = [
  0xe8a525, 0xe05555, 0x55b5e0, 0x55e085,
  0xc055e0, 0xe0a055, 0xe05599, 0x55e0d0,
];

export const PEG_X = 3;
