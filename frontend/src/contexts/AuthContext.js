import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

import { companyProfileService } from '../services/companyProfileService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser && currentUser.role !== 'SUPERADMIN') {
        try {
          const res = await companyProfileService.getProfile();
          setCompanyProfile(res.data);
        } catch (error) {
          console.error("Failed to load company profile", error);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const userData = await authService.login(username, password);
    setUser(userData);
    
    if (userData.role !== 'SUPERADMIN') {
      try {
        const res = await companyProfileService.getProfile();
        setCompanyProfile(res.data);
      } catch (error) {
        console.error("Failed to load company profile on login", error);
      }
    }
    
    return userData;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setCompanyProfile(null);
  };

  const hasRole = (roles) => {
    if (!user || !roles) return false;
    return roles.includes(user.role);
  };

  const refreshCompanyProfile = async () => {
    if (user && user.role !== 'SUPERADMIN') {
      try {
        const res = await companyProfileService.getProfile();
        setCompanyProfile(res.data);
      } catch (error) {
        console.error("Failed to refresh company profile", error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, companyProfile, refreshCompanyProfile, login, logout, hasRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
