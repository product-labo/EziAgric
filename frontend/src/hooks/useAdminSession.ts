"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useAdmin } from "./useAdmin";

interface AdminSessionStatus {
  isSessionValid: boolean;
  isExpiringSoon: boolean;
  timeUntilExpiry: number | null;
  canPerformActions: boolean;
  sessionWarning: string | null;
  refreshSession: () => Promise<void>;
}

/**
 * Hook for managing admin session state and token refresh
 * Provides proactive notifications when session is expiring
 * and ensures tokens are refreshed before critical operations
 */
export function useAdminSession(): AdminSessionStatus {
  const { token, isAuthenticated, authenticate, isTokenExpiringSoon } = useAuth();
  const { canAccessAdmin } = useAdmin();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);

  // Calculate time until expiry
  useEffect(() => {
    if (!token) {
      setTimeUntilExpiry(null);
      return;
    }

    const calculateExpiry = () => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const exp = payload.exp;
        if (!exp) {
          setTimeUntilExpiry(null);
          return;
        }

        const now = Date.now();
        const expiryTime = exp * 1000;
        const remaining = Math.max(0, expiryTime - now);
        setTimeUntilExpiry(remaining);

        // Set warning if expiring within 10 minutes
        const tenMinutes = 10 * 60 * 1000;
        if (remaining > 0 && remaining <= tenMinutes) {
          const minutes = Math.ceil(remaining / 60000);
          setSessionWarning(`Session expires in ${minutes} minute${minutes !== 1 ? 's' : ''}`);
        } else {
          setSessionWarning(null);
        }
      } catch (error) {
        console.error('Failed to calculate token expiry:', error);
        setTimeUntilExpiry(null);
      }
    };

    // Calculate immediately
    calculateExpiry();

    // Update every 30 seconds
    const interval = setInterval(calculateExpiry, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const refreshSession = useCallback(async () => {
    try {
      await authenticate();
      setSessionWarning(null);
    } catch (error) {
      console.error('Failed to refresh session:', error);
      throw error;
    }
  }, [authenticate]);

  const isExpiringSoon = isTokenExpiringSoon();
  const isSessionValid = isAuthenticated && canAccessAdmin && !!token;
  const canPerformActions = isSessionValid && !isExpiringSoon;

  return {
    isSessionValid,
    isExpiringSoon,
    timeUntilExpiry,
    canPerformActions,
    sessionWarning,
    refreshSession,
  };
}
