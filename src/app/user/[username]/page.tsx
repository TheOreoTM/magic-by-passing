import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { utcDateKey } from "@/lib/utc-date";
import { getPublicProfile } from "@/features/profiles/server/public-profile";

export const metadata: Metadata = { title: "Player Profile" };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();
  const levelPercent = Math.min(
    100,
    (profile.level.earnedThisLevel / profile.level.neededThisLevel) * 100,
  );

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <section>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {profile.avatarUrl ? (
              // Same-origin proxy keeps provider identifiers out of public markup.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                width={96}
                height={96}
                className="bg-border size-20 rounded-full object-cover sm:size-24"
              />
            ) : (
              <div className="bg-sage/15 text-sage flex size-20 items-center justify-center rounded-full text-3xl font-semibold sm:size-24 sm:text-4xl">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-muted text-sm">Player profile</p>
              <h1 className="mt-1 truncate text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {profile.displayName}
              </h1>
              <p className="text-muted mt-1">@{profile.username}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-muted text-sm">Level</p>
              <p className="text-gold mt-1 font-mono text-4xl font-semibold">
                {profile.level.level}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-semibold">
                {profile.totalXp.toLocaleString()} XP
              </span>
              <span className="text-muted">
                Next level at {profile.level.nextLevelXp.toLocaleString()} XP
              </span>
            </div>
            <div
              className="bg-border mt-2 h-1.5 overflow-hidden rounded-full"
              role="progressbar"
              aria-label={`Level ${profile.level.level} progress`}
              aria-valuemin={profile.level.levelStartXp}
              aria-valuemax={profile.level.nextLevelXp}
              aria-valuenow={profile.totalXp}
            >
              <div
                className="bg-sage h-full rounded-full"
                style={{ width: `${levelPercent}%` }}
              />
            </div>
          </div>
        </section>

        <dl className="border-border mt-12 grid grid-cols-2 gap-x-8 gap-y-8 border-t pt-8 sm:grid-cols-4">
          <Stat label="Games played" value={profile.stats.gamesPlayed} />
          <Stat label="Exact guesses" value={profile.stats.exactGuesses} />
          <Stat
            label="Average distance"
            value={profile.stats.averageDistance.toFixed(1)}
          />
          <Stat
            label="Best Daily"
            value={profile.stats.bestDailyScore.toLocaleString()}
          />
          <Stat label="Daily streak" value={profile.stats.currentDailyStreak} />
          <Stat label="Ranked Dailies" value={profile.stats.dailyGamesPlayed} />
          <Stat
            label="Unlimited games"
            value={profile.stats.unlimitedGamesPlayed}
          />
          <Stat label="Total guesses" value={profile.stats.guesses} />
        </dl>

        <div className="mt-16 grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Recent Dailies
            </h2>
            <div className="divide-border mt-5 divide-y">
              {profile.recentDailies.map((attempt) => (
                <Link
                  key={utcDateKey(attempt.challenge.dateUtc)}
                  href={`/leaderboards/guessr?date=${utcDateKey(attempt.challenge.dateUtc)}`}
                  className="hover:text-sage flex items-center justify-between py-3.5 transition"
                >
                  <span className="font-medium">
                    {utcDateKey(attempt.challenge.dateUtc)}
                  </span>
                  <span className="font-mono font-semibold">
                    {attempt.totalScore.toLocaleString()}
                  </span>
                </Link>
              ))}
              {profile.recentDailies.length === 0 ? (
                <p className="text-muted py-6 text-sm">
                  No ranked Daily results yet.
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Achievements
            </h2>
            <div className="mt-5 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {profile.achievements.map((achievement) => (
                <article key={achievement.id}>
                  <p className="font-semibold">{achievement.name}</p>
                  <p className="text-muted mt-1 text-sm leading-6">
                    {achievement.description}
                  </p>
                  <p className="text-gold mt-2 font-mono text-xs font-semibold">
                    +{achievement.xp} XP
                  </p>
                </article>
              ))}
              {profile.achievements.length === 0 ? (
                <p className="text-muted py-6 text-sm">
                  No achievements unlocked yet.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
