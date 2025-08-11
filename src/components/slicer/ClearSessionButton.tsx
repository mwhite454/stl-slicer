"use client";

import { Button, Group } from "@mantine/core";
import React from "react";

export interface ClearSessionButtonProps {
  onClear: () => void;
}

export function ClearSessionButton({ onClear }: ClearSessionButtonProps) {
  return (
    <Group justify="flex-end" mb="md">
      <Button onClick={onClear} variant="filled" color="red" size="sm" title="Clear session and remove last STL file from storage">
        Clear Session
      </Button>
    </Group>
  );
}
