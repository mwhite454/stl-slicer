import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { LayerData } from './StlSlicer';

/**
 * Export a single SVG file
 */
export const exportSvg = (svgContent: string, filename: string) => {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  saveAs(blob, filename);
};

/**
 * Export multiple SVG files as a ZIP archive
 */
export const exportSvgZip = async (
  svgContents: { layer: LayerData; svg: string }[],
  baseName: string
) => {
  const zip = new JSZip();

  // Add each SVG to the ZIP file
  svgContents.forEach(({ layer, svg }) => {
    const filename = `${baseName}_layer_${layer.index}.svg`;
    zip.file(filename, svg);
  });

  // Generate the ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Save the ZIP file
  saveAs(zipBlob, `${baseName}_layers.zip`);
}; 