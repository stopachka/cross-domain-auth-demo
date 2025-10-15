"use client";

import type { ReactNode } from "react";
import { db } from "@/lib/db";

const AUTH_GATE_URL = process.env.NEXT_PUBLIC_ORIGIN_AUTH_GATE_URL!;
const AUTH_GATE_ORIGIN = new URL(AUTH_GATE_URL).origin;

let bridgeInitialized = false;
function initAuthBridge() {
  if (bridgeInitialized || typeof window === "undefined") {
    return;
  }
  bridgeInitialized = true;

  // 1. Create a little iframe to the origin.
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
    console.log("[satellite] got message", event);
    if (event.origin !== AUTH_GATE_ORIGIN) {
      return;
    }

    const payload = event.data;
    if (!payload || payload.type !== "instant-auth") {
      return;
    }

    const { refreshToken } = payload as {
      refreshToken?: string;
    };

    if (refreshToken) {
      db.auth.signInWithToken(refreshToken);
    } else {
      db.auth.signOut();
    }
  };

  window.addEventListener("message", handleMessage);
}

if (typeof window !== "undefined") {
  initAuthBridge();
}

function Page() {
  const auth = db.useAuth();
  if (auth.isLoading) return null;

  if (auth.error) {
    return <div>Auth error: ${auth.error.message}</div>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md space-y-4 rounded border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-gray-900">
          Welcome to the satellite site
        </h1>
        <p className="text-gray-600">
          {auth.user ? (
            <>
              Logged in as{" "}
              <span className="font-semibold text-green-600">
                {auth.user.email}
              </span>
            </>
          ) : (
            <>Not logged in.</>
          )}
        </p>
        <p className="text-sm text-gray-500">
          We listen for tokens from the origin auth gate iframe and sign in when
          they arrive.
        </p>
      </div>
    </main>
  );
}

export default Page;
