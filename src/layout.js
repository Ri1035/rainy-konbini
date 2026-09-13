/**
 * layout.js — 全场布局常量（各模块共用，改这里就能整体调形）
 */
export const L = {
  BASE: 21,            // 底座半宽：x,z ∈ [-21, 21]
  BASE_T: 2.6,         // 底座厚度
  CURB_H: 0.34,        // 人行道（路缘）高度
  ROAD_Y: 0.036,       // 沥青面高度
  MIRROR_Y: 0.012,     // 镜面反射面高度

  STORE: { x0: -12, x1: 8, z0: -11, z1: 3, wall: 5.6, para: 5.95, floorY: 0.36, ceilY: 4.5 },
  DOOR: { x0: -1.6, x1: 2.4 },

  SW_FRONT: { x0: -21, x1: 13, z0: 3, z1: 7 },
  SW_EAST: { x0: 8, x1: 13, z0: -11, z1: 3 },
  SW_NORTH: { x0: -21, x1: 13, z0: -12.6, z1: -11 },   // 店后窄通道（西侧广场）
  ROAD_S: { x0: -21, x1: 21, z0: 7, z1: 15.5 },
  ROAD_E: { x0: 13, x1: 18.5, z0: -21, z1: 7 },
  SW_FAR_S: { x0: -21, x1: 21, z0: 15.5, z1: 21 },
  SW_FAR_E: { x0: 18.5, x1: 21, z0: -21, z1: 7 },

  ALLEY: { x0: -14.6, x1: -12, z0: -18, z1: 3 },
  BACKLOT: { x0: -12, x1: 8, z0: -18.4, z1: -11 },
  NEIGH_W: { x0: -21, x1: -14.6, z0: -18, z1: -2.2, h: 8.6 },
  WALL_N: { z: -18.7, h: 2.3 },
};

export const inRect = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
