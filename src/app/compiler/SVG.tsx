import { Box } from '@mantine/core';

export const SVG = ({svgContent, width, height, unit="mm", zoom=1}: {svgContent: string, width: number, height: number, unit?: string, zoom?: number}) => {
  return (
    <Box style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width + unit || '100%'}
        height={height + unit || '100%'}
        style={{ 
          transform: `scale(${zoom || 1})`, 
          transformOrigin: '0 0',
          width: '100%',
          height: '100%'
        }}
        viewBox={`0 0 ${width} ${height}`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </Box>
  );
};