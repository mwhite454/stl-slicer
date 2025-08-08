import { useState, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = useCallback(async (email: string, name?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });

      if (response.ok) {
        const data = await response.json();
        // After creating user, fetch the full user data
        await getUserByEmail(email);
        return { success: true, userId: data.userId };
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create user');
        return { success: false, error: errorData.error };
      }
    } catch (err) {
      const errorMessage = 'Network error while creating user';
      setError(errorMessage);
      console.error('Error creating user:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserByEmail = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return { success: true, user: data.user };
      } else if (response.status === 404) {
        setUser(null);
        return { success: false, error: 'User not found' };
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch user');
        return { success: false, error: errorData.error };
      }
    } catch (err) {
      const errorMessage = 'Network error while fetching user';
      setError(errorMessage);
      console.error('Error fetching user:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserById = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return { success: true, user: data.user };
      } else if (response.status === 404) {
        setUser(null);
        return { success: false, error: 'User not found' };
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch user');
        return { success: false, error: errorData.error };
      }
    } catch (err) {
      const errorMessage = 'Network error while fetching user';
      setError(errorMessage);
      console.error('Error fetching user:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userId: string, updates: { email?: string; name?: string }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ...updates }),
      });

      if (response.ok) {
        // Refresh user data
        await getUserById(userId);
        return { success: true };
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user');
        return { success: false, error: errorData.error };
      }
    } catch (err) {
      const errorMessage = 'Network error while updating user';
      setError(errorMessage);
      console.error('Error updating user:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [getUserById]);

  const loginOrCreateUser = useCallback(async (email: string, name?: string) => {
    // First try to get existing user
    const existingUser = await getUserByEmail(email);
    
    if (existingUser.success) {
      return { success: true, user: existingUser.user, isNewUser: false };
    }
    
    // If user doesn't exist, create new user
    const newUser = await createUser(email, name);
    if (newUser.success) {
      return { success: true, user, isNewUser: true };
    }
    
    return { success: false, error: newUser.error };
  }, [getUserByEmail, createUser, user]);

  return {
    user,
    loading,
    error,
    createUser,
    getUserByEmail,
    getUserById,
    updateUser,
    loginOrCreateUser,
  };
}
