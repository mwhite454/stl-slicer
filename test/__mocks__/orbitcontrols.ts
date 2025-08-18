export class OrbitControls {
  enableDamping = true;
  dampingFactor = 0.1;
  rotateSpeed = 0.6;
  panSpeed = 0.5;
  zoomSpeed = 0.8;
  screenSpacePanning = true;
  minDistance = 1;
  maxDistance = 1000;
  target = { set: (_x: number, _y: number, _z: number) => {} };
  constructor(_camera: any, _domElement: any) {}
  update() {}
}
