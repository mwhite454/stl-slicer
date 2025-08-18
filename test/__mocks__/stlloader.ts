export class STLLoader {
  parse(_arrayBuffer: ArrayBuffer) {
    // Return a minimal geometry-like object with required methods for parseStl
    return {
      getAttribute: (_name: string) => null,
      setIndex: (_indices: number[]) => {},
      getIndex: () => ({ count: 0, getX: (_i: number) => 0 }),
      computeVertexNormals: () => {},
      computeBoundingBox: () => {},
      boundingBox: { clone: () => ({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }) },
    } as any;
  }
}
