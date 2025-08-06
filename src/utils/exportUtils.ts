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
  svgContents: { layer: LayerData; svg: string; makerjsSVG: string }[],
  baseName: string,
  axis: 'x' | 'y' | 'z' = 'z' // Default to 'z' axis
) => {
  const zip = new JSZip();

  // Add each SVG to the ZIP file
  svgContents.forEach(({ layer, svg, makerjsSVG }) => {
    const filename = `${baseName}_layer_${layer.index}_${axis}_axis.svg`;
    zip.file(filename, svg);
    zip.file(`${baseName}_layer_${layer.index}_${axis}_axis_makerjs.svg`, makerjsSVG);
  });

  // Generate the ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Save the ZIP file
  saveAs(zipBlob, `${baseName}_layers.zip`);
}; 