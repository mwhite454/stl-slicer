declare module 'three/examples/jsm/loaders/STLLoader' {
  import { BufferGeometry, Loader, LoadingManager } from 'three';

  export class STLLoader extends Loader {
    constructor(manager?: LoadingManager);
    parse(data: ArrayBuffer | string): BufferGeometry;
    load(
      url: string,
      onLoad?: (geometry: BufferGeometry) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }
} 