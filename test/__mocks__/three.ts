// Minimal mock of three.js classes used in tests
export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}
}

export class Vector3 {
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {}
  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
  lerpVectors(a: Vector3, b: Vector3, t: number): this {
    this.x = a.x + (b.x - a.x) * t;
    this.y = a.y + (b.y - a.y) * t;
    this.z = a.z + (b.z - a.z) * t;
    return this;
  }
}

export class MeshBasicMaterial {
  constructor(_opts?: any) {}
}

export class Mesh {
  constructor(public geometry: any, public material: any) {}
}

export class Box3 {
  min = { x: 0, y: 0, z: 0 };
  max = { x: 0, y: 0, z: 0 };
  setFromObject(_obj: any): this { return this; }
  getSize(target: Vector3): Vector3 { target.x = this.max.x - this.min.x; target.y = this.max.y - this.min.y; target.z = this.max.z - this.min.z; return target; }
}

// Placeholders to avoid runtime import errors in modules that import THREE namespace
export default { Vector2, Vector3, Mesh, MeshBasicMaterial, Box3 } as any;
