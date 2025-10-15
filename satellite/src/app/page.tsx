"use client";

import type { ReactNode } from "react";
import { db } from "@/lib/db";

const DEFAULT_AUTH_GATE_URL = "http://localhost:3010/auth-gate";
const AUTH_GATE_URL =
  process.env.NEXT_PUBLIC_ORIGIN_AUTH_GATE_URL ?? DEFAULT_AUTH_GATE_URL;

const AUTH_GATE_ORIGIN = (() => {
  try {
    return new URL(AUTH_GATE_URL).origin;
  } catch {
    return null;
  }
})();

let bridgeInitialized = false;
let lastReceivedToken: string | null = null;

function initAuthBridge() {
  if (bridgeInitialized || typeof window === "undefined") {
    return;
  }
  bridgeInitialized = true;

  if (!AUTH_GATE_ORIGIN) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Instant satellite: unable to parse auth gate origin. Set NEXT_PUBLIC_ORIGIN_AUTH_GATE_URL.",
      );
    }
    return;
  }

  const mountIframe = () => {
    if (document.querySelector('iframe[data-auth-gate="true"]')) {
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.src = AUTH_GATE_URL;
    iframe.title = "Origin Auth Gate";
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.dataset.authGate = "true";
    document.body.appendChild(iframe);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountIframe, { once: true });
  } else {
    mountIframe();
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== AUTH_GATE_ORIGIN) {
      return;
    }

    const payload = event.data;
    if (!payload || payload.type !== "instant-auth") {
      return;
    }

    const { refreshToken } = payload as {
      refreshToken?: unknown;
    };

    if (refreshToken === null) {
      if (lastReceivedToken !== null) {
        lastReceivedToken = null;
        db.auth.signOut().catch((err) => {
          console.error("Instant satellite: failed to sign out.", err);
        });
      }
      return;
    }

    if (typeof refreshToken !== "string" || refreshToken.length === 0) {
      return;
    }

    if (lastReceivedToken === refreshToken) {
      return;
    }

    lastReceivedToken = refreshToken;

    db.auth.signInWithToken(refreshToken).catch((err) => {
      console.error("Instant satellite: failed to sign in with token.", err);
      lastReceivedToken = null;
    });
  };

  window.addEventListener("message", handleMessage);
}

if (typeof window !== "undefined") {
  initAuthBridge();
}

function Page() {
  const auth = db.useAuth();

  let statusContent: ReactNode = "Not logged in.";
  if (auth.isLoading) {
    statusContent = "Checking login status...";
  } else if (auth.error) {
    statusContent = `Auth error: ${auth.error.message}`;
  } else if (auth.user) {
    statusContent = (
      <>
        Logged in as{" "}
        <span className="font-semibold text-green-600">
          {auth.user.email ?? "anonymous user"}
        </span>
        .
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md space-y-4 rounded border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-gray-900">
          Welcome to the satellite site
        </h1>
        <p className="text-gray-600">{statusContent}</p>
        <p className="text-sm text-gray-500">
          We listen for tokens from the origin auth gate iframe and sign in when
          they arrive.
        </p>
      </div>
    </main>
  );
}

export default Page;
