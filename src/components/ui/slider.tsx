"use client"

import * as React from "react"
import { Slider as MantineSlider, SliderProps as MantineSliderProps } from '@mantine/core'

export interface SliderProps extends MantineSliderProps {
  // Add any additional props if needed
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ ...props }, ref) => (
    <MantineSlider
      ref={ref}
      size="sm"
      radius="xl"
      {...props}
    />
  )
)

Slider.displayName = "Slider"

export { Slider }
