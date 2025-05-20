import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { DocumentSettings } from './DocumentSettings';
import { DocumentSettings as DocumentSettingsType } from '../types';

interface HeaderProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportSvg: () => void;
  documentSettings: DocumentSettingsType;
  onSettingsChange: (field: keyof DocumentSettingsType, value: string | number) => void;
}

export function Header({ onFileUpload, onExportSvg, documentSettings, onSettingsChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept=".svg"
          onChange={onFileUpload}
          className="hidden"
          id="file-upload"
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload SVG
        </Button>
        <Button variant="outline" onClick={onExportSvg}>
          <Download className="w-4 h-4 mr-2" />
          Export SVG
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <DocumentSettings
          settings={documentSettings}
          onSettingsChange={onSettingsChange}
        />
      </div>
    </header>
  );
} 