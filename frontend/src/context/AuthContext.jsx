import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';

const AuthContext = createContext(null);

const cache = {
  set: (key, data, ttl = 300000) => { 
    const item = {
      data,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  get: (key) => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    if (Date.now() > parsed.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  },
  clear: (pattern) => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      const cachedUser = cache.get('current_user');
      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
        return;
      }
      
      const userData = await api.users.me();
      setUser(userData);
      cache.set('current_user', userData);
      setError(null);
    } catch (err) {
      console.error('Проверка авторизации провалена:', err);
      setUser(null);
      setError(err.message);
      cache.clear('current_user');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    cache.clear('current_user');
    await checkAuth();
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.users.login({ email, password });
      
      if (response.user) {
        setUser(response.user);
        cache.set('current_user', response.user);
      } else {
        await checkAuth();
      }
      
      navigate('/dashboard');
      return true;
    } catch (err) {
      setError(err.message || 'Ошибка входа');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, firstName, lastName, phoneNumber) => {
    setLoading(true);
    setError(null);
    try {
      const data = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber
      };
      await api.users.register(data);
      await login(email, password);
      return true;
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.users.logout();
    } catch (err) {
      console.error('Ошибка выхода:', err);
    } finally {
      setUser(null);
      cache.clear('');
      navigate('/login');
    }
  };

  const value = {
    user,
    setUser,
    loading,
    error,
    login,
    register,
    logout,
    checkAuth,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен быть использован внутри AuthProvider');
  }
  return context;
};