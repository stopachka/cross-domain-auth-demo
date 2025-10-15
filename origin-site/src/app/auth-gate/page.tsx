"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/db";

const SATELLITE_ORIGIN = process.env.NEXT_PUBLIC_SATELLITE_ORIGIN!;
if (!SATELLITE_ORIGIN) {
  throw new Error("Oi, please set NEXT_PUBLIC_SATELLITE_ORIGIN");
}

function Page() {
  useEffect(() => {
    const { referrer } = document;
    const parentOrigin = new URL(referrer).origin;
    if (parentOrigin !== SATELLITE_ORIGIN) {
      throw new Error(
        `Access denied, parent origin needs to be ${SATELLITE_ORIGIN}`,
      );
    }
    const unsub = db.core.subscribeAuth((auth) => {
      const token = auth.user?.refresh_token;
      window.parent.postMessage(
        { type: "instant-auth", refreshToken: token },
        parentOrigin,
      );
    });
    return unsub;
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md rounded border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">
          Origin Auth Gate
        </h1>
      </div>
    </main>
  );
}

export default Page;
