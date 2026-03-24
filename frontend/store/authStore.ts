import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  birthday: string;
  zodiac_sign: string;
  partner_id?: string;
  partner_name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, birthday: string, zodiac_sign: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  signup: async (email: string, password: string, name: string, birthday: string, zodiac_sign: string) => {
    try {
      const response = await api.post('/auth/signup', { 
        email, 
        password, 
        name, 
        birthday, 
        zodiac_sign 
      });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Signup failed');
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const response = await api.get('/profile');
      set({ 
        user: response.data, 
        token, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      await AsyncStorage.removeItem('token');
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    }
  },

  updateUser: (user: User) => {
    set({ user });
  }
}));