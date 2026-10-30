"use client";

import { useEffect, useState } from "react";

import type { RefreshTokenPayload } from "@/types";

if (typeof window === "undefined") {
  throw new Error("useAuthMiddleware must be used in the browser");
}

export class AuthMiddleware {
  private static REFRESH_TOKEN_KEY = "nm_refresh_token";
  private static readonly REFRESH_EVENT = "nm:auth-refresh";
  private static refreshCallback: (() => void) | null = null;
  private static isRefreshing = false;
  private static pendingRequests: Array<{
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];

  private static storeRefreshToken(refreshToken: RefreshTokenPayload) {
    try {
      localStorage.setItem(
        this.REFRESH_TOKEN_KEY,
        encodeURIComponent(JSON.stringify(refreshToken)),
      );
    } catch {
      return;
    }
  }

  private static clearRefreshToken() {
    try {
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch {
      return;
    }
  }

  static init() {
    window.addEventListener("nm:unauthorized", () => {
      AuthMiddleware.attemptRefresh();
    });

    window.addEventListener("nm:auth-refresh", () => {
      AuthMiddleware.attemptRefresh();
    });
  }

  static subscribeToRefresh(callback: () => void) {
    this.refreshCallback = callback;

    return () => {
      this.refreshCallback = null;
    };
  }

  static attemptRefresh() {
    if (this.isRefreshing || typeof window === "undefined") {
      return;
    }

    try {
      const encoded = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (!encoded) {
        return;
      }

      let decoded: RefreshTokenPayload;
      try {
        decoded = JSON.parse(decodeURIComponent(encoded));
      } catch {
        this.clearRefreshToken();
        return;
      }

      if (!decoded || !decoded.sub) {
        return;
      }

      this.isRefreshing = true;

      window.dispatchEvent(new CustomEvent(this.REFRESH_EVENT, {
        detail: { refreshToken: encoded },
      }));
    } catch {
    } finally {
      window.setTimeout(() => {
        this.isRefreshing = false;
      }, 200);
    }
  }

  static refreshComplete() {
    this.queueRequestCallbacks();
    window.dispatchEvent(new CustomEvent("navigate"));
  }

  private static queueRequestCallbacks() {
    this.pendingRequests.forEach(({ resolve }) => resolve({}));
    this.pendingRequests = [];
  }

  static requestShouldRefresh() {
    return this.isRefreshing;
  }
}

export function useAuthMiddleware() {
  const [shouldRefresh, setShouldRefresh] = useState(false);

  useEffect(() => {
    AuthMiddleware.init();

    const unsubscribe = AuthMiddleware.subscribeToRefresh(() => {
      setShouldRefresh((state) => {
        return !state;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { shouldRefresh };
}