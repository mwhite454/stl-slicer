import * as React from "react"
import { Card as MantineCard, CardProps as MantineCardProps, Title, Text } from '@mantine/core'

// Main Card component
const Card = React.forwardRef<HTMLDivElement, MantineCardProps>(
  ({ children, ...props }, ref) => (
    <MantineCard ref={ref} shadow="sm" padding="lg" radius="md" withBorder {...props}>
      {children}
    </MantineCard>
  )
)
Card.displayName = "Card"

// Card Header - using Card.Section
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
  <MantineCard.Section ref={ref} p="lg" {...props}>
    {children}
  </MantineCard.Section>
))
CardHeader.displayName = "CardHeader"

// Card Title - using Mantine Title
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ children, ...props }, ref) => (
  <Title ref={ref} order={3} fw={600} {...props}>
    {children}
  </Title>
))
CardTitle.displayName = "CardTitle"

// Card Description - using Mantine Text
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ children, ...props }, ref) => (
  <Text ref={ref} size="sm" c="dimmed" {...props}>
    {children}
  </Text>
))
CardDescription.displayName = "CardDescription"

// Card Content - using Card.Section
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
  <MantineCard.Section ref={ref} p="lg" pt={0} {...props}>
    {children}
  </MantineCard.Section>
))
CardContent.displayName = "CardContent"

// Card Footer - using Card.Section with flex styling
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, style, ...props }, ref) => (
  <MantineCard.Section 
    ref={ref} 
    p="lg" 
    pt={0} 
    style={{ display: 'flex', alignItems: 'center', ...style }} 
    {...props}
  >
    {children}
  </MantineCard.Section>
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
