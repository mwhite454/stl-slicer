"use client"

import * as React from "react"
import { Modal, ModalProps, Title, Text, Group, Stack } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'

// Main Dialog component using Mantine Modal
interface DialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Dialog = ({ children, open, onOpenChange }: DialogProps) => {
  const [opened, { open: openModal, close: closeModal }] = useDisclosure(open || false)
  
  React.useEffect(() => {
    if (open !== undefined && open !== opened) {
      if (open) openModal()
      else closeModal()
    }
  }, [open, opened, openModal, closeModal])
  
  React.useEffect(() => {
    if (onOpenChange) {
      onOpenChange(opened)
    }
  }, [opened, onOpenChange])
  
  return <>{children}</>
}

// Dialog Trigger - simple button wrapper
const DialogTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
  return <div {...props}>{children}</div>
}

// Dialog Content using Mantine Modal
interface DialogContentProps extends Omit<ModalProps, 'opened' | 'onClose'> {
  children: React.ReactNode
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, ...props }, ref) => {
    // This will be controlled by the parent Dialog component
    return (
      <Modal
        ref={ref}
        opened={false} // This should be controlled by parent
        onClose={() => {}} // This should be controlled by parent
        centered
        size="md"
        radius="md"
        {...props}
      >
        {children}
      </Modal>
    )
  }
)
DialogContent.displayName = "DialogContent"

// Dialog Header
const DialogHeader = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <Stack gap="xs" {...props}>
    {children}
  </Stack>
)
DialogHeader.displayName = "DialogHeader"

// Dialog Footer
const DialogFooter = ({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <Group 
    justify="flex-end" 
    gap="sm" 
    style={{ marginTop: '1rem', ...style }}
    {...props}
  >
    {children}
  </Group>
)
DialogFooter.displayName = "DialogFooter"

// Dialog Title
const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, ...props }, ref) => (
    <Title ref={ref} order={3} {...props}>
      {children}
    </Title>
  )
)
DialogTitle.displayName = "DialogTitle"

// Dialog Description
const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, ...props }, ref) => (
    <Text ref={ref} size="sm" c="dimmed" {...props}>
      {children}
    </Text>
  )
)
DialogDescription.displayName = "DialogDescription"

// Dialog Close - simple wrapper
const DialogClose = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
  return <div {...props}>{children}</div>
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
