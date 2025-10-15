"use client";

import { FormEvent, useRef, useState } from "react";
import { db } from "@/lib/db";

const SATELLITE_URL = (() => {
  const configuredOrigins =
    process.env.NEXT_PUBLIC_SATELLITE_ORIGINS?.split(",") ?? [];
  const trimmedOrigins = configuredOrigins
    .map((origin) => origin.trim())
    .filter(Boolean);
  return (
    trimmedOrigins.find((origin) => origin.startsWith("https://")) ??
    trimmedOrigins[0] ??
    "https://cross-domain-satellite.vercel.app"
  );
})();

function Page() {
  return (
    <>
      <db.SignedIn>
        <SignedIn />
      </db.SignedIn>
      <db.SignedOut>
        <Login />
      </db.SignedOut>
    </>
  );
}

function SignedIn() {
  const user = db.useUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-6 px-4 text-center">
      <h1 className="text-3xl font-semibold">Welcome to the origin site</h1>
      <p className="text-gray-600">
        You are signed in as <span className="font-medium">{user.email}</span>.
      </p>
      <p className="text-gray-600">
        <a
          href={SATELLITE_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          Now visit this page: {SATELLITE_URL}
        </a>
      </p>
      <button
        onClick={() => db.auth.signOut()}
        className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
      >
        Sign out
      </button>
    </main>
  );
}

function Login() {
  const [sentEmail, setSentEmail] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">
            Welcome to the origin site
          </h1>
          <p className="text-gray-600">
            Log in here, then head to the satellite site.
          </p>
        </header>
        {!sentEmail ? (
          <EmailStep onSendEmail={setSentEmail} />
        ) : (
          <CodeStep sentEmail={sentEmail} />
        )}
      </div>
    </main>
  );
}

function EmailStep({ onSendEmail }: { onSendEmail: (email: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const inputEl = inputRef.current!;
    const email = inputEl.value.trim();
    if (!email) {
      return;
    }
    onSendEmail(email);
    db.auth.sendMagicCode({ email }).catch((err) => {
      alert("Uh oh :" + err.body?.message);
      onSendEmail("");
    });
  };

  return (
    <form
      key="email"
      onSubmit={handleSubmit}
      className="flex flex-col space-y-4"
    >
      <label className="text-left text-sm font-semibold text-gray-700">
        Email address
      </label>
      <input
        ref={inputRef}
        type="email"
        className="w-full border border-gray-300 px-3 py-2"
        placeholder="you@example.com"
        required
        autoFocus
      />
      <button
        type="submit"
        className="w-full rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
      >
        Send code
      </button>
    </form>
  );
}

function CodeStep({ sentEmail }: { sentEmail: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const inputEl = inputRef.current!;
    const code = inputEl.value.trim();
    if (!code) {
      return;
    }
    db.auth
      .signInWithMagicCode({ email: sentEmail, code })
      .catch((err) => {
        inputEl.value = "";
        alert("Uh oh :" + err.body?.message);
      });
  };

  return (
    <form
      key="code"
      onSubmit={handleSubmit}
      className="flex flex-col space-y-4"
    >
      <label className="text-left text-sm font-semibold text-gray-700">
        Enter the code we sent to{" "}
        <span className="font-medium">{sentEmail}</span>
      </label>
      <input
        ref={inputRef}
        type="text"
        className="w-full border border-gray-300 px-3 py-2"
        placeholder="123456"
        required
        autoFocus
      />
      <button
        type="submit"
        className="w-full rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
      >
        Verify code
      </button>
    </form>
  );
}

export default Page;
