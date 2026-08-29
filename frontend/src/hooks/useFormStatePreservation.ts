"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

interface FormStateStorage {
  [key: string]: unknown;
}

const FORM_STATE_STORAGE_KEY = "admin_form_state_";

/**
 * Hook to preserve form state during re-authentication
 * Automatically saves form state when authentication is lost
 * and restores it after successful re-authentication
 */
export function useFormStatePreservation<T extends FormStateStorage>(
  formId: string,
  formState: T,
  options: {
    enabled?: boolean;
    onRestore?: (state: T) => void;
  } = {}
) {
  const { enabled = true, onRestore } = options;
  const { isAuthenticated } = useAuth();
  const previousAuthState = useRef(isAuthenticated);
  const storageKey = `${FORM_STATE_STORAGE_KEY}${formId}`;

  // Save form state to sessionStorage
  const saveFormState = useCallback(() => {
    if (!enabled) return;
    
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(formState));
      console.log(`Form state saved for ${formId}`);
    } catch (error) {
      console.error('Failed to save form state:', error);
    }
  }, [formId, formState, enabled, storageKey]);

  // Load form state from sessionStorage
  const loadFormState = useCallback((): T | null => {
    if (!enabled) return null;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return null;

      const state = JSON.parse(stored) as T;
      console.log(`Form state restored for ${formId}`);
      return state;
    } catch (error) {
      console.error('Failed to load form state:', error);
      return null;
    }
  }, [formId, enabled, storageKey]);

  // Clear form state from sessionStorage
  const clearFormState = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
      console.log(`Form state cleared for ${formId}`);
    } catch (error) {
      console.error('Failed to clear form state:', error);
    }
  }, [formId, storageKey]);

  // Monitor authentication state changes
  useEffect(() => {
    if (!enabled) return;

    // If we were authenticated and now we're not, save state
    if (previousAuthState.current && !isAuthenticated) {
      console.log('Authentication lost, saving form state');
      saveFormState();
    }

    // If we weren't authenticated and now we are, try to restore state
    if (!previousAuthState.current && isAuthenticated) {
      console.log('Authentication restored, checking for saved form state');
      const savedState = loadFormState();
      if (savedState && onRestore) {
        onRestore(savedState);
        // Clear after successful restore
        clearFormState();
      }
    }

    previousAuthState.current = isAuthenticated;
  }, [isAuthenticated, enabled, saveFormState, loadFormState, clearFormState, onRestore]);

  // Save state before page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (!isAuthenticated) {
        saveFormState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, isAuthenticated, saveFormState]);

  return {
    saveFormState,
    loadFormState,
    clearFormState,
  };
}
