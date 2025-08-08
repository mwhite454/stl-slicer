'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button, Container, Title, Text, Stack, Flex, Card } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';

export default function SignIn() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle GitHub sign in
  const handleGitHubSignIn = async () => {
    setIsRedirecting(true);
    await signIn('github', { callbackUrl: '/turso-test' });
  };

  return (
    <Container size="xs" py="xl">
      <Card withBorder shadow="md" p="xl" radius="md">
        <Stack gap="lg" align="center">
          <Title order={2}>Sign in to STL Slicer</Title>
          <Text c="dimmed" size="sm" ta="center">
            Sign in with GitHub to save your laser cutting configurations and projects
          </Text>
          
          <Button
            onClick={handleGitHubSignIn}
            loading={isRedirecting}
            leftSection={<IconBrandGithub size={20} />}
            variant="filled"
            fullWidth
            size="md"
          >
            Continue with GitHub
          </Button>
        </Stack>
      </Card>
    </Container>
  );
}
