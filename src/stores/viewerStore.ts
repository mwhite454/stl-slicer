import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ViewerState {
    zoom: number;
    panX: number;
    panY: number;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    resetView: () => void;
    getZoom: () => number;
    getPan: () => { x: number; y: number };
}
export const useViewerStore = create<ViewerState>()(persist(
    (set, get) => ({
        zoom: 1,
        panX: 0,
        panY: 0,
        setZoom: (zoom) => set({ zoom }),
        setPan: (x, y) => set({ panX: x, panY: y }),
        resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
        getZoom: () => get().zoom,
        getPan: () => ({ x: get().panX, y: get().panY }),
    }),
    {
        name: 'viewer-store',
        storage: createJSONStorage(() => localStorage),
    }
));
// This store manages the viewer's zoom and pan state, allowing for dynamic adjustments
// and persistence across sessions. It provides methods to set and reset the view, as well as to retrieve the current zoom level and pan position.
// The state is persisted in local storage, ensuring that user preferences are maintained even after the browser is closed or refreshed.