import { request, requestWithResult, setTokenRefreshCallback, ApiError } from "../client";
import { getApiBaseUrl } from "../env";

// Mock the env module
jest.mock("../env", () => ({
  getApiBaseUrl: jest.fn(() => "https://api.test.com"),
}));

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  trackApiFailure: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe("API Client Token Refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    setTokenRefreshCallback(null);
  });

  afterEach(() => {
    setTokenRefreshCallback(null);
  });

  describe("Token refresh interceptor", () => {
    it("calls token refresh callback before request when token exists", async () => {
      const mockRefresh = jest.fn().mockResolvedValue("refreshed-token");
      setTokenRefreshCallback(mockRefresh);

      sessionStorage.setItem("amana_jwt", "old-token");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await request("/test", { method: "GET" });

      expect(mockRefresh).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer refreshed-token",
          }),
        })
      );
    });

    it("uses provided token instead of stored token", async () => {
      const mockRefresh = jest.fn().mockResolvedValue("refreshed-token");
      setTokenRefreshCallback(mockRefresh);

      sessionStorage.setItem("amana_jwt", "stored-token");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await request("/test", { method: "GET", token: "provided-token" });

      expect(mockRefresh).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer refreshed-token",
          }),
        })
      );
    });

    it("skips token refresh when skipAuth is true", async () => {
      const mockRefresh = jest.fn().mockResolvedValue("refreshed-token");
      setTokenRefreshCallback(mockRefresh);

      sessionStorage.setItem("amana_jwt", "old-token");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await request("/test", { method: "GET", skipAuth: true });

      expect(mockRefresh).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    it("continues with old token if refresh fails", async () => {
      const mockRefresh = jest.fn().mockRejectedValue(new Error("Refresh failed"));
      setTokenRefreshCallback(mockRefresh);

      sessionStorage.setItem("amana_jwt", "old-token");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await request("/test", { method: "GET" });

      expect(mockRefresh).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer old-token",
          }),
        })
      );
    });

    it("does not call refresh callback when no token exists", async () => {
      const mockRefresh = jest.fn().mockResolvedValue("refreshed-token");
      setTokenRefreshCallback(mockRefresh);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await request("/test", { method: "GET" });

      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe("401 handling with retry", () => {
    it("retries request once with refreshed token on 401", async () => {
      const mockRefresh = jest.fn().mockResolvedValue("new-token");
      setTokenRefreshCallback(mockRefresh);

      sessionStorage.setItem("amana_jwt", "old-token");

      // First call returns 401
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthorized" }),
        })
        // Second call (retry) succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const result = await requestWithResult("/test");

      expect(result.success).toBe(true);
      expect(mockRefresh).toHaveBeenCalledTimes(2); // Once before original, once on 401
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("does not retry if token refresh fails on 401", async () => {
      const mockRefresh = jest
        .fn()
        .mockResolvedValueOnce("old-token") // Initial refresh
        .mockRejectedValueOnce(new Error("Refresh failed")); // Refresh on 401 fails

      setTokenRefreshCallback(mockRefresh);

      sessionStorage.setItem("amana_jwt", "old-token");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      const result = await requestWithResult("/test");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.status).toBe(401);
      }
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it("clears token and reloads on persistent 401", async () => {
      const mockReload = jest.fn();
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, reload: mockReload } as any;

      const mockRefresh = jest.fn().mockResolvedValue("new-token");
      setTokenRefreshCallback(mockRefresh);

      sessionStorage.setItem("amana_jwt", "old-token");

      // Both calls return 401
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      await requestWithResult("/test");

      expect(sessionStorage.getItem("amana_jwt")).toBeNull();
      expect(mockReload).toHaveBeenCalled();

      window.location = originalLocation;
    });

    it("does not reload on 401 if no stored token", async () => {
      const mockReload = jest.fn();
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, reload: mockReload } as any;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      await requestWithResult("/test", undefined, { skipAuth: true });

      expect(mockReload).not.toHaveBeenCalled();

      window.location = originalLocation;
    });
  });

  describe("Token refresh callback management", () => {
    it("allows setting and clearing token refresh callback", () => {
      const mockCallback = jest.fn();

      setTokenRefreshCallback(mockCallback);
      // Callback is set internally, we can't directly verify but can test its effect

      setTokenRefreshCallback(null);
      // Callback is cleared
    });

    it("uses the most recently set callback", async () => {
      const mockCallback1 = jest.fn().mockResolvedValue("token1");
      const mockCallback2 = jest.fn().mockResolvedValue("token2");

      setTokenRefreshCallback(mockCallback1);
      setTokenRefreshCallback(mockCallback2);

      sessionStorage.setItem("amana_jwt", "old-token");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await request("/test");

      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.test.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token2",
          }),
        })
      );
    });
  });

  describe("Error handling", () => {
    it("throws ApiError on non-OK response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      });

      await expect(request("/test")).rejects.toThrow(ApiError);
    });

    it("throws ApiError on network error", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      await expect(request("/test")).rejects.toThrow(ApiError);
    });
  });
});
