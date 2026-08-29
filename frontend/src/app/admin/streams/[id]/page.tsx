"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useFormStatePreservation } from "@/hooks/useFormStatePreservation";
import { useCurrencyInput } from "@/hooks/useCurrencyInput";
import {
  api,
  type StreamRemainingResponse,
  type ClawbackPreviewResponse,
  ApiError,
} from "@/lib/api";
import { Breadcrumb, LoadingState, ErrorState, CurrencyInput, SessionWarning } from "@/components/ui";
import {
  getAssetInfo,
  formatAmountWithAsset,
  stroopsToAmount,
} from "@/lib/stellar/assets";

export default function AdminStreamManagementPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id as string;
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { canAccessAdmin, isAdminUIEnabled } = useAdmin();
  
  // Admin session monitoring
  const adminSession = useAdminSession();

  const [streamData, setStreamData] = useState<StreamRemainingResponse | null>(null);
  const [clawbackPreview, setClawbackPreview] = useState<ClawbackPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const [suspendReason, setSuspendReason] = useState("");
  const [resumeNote, setResumeNote] = useState("");
  const [clawbackAmount, setClawbackAmount] = useState("");

  // Form state preservation
  const formState = {
    suspendReason,
    resumeNote,
    clawbackAmount,
    streamId,
  };

  useFormStatePreservation(`admin-stream-${streamId}`, formState, {
    enabled: true,
    onRestore: (state) => {
      if (state.streamId === streamId) {
        setSuspendReason(state.suspendReason as string);
        setResumeNote(state.resumeNote as string);
        setClawbackAmount(state.clawbackAmount as string);
        setActionStatus("Form state restored after re-authentication");
      }
    },
  });

  // Get asset info from stream data
  const assetInfo = useMemo(() => {
    return getAssetInfo(streamData?.assetCode);
  }, [streamData?.assetCode]);

  const decimals = streamData?.decimals ?? assetInfo.decimals;

  // Currency input for clawback amount
  const clawbackInput = useCurrencyInput({
    asset: { ...assetInfo, decimals },
    max: streamData?.unclaimed,
    initialValue: clawbackAmount,
    onValidChange: (stroops) => {
      // Clear preview when amount changes
      setClawbackPreview(null);
    },
  });

  // Sync clawbackAmount state with input value for preservation
  useEffect(() => {
    setClawbackAmount(clawbackInput.value);
  }, [clawbackInput.value]);

  useEffect(() => {
    if (!token || !streamId) return;

    const fetchStreamData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await api.streams.getRemaining(token, streamId);
        setStreamData(data);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load stream data";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchStreamData();
  }, [token, streamId]);

  const handlePreviewClawback = async () => {
    if (!token || !clawbackInput.stroops) return;

    setActionLoading(true);
    setActionStatus(null);

    try {
      const preview = await api.streams.previewClawback(token, streamId, {
        amount: clawbackInput.stroops,
      });
      setClawbackPreview(preview);
      setActionStatus("Preview generated successfully");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to preview clawback";
      setActionStatus(`Error: ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!token) return;

    setActionLoading(true);
    setActionStatus(null);

    try {
      await api.streams.suspend(token, streamId, {
        reason: suspendReason || undefined,
      });
      setActionStatus("Stream suspended successfully");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to suspend stream";
      setActionStatus(`Error: ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!token) return;

    setActionLoading(true);
    setActionStatus(null);

    try {
      await api.streams.resume(token, streamId, {
        note: resumeNote || undefined,
      });
      setActionStatus("Stream resumed successfully");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to resume stream";
      setActionStatus(`Error: ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const breadcrumbItems = [
    { label: "Home", path: "/" },
    { label: "Admin", path: "/admin" },
    { label: "Streams", path: "/admin/streams" },
    { label: streamId },
  ];

  if (authLoading) {
    return (
      <section className="min-h-full bg-bg-primary px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <LoadingState variant="card" rows={4} />
        </div>
      </section>
    );
  }

  // Check feature flag first
  if (!isAdminUIEnabled) {
    return (
      <section className="min-h-full bg-bg-primary px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <ErrorState
            title="Feature Not Available"
            message="Admin features are currently not available."
          />
          <div className="mt-6 text-center">
            <Link
              href={`/streams/${streamId}`}
              className="inline-flex rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-gold-hover transition-colors"
            >
              View Stream Details
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated || !canAccessAdmin) {
    return (
      <section className="min-h-full bg-bg-primary px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <ErrorState
            title="Access Denied"
            message="You must be an admin to access this page."
          />
          <div className="mt-6 text-center">
            <Link
              href={`/streams/${streamId}`}
              className="inline-flex rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-gold-hover transition-colors"
            >
              View Stream Details
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-full bg-bg-primary px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Session warning */}
        <SessionWarning
          warning={adminSession.sessionWarning}
          onRefresh={adminSession.refreshSession}
        />

        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Admin Stream Management</h1>
            <p className="mt-0.5 text-xs text-text-secondary">
              Manage stream clawback, suspension, and resumption
            </p>
          </div>
          <Link
            href={`/streams/${streamId}`}
            className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-elevated px-3 py-1.5 text-sm font-medium text-text-secondary hover:border-border-hover hover:bg-card hover:text-text-primary transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 12l-4-4 4-4" />
            </svg>
            View Stream
          </Link>
        </div>

        {/* Loading state */}
        {loading && <LoadingState variant="card" rows={3} />}

        {/* Error state */}
        {error && !loading && (
          <ErrorState
            title="Failed to load stream"
            message={error}
          />
        )}

        {/* Stream data and admin actions */}
        {!loading && !error && streamData && (
          <div className="space-y-6">
            {/* Stream overview */}
            <div className="rounded-2xl border border-border-default bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-secondary">
                  Stream Overview
                </p>
                <div className="rounded-full bg-bg-elevated px-3 py-1">
                  <span className="text-xs font-semibold text-text-primary">
                    {assetInfo.symbol}
                  </span>
                  <span className="ml-1 text-xs text-text-muted">
                    ({decimals} decimals)
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-text-muted">Total Vested</p>
                  <p className="mt-1 text-lg font-bold text-text-primary">
                    {stroopsToAmount(streamData.totalVested, decimals)}
                  </p>
                  <p className="text-xs text-text-muted">{assetInfo.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Claimed</p>
                  <p className="mt-1 text-lg font-bold text-status-success">
                    {stroopsToAmount(streamData.claimed, decimals)}
                  </p>
                  <p className="text-xs text-text-muted">{assetInfo.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Unclaimed</p>
                  <p className="mt-1 text-lg font-bold text-gold">
                    {stroopsToAmount(streamData.unclaimed, decimals)}
                  </p>
                  <p className="text-xs text-text-muted">{assetInfo.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Pending Clawback</p>
                  <p className="mt-1 text-lg font-bold text-status-warning">
                    {stroopsToAmount(streamData.pendingClawback, decimals)}
                  </p>
                  <p className="text-xs text-text-muted">{assetInfo.symbol}</p>
                </div>
              </div>
            </div>

            {/* Action status */}
            {actionStatus && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  actionStatus.startsWith("Error")
                    ? "border-status-danger/20 bg-status-danger/10 text-status-danger"
                    : actionStatus.includes("restored")
                    ? "border-gold/20 bg-gold/10 text-gold"
                    : "border-status-success/20 bg-status-success/10 text-status-success"
                }`}
              >
                {actionStatus}
              </div>
            )}

            {/* Session status indicator */}
            {adminSession.isExpiringSoon && !adminSession.sessionWarning && (
              <div className="rounded-lg border border-status-warning/20 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
                Your session will expire soon. Actions will trigger re-authentication if needed.
              </div>
            )}

            {/* Clawback preview */}
            <div className="rounded-2xl border border-border-default bg-card p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-text-secondary mb-4">
                Clawback Preview
              </p>
              <div className="space-y-4">
                <CurrencyInput
                  label="Clawback Amount"
                  value={clawbackInput.value}
                  onChange={clawbackInput.setValue}
                  asset={{ ...assetInfo, decimals }}
                  error={clawbackInput.error}
                  helperText={`Maximum: ${stroopsToAmount(streamData.unclaimed, decimals)} ${assetInfo.symbol}`}
                  placeholder="Enter amount to clawback"
                />
                
                <button
                  onClick={() => void handlePreviewClawback()}
                  disabled={actionLoading || !clawbackInput.isValid}
                  className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Loading..." : "Preview Clawback"}
                </button>

                {clawbackPreview && (
                  <div className="mt-4 rounded-lg border border-border-default bg-bg-elevated p-4 space-y-2">
                    <p className="text-xs text-text-muted">Preview Results</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-text-muted">Remaining Vested</p>
                        <p className="font-medium text-text-primary">
                          {stroopsToAmount(clawbackPreview.remainingVested, decimals)} {assetInfo.symbol}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-muted">Requested Clawback</p>
                        <p className="font-medium text-status-warning">
                          {stroopsToAmount(clawbackPreview.requestedClawback, decimals)} {assetInfo.symbol}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-muted">Post-Clawback Balance</p>
                        <p className="font-medium text-text-primary">
                          {stroopsToAmount(clawbackPreview.postClawbackBalance, decimals)} {assetInfo.symbol}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-muted">Timestamp</p>
                        <p className="font-medium text-text-secondary">
                          {new Date(clawbackPreview.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Suspend stream */}
            <div className="rounded-2xl border border-border-default bg-card p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-text-secondary mb-4">
                Suspend Stream
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="suspendReason" className="block text-sm font-medium text-text-primary mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    id="suspendReason"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Enter reason for suspension"
                    rows={3}
                    className="w-full rounded-lg border border-border-default bg-bg-elevated px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none resize-none"
                  />
                </div>
                <button
                  onClick={() => void handleSuspend()}
                  disabled={actionLoading}
                  className="rounded-lg bg-status-warning px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Loading..." : "Suspend Stream"}
                </button>
              </div>
            </div>

            {/* Resume stream */}
            <div className="rounded-2xl border border-border-default bg-card p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-text-secondary mb-4">
                Resume Stream
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="resumeNote" className="block text-sm font-medium text-text-primary mb-2">
                    Note (optional)
                  </label>
                  <textarea
                    id="resumeNote"
                    value={resumeNote}
                    onChange={(e) => setResumeNote(e.target.value)}
                    placeholder="Enter note for resumption"
                    rows={3}
                    className="w-full rounded-lg border border-border-default bg-bg-elevated px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none resize-none"
                  />
                </div>
                <button
                  onClick={() => void handleResume()}
                  disabled={actionLoading}
                  className="rounded-lg bg-status-success px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Loading..." : "Resume Stream"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
