import { getApiBaseUrl } from "./env";
import { trackApiFailure } from "@/lib/analytics";
import { parseBackendError, BackendErrorResponse } from "../errorHandler";
import { z } from "zod";

export type FetchOptions = RequestInit & {
  token?: string | null;
  skipAuth?: boolean;
};

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export class ApiError extends Error {
  status: number;
  data: unknown;
  backendError?: BackendErrorResponse | null;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.backendError = parseBackendError(this);
  }
}

const TOKEN_STORAGE_KEY = "amana_jwt";

// Token refresh callback - will be set by the auth provider
let tokenRefreshCallback: (() => Promise<string | null>) | null = null;

export function setTokenRefreshCallback(callback: (() => Promise<string | null>) | null): void {
  tokenRefreshCallback = callback;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export const navigationHelpers = {
  reload(): void {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  },
};

function createHeaders(
  headers?: HeadersInit,
  token?: string | null,
): Record<string, string> {
  const resolvedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      resolvedHeaders[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      resolvedHeaders[key] = value;
    }
  } else if (headers) {
    Object.assign(resolvedHeaders, headers);
  }

  if (token) {
    resolvedHeaders.Authorization = `Bearer ${token}`;
  }

  return resolvedHeaders;
}

export function createQueryString(
  params?: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === "") {
      continue;
    }
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function request<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, skipAuth, headers, ...fetchOptions } = options;

  let authToken = token ?? (!skipAuth ? getStoredToken() : null);

  // If we have a token refresh callback and a token, try to ensure it's valid
  if (authToken && tokenRefreshCallback && !skipAuth) {
    try {
      const refreshedToken = await tokenRefreshCallback();
      if (refreshedToken) {
        authToken = refreshedToken;
      }
    } catch (error) {
      console.error('Token refresh failed in request interceptor:', error);
      // Continue with existing token, let the request fail naturally if needed
    }
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...fetchOptions,
      headers: createHeaders(headers, authToken),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      trackApiFailure(endpoint, response.status, {
        method: fetchOptions.method ?? "GET",
      });
      throw new ApiError(
        response.status,
        (data as { error?: string })?.error || response.statusText,
        data,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    trackApiFailure(endpoint, 0, {
      method: fetchOptions.method ?? "GET",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new ApiError(
      0,
      error instanceof Error ? error.message : "Network error",
    );
  }
}

export async function requestWithResult<T>(
  endpoint: string,
  schema?: z.ZodSchema<T>,
  options: FetchOptions = {},
): Promise<ApiResult<T>> {
  try {
    const data = await request<T>(endpoint, options);

    if (schema) {
      const validationResult = schema.safeParse(data);
      if (!validationResult.success) {
        throw new ApiError(
          500,
          "Response validation failed",
          validationResult.error,
        );
      }
      return { success: true, data: validationResult.data };
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof ApiError) {
      // On 401, try to refresh token once before giving up
      if (error.status === 401 && tokenRefreshCallback && !options.skipAuth) {
        try {
          const refreshedToken = await tokenRefreshCallback();
          if (refreshedToken) {
            // Retry the request with the refreshed token
            return requestWithResult<T>(endpoint, schema, {
              ...options,
              token: refreshedToken,
              // Add a flag to prevent infinite retry loops
              skipAuth: true,
            });
          }
        } catch (refreshError) {
          console.error('Token refresh failed on 401:', refreshError);
        }
      }

      // If we still have 401 after refresh attempt, clear token and reload
      if (error.status === 401) {
        const storedToken = getStoredToken();
        if (storedToken) {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          navigationHelpers.reload();
        }
      }
      return { success: false, error };
    }
    return {
      success: false,
      error: new ApiError(
        0,
        error instanceof Error ? error.message : "Unknown error",
      ),
    };
  }
}
