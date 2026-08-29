import { renderHook, act } from "@testing-library/react";
import { useFormStatePreservation } from "../useFormStatePreservation";
import { useAuth } from "../useAuth";

jest.mock("../useAuth");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("useFormStatePreservation", () => {
  const formId = "test-form";
  const mockFormState = {
    field1: "value1",
    field2: "value2",
    number: 123,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it("saves form state when authentication is lost", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      token: "mock-token",
      address: "GTEST123",
      shortAddress: "GTEST...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    const { rerender } = renderHook(
      ({ state }) => useFormStatePreservation(formId, state),
      { initialProps: { state: mockFormState } }
    );

    // Simulate authentication loss
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      token: null,
      address: null,
      shortAddress: null,
      isWalletConnected: false,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    rerender({ state: mockFormState });

    const stored = sessionStorage.getItem(`admin_form_state_${formId}`);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(mockFormState);
  });

  it("restores form state when authentication is regained", () => {
    const onRestore = jest.fn();

    // Start unauthenticated with saved state
    sessionStorage.setItem(
      `admin_form_state_${formId}`,
      JSON.stringify(mockFormState)
    );

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      token: null,
      address: null,
      shortAddress: null,
      isWalletConnected: false,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    const { rerender } = renderHook(
      () =>
        useFormStatePreservation(formId, mockFormState, {
          onRestore,
        }),
      { initialProps: {} }
    );

    // Simulate authentication restoration
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      token: "new-token",
      address: "GTEST123",
      shortAddress: "GTEST...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    rerender();

    expect(onRestore).toHaveBeenCalledWith(mockFormState);
    expect(sessionStorage.getItem(`admin_form_state_${formId}`)).toBeNull();
  });

  it("does not save state when disabled", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      token: "mock-token",
      address: "GTEST123",
      shortAddress: "GTEST...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    const { rerender } = renderHook(
      () =>
        useFormStatePreservation(formId, mockFormState, {
          enabled: false,
        }),
      { initialProps: {} }
    );

    // Simulate authentication loss
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      token: null,
      address: null,
      shortAddress: null,
      isWalletConnected: false,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    rerender();

    expect(sessionStorage.getItem(`admin_form_state_${formId}`)).toBeNull();
  });

  it("provides manual save function", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      token: "mock-token",
      address: "GTEST123",
      shortAddress: "GTEST...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    const { result } = renderHook(() =>
      useFormStatePreservation(formId, mockFormState)
    );

    act(() => {
      result.current.saveFormState();
    });

    const stored = sessionStorage.getItem(`admin_form_state_${formId}`);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(mockFormState);
  });

  it("provides manual load function", () => {
    sessionStorage.setItem(
      `admin_form_state_${formId}`,
      JSON.stringify(mockFormState)
    );

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      token: "mock-token",
      address: "GTEST123",
      shortAddress: "GTEST...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    const { result } = renderHook(() =>
      useFormStatePreservation(formId, mockFormState)
    );

    let loadedState: typeof mockFormState | null = null;
    act(() => {
      loadedState = result.current.loadFormState();
    });

    expect(loadedState).toEqual(mockFormState);
  });

  it("provides manual clear function", () => {
    sessionStorage.setItem(
      `admin_form_state_${formId}`,
      JSON.stringify(mockFormState)
    );

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      token: "mock-token",
      address: "GTEST123",
      shortAddress: "GTEST...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    const { result } = renderHook(() =>
      useFormStatePreservation(formId, mockFormState)
    );

    act(() => {
      result.current.clearFormState();
    });

    expect(sessionStorage.getItem(`admin_form_state_${formId}`)).toBeNull();
  });

  it("handles invalid JSON in storage gracefully", () => {
    sessionStorage.setItem(`admin_form_state_${formId}`, "invalid json");

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      token: "mock-token",
      address: "GTEST123",
      shortAddress: "GTEST...123",
      isWalletConnected: true,
      isWalletDetected: true,
      isLoading: false,
      error: null,
      connectWallet: jest.fn(),
      authenticate: jest.fn(),
      logout: jest.fn(),
      refreshAuth: jest.fn(),
      isTokenExpiringSoon: jest.fn(),
      ensureValidToken: jest.fn(),
    });

    const { result } = renderHook(() =>
      useFormStatePreservation(formId, mockFormState)
    );

    let loadedState: typeof mockFormState | null = null;
    act(() => {
      loadedState = result.current.loadFormState();
    });

    expect(loadedState).toBeNull();
  });
});
