"use client";

import { useEffect, useState } from "react";

interface SessionWarningProps {
  warning: string | null;
  onRefresh: () => Promise<void>;
  autoHideDuration?: number;
}

export function SessionWarning({
  warning,
  onRefresh,
  autoHideDuration = 5000,
}: SessionWarningProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (warning && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [warning, isDismissed]);

  useEffect(() => {
    if (!warning) {
      setIsDismissed(false);
    }
  }, [warning]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setIsVisible(false);
      setIsDismissed(true);
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 backdrop-blur-sm shadow-lg">
        <div className="flex items-start gap-3 p-4">
          {/* Warning icon */}
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-status-warning"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">
              Session Expiring
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {warning}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded bg-status-warning px-3 py-1.5 text-xs font-semibold text-text-inverse hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh Now"}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isRefreshing}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
