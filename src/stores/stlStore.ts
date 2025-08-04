import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Zustand store for managing file and axis state
// with persistence using localStorage
interface STLState {
    file: File | null;
    axis: 'x' | 'y' | 'z';
    setFile: (file: File | null) => void;
    setAxis: (axis: 'x' | 'y' | 'z') => void;
    getAxis: () => 'x' | 'y' | 'z';
    getFile: () => File | null;
}
export const useSTLStore = create<STLState>()(persist(
    (set, get) => ({
        file: null,
        filePaths: [],
        setFile: (file) => {
            if (file) {
                const fileName = file.name;
                const fileExtension = fileName.split('.').pop()?.toLowerCase();
                if (fileExtension === 'stl') {
                    // Handle STL file parsing if necessary
                    // For now, we just set the file
                }
            }
            set({ file });
        }
        ,
        axis: 'y',
        setAxis: (axis) => set({ axis }),         
        getAxis: () => get().axis,
        getFile: () => get().file,
    }),
    {
        name: 'stl-store',
        storage: createJSONStorage(() => localStorage),
    }
));

