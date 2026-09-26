import Link from "next/link";

import { resolveSiteBrand } from "@/lib/site-brand";

import { AccountControls } from "./account-controls";
import { SiteMark } from "./site-mark";

export function SiteHeader() {
  const brand = resolveSiteBrand();

  return (
    <header className="border-border bg-background/95 sticky top-0 z-50 border-b px-4 backdrop-blur-sm sm:px-8">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-2 sm:gap-4">
        <Link
          href="/"
          aria-label={`${brand.name} home`}
          className="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-[-0.01em]"
        >
          <SiteMark brand={brand} />
          <span className="hidden sm:inline">{brand.name}</span>
          <span className="sm:hidden">{brand.shortName}</span>
        </Link>

        <nav
          className="flex min-w-0 items-center gap-0 text-sm sm:gap-2"
          aria-label="Account navigation"
        >
          <Link
            href="/guessr"
            className="text-muted hover:text-foreground hidden border-b border-transparent px-3 py-4 font-medium transition hover:border-current sm:block"
          >
            Guessr
          </Link>
          <Link
            href="/guessr/daily"
            className="text-muted hover:text-foreground hidden border-b border-transparent px-3 py-4 font-medium transition hover:border-current md:block"
          >
            Daily
          </Link>
          <Link
            href="/connections"
            className="text-muted hover:text-foreground hidden border-b border-transparent px-3 py-4 font-medium transition hover:border-current lg:block"
          >
            Connections
          </Link>
          <AccountControls />
        </nav>
      </div>
    </header>
  );
}
