import * as React from "react"
import { TextInput, TextInputProps } from '@mantine/core'

export interface InputProps extends Omit<TextInputProps, 'size'> {
  size?: 'sm' | 'default' | 'lg'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'default', ...props }, ref) => {
    // Map shadcn sizes to Mantine sizes
    const getMantineSize = (size: string): TextInputProps['size'] => {
      switch (size) {
        case 'sm': return 'xs'
        case 'default': return 'sm'
        case 'lg': return 'md'
        default: return 'sm'
      }
    }

    return (
      <TextInput
        ref={ref}
        size={getMantineSize(size)}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
