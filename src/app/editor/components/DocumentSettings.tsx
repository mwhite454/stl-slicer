import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from 'lucide-react';
import { DocumentSettings as DocumentSettingsType } from '../types';

interface DocumentSettingsProps {
  settings: DocumentSettingsType;
  onSettingsChange: (field: keyof DocumentSettingsType, value: string | number) => void;
}

export function DocumentSettings({ settings, onSettingsChange }: DocumentSettingsProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-2 hover:bg-gray-100 rounded-md">
          <Settings className="w-5 h-5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Document Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="width" className="text-right">
              Width
            </Label>
            <Input
              id="width"
              type="number"
              value={settings.width}
              onChange={(e) => onSettingsChange('width', parseFloat(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="height" className="text-right">
              Height
            </Label>
            <Input
              id="height"
              type="number"
              value={settings.height}
              onChange={(e) => onSettingsChange('height', parseFloat(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit" className="text-right">
              Unit
            </Label>
            <Select
              value={settings.unit}
              onValueChange={(value) => onSettingsChange('unit', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">Millimeters (mm)</SelectItem>
                <SelectItem value="in">Inches (in)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 