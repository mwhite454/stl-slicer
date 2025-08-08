import { UserConfigTest } from '@/components/UserConfigTest';
import { Container, Title, Text } from '@mantine/core';

export default function TursoTestPage() {
  return (
    <Container size="md" py="xl">
      <Title order={1} ta="center" mb="md">
        Turso Database Integration Test
      </Title>
      <Text ta="center" mb="xl" c="dimmed">
        Test the user configuration storage with Turso database
      </Text>
      <UserConfigTest />
    </Container>
  );
}
