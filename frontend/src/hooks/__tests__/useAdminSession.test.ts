import { renderHook, act, waitFor } from "@testing-library/react";
import { useAdminSession } from "../useAdminSession";
import { useAuth } from "../useAuth";
import { useAdmin } from "../useAdmin";

jest.mock("../useAuth");
jest.mock("../useAdmin");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAdmin = useAdmin as jest.MockedFunction<typeof useAdmin>;

describe("useAdminSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const createMockToken = (expiresInSeconds: number): string => {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = { exp };
    const base64Payload = btoa(JSON.stringify(payload));
    return `header.${base64Payload}.signature`;
  };

  it("returns valid session when authenticated and admin with valid token", () => {
    const token = createMockToken(3600); // 1 hour

    mockUseAuth.mockReturnValue({
      token,
      isAuthenticated: true,
      isTokenExpiringSoon: jest.fn().mockReturnValue(false),
      authenticate: jest.fn(),
      address: "GADMIN123",
      shortAddress: "GADMIN...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    mockUseAdmin.mockReturnValue({
      isAdmin: true,
      isAdminUIEnabled: true,
      canAccessAdmin: true,
      adminAddresses: ["GADMIN123"],
    });

    const { result } = renderHook(() => useAdminSession());

    expect(result.current.isSessionValid).toBe(true);
    expect(result.current.canPerformActions).toBe(true);
    expect(result.current.isExpiringSoon).toBe(false);
    expect(result.current.sessionWarning).toBeNull();
  });

  it("detects token expiring soon and shows warning", () => {
    const token = createMockToken(8 * 60); // 8 minutes

    mockUseAuth.mockReturnValue({
      token,
      isAuthenticated: true,
      isTokenExpiringSoon: jest.fn().mockReturnValue(true),
      authenticate: jest.fn(),
      address: "GADMIN123",
      shortAddress: "GADMIN...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    mockUseAdmin.mockReturnValue({
      isAdmin: true,
      isAdminUIEnabled: true,
      canAccessAdmin: true,
      adminAddresses: ["GADMIN123"],
    });

    const { result } = renderHook(() => useAdminSession());

    expect(result.current.isSessionValid).toBe(true);
    expect(result.current.isExpiringSoon).toBe(true);
    expect(result.current.canPerformActions).toBe(false);
    expect(result.current.sessionWarning).toContain("expires in");
  });

  it("updates time until expiry periodically", async () => {
    const token = createMockToken(15 * 60); // 15 minutes

    mockUseAuth.mockReturnValue({
      token,
      isAuthenticated: true,
      isTokenExpiringSoon: jest.fn().mockReturnValue(false),
      authenticate: jest.fn(),
      address: "GADMIN123",
      shortAddress: "GADMIN...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    mockUseAdmin.mockReturnValue({
      isAdmin: true,
      isAdminUIEnabled: true,
      canAccessAdmin: true,
      adminAddresses: ["GADMIN123"],
    });

    const { result } = renderHook(() => useAdminSession());

    const initialTimeUntilExpiry = result.current.timeUntilExpiry;
    expect(initialTimeUntilExpiry).toBeGreaterThan(0);

    // Advance time by 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(result.current.timeUntilExpiry).toBeLessThan(initialTimeUntilExpiry!);
    });
  });

  it("calls refreshSession successfully", async () => {
    const mockAuthenticate = jest.fn().mockResolvedValue(undefined);
    const token = createMockToken(5 * 60); // 5 minutes

    mockUseAuth.mockReturnValue({
      token,
      isAuthenticated: true,
      isTokenExpiringSoon: jest.fn().mockReturnValue(true),
      authenticate: mockAuthenticate,
      address: "GADMIN123",
      shortAddress: "GADMIN...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    mockUseAdmin.mockReturnValue({
      isAdmin: true,
      isAdminUIEnabled: true,
      canAccessAdmin: true,
      adminAddresses: ["GADMIN123"],
    });

    const { result } = renderHook(() => useAdminSession());

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(mockAuthenticate).toHaveBeenCalled();
  });

  it("returns invalid session when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isTokenExpiringSoon: jest.fn().mockReturnValue(true),
      authenticate: jest.fn(),
      address: null,
      shortAddress: null,
      isWalletConnected: false,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      isAdminUIEnabled: true,
      canAccessAdmin: false,
      adminAddresses: ["GADMIN123"],
    });

    const { result } = renderHook(() => useAdminSession());

    expect(result.current.isSessionValid).toBe(false);
    expect(result.current.canPerformActions).toBe(false);
  });

  it("returns invalid session when not admin", () => {
    const token = createMockToken(3600);

    mockUseAuth.mockReturnValue({
      token,
      isAuthenticated: true,
      isTokenExpiringSoon: jest.fn().mockReturnValue(false),
      authenticate: jest.fn(),
      address: "GUSER456",
      shortAddress: "GUSER...456",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      isAdminUIEnabled: true,
      canAccessAdmin: false,
      adminAddresses: ["GADMIN123"],
    });

    const { result } = renderHook(() => useAdminSession());

    expect(result.current.isSessionValid).toBe(false);
    expect(result.current.canPerformActions).toBe(false);
  });

  it("shows warning when token expires within 10 minutes", () => {
    const token = createMockToken(9 * 60); // 9 minutes

    mockUseAuth.mockReturnValue({
      token,
      isAuthenticated: true,
      isTokenExpiringSoon: jest.fn().mockReturnValue(true),
      authenticate: jest.fn(),
      address: "GADMIN123",
      shortAddress: "GADMIN...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    mockUseAdmin.mockReturnValue({
      isAdmin: true,
      isAdminUIEnabled: true,
      canAccessAdmin: true,
      adminAddresses: ["GADMIN123"],
    });

    const { result } = renderHook(() => useAdminSession());

    expect(result.current.sessionWarning).toBe("Session expires in 9 minutes");
  });

  it("shows singular minute in warning", () => {
    const token = createMockToken(60); // 1 minute

    mockUseAuth.mockReturnValue({
      token,
      isAuthenticated: true,
      isTokenExpiringSoon: jest.fn().mockReturnValue(true),
      authenticate: jest.fn(),
      address: "GADMIN123",
      shortAddress: "GADMIN...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    mockUseAdmin.mockReturnValue({
      isAdmin: true,
      isAdminUIEnabled: true,
      canAccessAdmin: true,
      adminAddresses: ["GADMIN123"],
    });

    const { result } = renderHook(() => useAdminSession());

    expect(result.current.sessionWarning).toBe("Session expires in 1 minute");
  });
});
