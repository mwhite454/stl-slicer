export const SVG = ({svgContent, width, height, unit="mm", zoom=1}) => {
  return (
    <div className="w-full h-full overflow-auto">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width + unit || '100%'}
        height={height + unit || '100%'}
        style={{ transform: `scale(${zoom || 1})`, transformOrigin: '0 0' }}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}