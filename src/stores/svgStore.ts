import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {parse} from 'svg-parser'


interface SVGState {
  file: File | null;
  filePaths: string[];
  axis: 'x' | 'y' | 'z';
  setFile: (file: File | null) => void;
  setFilePaths: (paths: string[]) => void;
  setAxis: (axis: 'x' | 'y' | 'z') => void;
  getFilePaths: () => string[];
  getAxis: () => 'x' | 'y' | 'z';
  getFile: () => File | null;
}

export const useSVGStore = create<SVGState>()(persist(
(set, get) => ({
  file: null,
  filePaths: [],
  setFile: (file) => {
    if (file) {
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      if (fileExtension === 'svg') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const svgContent = event.target?.result as string;
          const parsedSvg = parse(svgContent);
          // Extract paths from the parsed SVG
          const paths: string[] = [];
          get().setFilePaths(paths);
        };
        reader.readAsText(file);
      }
    }
    
    set({ file });
  },
  setFilePaths: (paths: string[]) => set({ filePaths: paths }),
  axis: 'y',
  setAxis: (axis) => set({ axis }),
    getFilePaths: () => get().filePaths,
    getAxis: () => get().axis,
    getFile: () => get().file,
}),
  {
    name: 'file-store',
    storage: createJSONStorage(() => localStorage),
  }
));

