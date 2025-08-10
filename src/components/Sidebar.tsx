import React from 'react';
import { Axis } from '../utils/StlSlicer';
import {
  Box,
  Stack,
  Title,
  Text,
  FileInput,
  Radio,
  Group,
  NumberInput,
  Divider,
  ScrollArea,
  Grid,
  Button,
  Card,
  Slider,
} from '@mantine/core';

interface SidebarProps {
  file: File | null;
  dimensions: { width: number; height: number; depth: number } | null;
  axis: Axis;
  layerThickness: number;
  isSlicing: boolean;
  modelRotation: { x: number; y: number; z: number };
  setModelRotation: (rotation: { x: number; y: number; z: number }) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAxisChange: (axis: Axis) => void;
  onLayerThicknessChange: (thickness: number) => void;
  onExport: () => void;
  onViewModeChange: (mode: '2d' | '3d') => void;
  viewMode: '2d' | '3d';
}

export function Sidebar({
  file,
  dimensions,
  axis,
  layerThickness,
  isSlicing,
  modelRotation,
  setModelRotation,
  onFileChange,
  onAxisChange,
  onLayerThicknessChange,
  onExport,
  onViewModeChange,
  viewMode,
}: SidebarProps) {
  const [xRotation, setXRotation] = React.useState(modelRotation.x);
  const [yRotation, setYRotation] = React.useState(modelRotation.y);
  const [zRotation, setZRotation] = React.useState(modelRotation.z);
  const onXRotation = (value: number) => {
    setXRotation(value);
    setModelRotation({ x: value, y: yRotation, z: zRotation });
  };
  const onYRotation = (value: number) => {
    setYRotation(value);
    setModelRotation({ x: xRotation, y: value, z: zRotation });
  };
  const onZRotation = (value: number) => {
    setZRotation(value);
    setModelRotation({ x: xRotation, y: yRotation, z: value });
  };
  return (
    <Box w={256} h="100%" style={{ borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column' }}>
      <ScrollArea style={{ flex: 1 }}>
        <Stack p="md" gap="lg">
          <Stack gap="xs">
            <Title order={2} size="xl" fw={700}>STL Slicer</Title>
            <Text size="sm" c="dimmed">Upload and slice STL files</Text>
          </Stack>

          <Divider />

          {/* File Input */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>STL File</Text>
            <FileInput
              accept=".stl"
              onChange={(file) => {
                if (file) {
                  const event = {
                    target: { files: [file] }
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  onFileChange(event);
                }
              }}
              placeholder="Select STL file"
            />
            {file && <Text size="sm" c="dimmed">Selected: {file.name}</Text>}
          </Stack>

          {/* Dimensions Display */}
          {dimensions && (
            <Card>
              <Title order={4} size="sm" mb="sm">Model Dimensions</Title>
              <Stack gap="sm">
                <Box>
                  <Text size="xs" c="dimmed">Width</Text>
                  <Text size="sm" fw={500}>{dimensions.width.toFixed(2)} mm</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">Height</Text>
                  <Text size="sm" fw={500}>{dimensions.height.toFixed(2)} mm</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">Depth</Text>
                  <Text size="sm" fw={500}>{dimensions.depth.toFixed(2)} mm</Text>
                </Box>
              </Stack>
            </Card>
          )}

          {/* Axis Selection */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>Slicing Axis</Text>
            <Radio.Group value={axis} onChange={(value) => onAxisChange(value as Axis)}>
              <Group>
                {(['x', 'y', 'z'] as Axis[]).map((a) => (
                  <Radio key={a} value={a} label={a.toUpperCase()} />
                ))}
              </Group>
            </Radio.Group>
          </Stack>

          {/* Rotation of model */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>Model Rotation</Text>
            <Stack gap="sm">
              <Box>
                <Text size="xs" c="dimmed" mb="xs">X Rotation: {xRotation.toFixed(1)}°</Text>
                <Slider
                  value={xRotation}
                  min={0.1}
                  max={180}
                  step={0.1}
                  onChange={(value) => onXRotation(value)}
                />
              </Box>
              <Box>
                <Text size="xs" c="dimmed" mb="xs">Y Rotation: {yRotation.toFixed(1)}°</Text>
                <Slider
                  value={yRotation}
                  min={0.1}
                  max={180}
                  step={0.1}
                  onChange={(value) => onYRotation(value)}
                />
              </Box>
              <Box>
                <Text size="xs" c="dimmed" mb="xs">Z Rotation: {zRotation.toFixed(1)}°</Text>
                <Slider
                  value={zRotation}
                  min={0.1}
                  max={180}
                  step={0.1}
                  onChange={(value) => onZRotation(value)}
                />
              </Box>
            </Stack>
          </Stack>

          {/* Layer Thickness */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>Layer Thickness</Text>
              <Text size="xs" c="dimmed">{layerThickness.toFixed(2)} mm</Text>
            </Group>
            <Slider
              value={layerThickness}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(value) => onLayerThicknessChange(value)}
            />
            <Group align="center" gap="xs">
              <NumberInput
                value={layerThickness}
                onChange={(value) => onLayerThicknessChange(typeof value === 'number' ? value : 0.1)}
                min={0.1}
                step={0.1}
                size="xs"
                w={80}
              />
              <Text size="xs" c="dimmed">mm</Text>
            </Group>
          </Stack>

          {/* Action Buttons */}
          <Stack gap="sm">
            <Button
              onClick={onExport}
              disabled={!file}
              fullWidth
              variant="outline"
            >
              Export SVG Layers
            </Button>
          </Stack>
        </Stack>
      </ScrollArea>

      {/* View Toggle */}
      <Box style={{ borderTop: '1px solid #e9ecef', padding: '1rem' }}>
        <Stack gap="xs">
          <Text size="sm" fw={500}>View Mode</Text>
          <Group grow>
            <Button
              variant={viewMode === '3d' ? 'filled' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('3d')}
            >
              3D View
            </Button>
            <Button
              variant={viewMode === '2d' ? 'filled' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('2d')}
            >
              2D View
            </Button>
          </Group>
        </Stack>
      </Box>
    </Box>
  );
}
