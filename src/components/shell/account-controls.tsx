"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSession, signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

export function AccountControls() {
  const [session, setSession] = useState<Session | null>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void getSession().then((nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => {
      active = false;
    };
  }, []);

  if (session === undefined) {
    return (
      <div
        className="bg-border h-9 w-28 animate-pulse"
        aria-label="Loading account"
        role="status"
      />
    );
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signIn("discord", { redirectTo: "/guessr" });
        }}
        className="bg-foreground text-background px-3.5 py-2 font-semibold transition hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in with Discord"}
      </button>
    );
  }

  const user = session.user;
  return (
    <>
      {user.role === "ADMIN" ? (
        <Link
          href="/admin/frames"
          className="text-muted hover:text-foreground px-2 py-2 font-medium transition sm:px-3"
        >
          Admin
        </Link>
      ) : null}
      <Link
        href={user.username ? `/user/${user.username}` : "/onboarding"}
        aria-label="View your profile"
        className="flex min-w-0 items-center gap-2 px-2 py-1 transition hover:opacity-70"
      >
        {user.image ? (
          // The same-origin endpoint prevents the Discord account ID in the CDN URL from reaching the browser.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            width={28}
            height={28}
            className="bg-border size-7 rounded-full object-cover"
          />
        ) : null}
        <span className="hidden font-medium min-[390px]:inline sm:hidden">
          Profile
        </span>
        <span className="hidden max-w-40 truncate font-medium sm:block">
          {user.displayName ?? user.name ?? user.username}
        </span>
      </Link>
      {!user.onboardedAt ? (
        <Link
          href="/onboarding"
          className="border-gold/50 text-foreground border px-3 py-2 font-semibold"
        >
          Finish setup
        </Link>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOut({ redirectTo: "/" });
        }}
        className="text-muted hover:text-foreground px-2 py-2 font-semibold transition disabled:cursor-wait disabled:opacity-60 sm:px-3"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}
