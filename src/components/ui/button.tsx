import * as React from "react"
import { Button as MantineButton, ButtonProps as MantineButtonProps } from '@mantine/core'

// Map shadcn/ui variants to Mantine variants
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends Omit<MantineButtonProps, 'variant' | 'size'> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  title?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    // Map shadcn variants to Mantine variants
    const getMantineVariant = (variant: ButtonVariant): MantineButtonProps['variant'] => {
      switch (variant) {
        case 'default': return 'filled'
        case 'destructive': return 'filled'
        case 'outline': return 'outline'
        case 'secondary': return 'light'
        case 'ghost': return 'subtle'
        case 'link': return 'transparent'
        default: return 'filled'
      }
    }

    // Map shadcn sizes to Mantine sizes
    const getMantineSize = (size: ButtonSize): MantineButtonProps['size'] => {
      switch (size) {
        case 'sm': return 'xs'
        case 'default': return 'sm'
        case 'lg': return 'md'
        case 'icon': return 'sm'
        default: return 'sm'
      }
    }

    const mantineVariant = getMantineVariant(variant)
    const mantineSize = getMantineSize(size)
    
    // Handle destructive variant with red color
    const color = variant === 'destructive' ? 'red' : undefined
    
    // Handle icon size with square styling
    const style = size === 'icon' ? { width: '36px', height: '36px', padding: 0 } : undefined

    if (asChild) {
      // For asChild behavior, we'll just render the children directly
      // This is a simplified approach since Mantine doesn't have Slot equivalent
      return <>{children}</>
    }

    return (
      <MantineButton
        ref={ref}
        variant={mantineVariant}
        size={mantineSize}
        color={color}
        style={style}
        {...props}
      >
        {children}
      </MantineButton>
    )
  }
)

Button.displayName = "Button"

export { Button }
