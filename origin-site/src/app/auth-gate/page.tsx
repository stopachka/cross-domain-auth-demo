"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/db";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://satellite.vercel.app",
  "http://localhost:3015",
];

const ALLOWED_PARENT_ORIGINS = (
  process.env.NEXT_PUBLIC_SATELLITE_ORIGINS ??
  DEFAULT_ALLOWED_ORIGINS.join(",")
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

type GateState = "checking" | "ready" | "denied";

function Page() {
  const auth = db.useAuth();
  const [gateState, setGateState] = useState<GateState>("checking");
  const [authorizedOrigin, setAuthorizedOrigin] = useState<string | null>(null);
  const lastSentToken = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.parent === window) {
      setGateState("denied");
      return;
    }

    const { referrer } = document;
    if (!referrer) {
      setGateState("denied");
      return;
    }

    try {
      const parentOrigin = new URL(referrer).origin;
      if (ALLOWED_PARENT_ORIGINS.includes(parentOrigin)) {
        setAuthorizedOrigin(parentOrigin);
        setGateState("ready");
      } else {
        setGateState("denied");
      }
    } catch {
      setGateState("denied");
    }
  }, []);

  useEffect(() => {
    if (gateState !== "ready") {
      return;
    }

    if (!authorizedOrigin) {
      return;
    }

    if (auth.isLoading || auth.error) {
      return;
    }

    if (!auth.user) {
      if (lastSentToken.current !== null) {
        lastSentToken.current = null;
        window.parent.postMessage(
          { type: "instant-auth", refreshToken: null },
          authorizedOrigin,
        );
      }
      return;
    }

    const refreshToken = auth.user.refresh_token;
    if (!refreshToken) {
      return;
    }

    if (lastSentToken.current === refreshToken) {
      return;
    }

    lastSentToken.current = refreshToken;

    window.parent.postMessage(
      {
        type: "instant-auth",
        refreshToken,
        email: auth.user.email ?? null,
      },
      authorizedOrigin,
    );
  }, [auth, authorizedOrigin, gateState]);

  const message = useMemo(() => {
    if (gateState === "checking") {
      return "Checking embedding...";
    }
    if (gateState === "denied") {
      return "Blocked: load this gate from a trusted satellite origin.";
    }
    if (auth.isLoading) {
      return "Waiting for login state...";
    }
    if (auth.error) {
      return `Auth error: ${auth.error.message}`;
    }
    if (!auth.user) {
      return "Iframe ready. Waiting for the user to sign in.";
    }
    return "Iframe ready. Token sent to satellite.";
  }, [auth, gateState]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md rounded border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Origin Auth Gate</h1>
        <p className="mt-3 text-sm text-gray-600">{message}</p>
      </div>
    </main>
  );
}

export default Page;
