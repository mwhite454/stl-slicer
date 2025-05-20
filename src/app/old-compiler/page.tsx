'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

export default function Home() {
    const [mergedSVG, setMergedSVG] = useState('');

    const handleUpload = async (event:any) => {
      const formData = new FormData();
      for (const file of event.target.files) {
        formData.append('files', file);
      }
  
      const response = await fetch('/api/compiler', {
        method: 'POST',
        body: formData,
      });
  
      const result = await response;
      console.log(result)
      const newSvg = response.json();
      setMergedSVG(newSvg.mergedSVG);
    };
  
    return (
      <div className="p-4">
     <input
      type="file"
      name="file"
      multiple
      onChange={async (e) => {
        console.log(e)
        if (e.target.files) {
          const formData = new FormData();
          Object.values(e.target.files).forEach((file) => {
            formData.append("file", file);
          });
          console.log(e.target.files)

          const response = await fetch("/api/compiler", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();
          console.log(result)
          if (result.success) {
            alert("Upload ok : " + result.files.join(", "));
          } else {
            alert("Upload failed");
          }
        }
      }}
    />
        {mergedSVG && (
          <div className="mt-4">
            <h2>Merged SVG:</h2>
            <object type="image/svg+xml" data={mergedSVG} />
          </div>
        )}
      </div>
  );
}



