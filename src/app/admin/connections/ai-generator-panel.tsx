"use client";

import { useActionState } from "react";

import { generateConnectionsCandidatesAction } from "./ai-actions";
import { initialConnectionsAiGeneratorState } from "./ai-types";
import { saveGeneratedConnectionsCandidateAction } from "./actions";

export function ConnectionsAiGeneratorPanel({
  dateKey,
  replacesExistingDraft,
}: {
  dateKey: string;
  replacesExistingDraft: boolean;
}) {
  const [state, generateAction, pending] = useActionState(
    generateConnectionsCandidatesAction,
    initialConnectionsAiGeneratorState,
  );

  return (
    <section className="border-border bg-surface mt-7 rounded-2xl border p-5 sm:p-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-magic text-xs font-semibold tracking-[0.18em] uppercase">
            AI-assisted authoring
          </p>
          <h2 className="mt-1 font-serif text-3xl">Generate draft ideas</h2>
          <p className="text-muted mt-2 max-w-3xl text-sm leading-6">
            Models only arrange the curated catalogue and critique the result.
            Nothing is saved until you choose a candidate, and every saved
            puzzle remains a draft for human editing.
          </p>
        </div>
        <p className="text-muted text-xs">Target date: {dateKey} UTC</p>
      </div>

      <form
        action={generateAction}
        className="border-border mt-5 grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(220px,1fr)_110px_110px_120px_auto] md:items-end"
      >
        <label className="text-muted grid gap-1 text-xs font-semibold tracking-wide uppercase">
          Theme direction
          <input
            className="admin-input"
            name="theme"
            defaultValue="characters and magic"
            maxLength={120}
            required
          />
        </label>
        <label className="text-muted grid gap-1 text-xs font-semibold tracking-wide uppercase">
          Season cap
          <input
            className="admin-input"
            type="number"
            name="season"
            defaultValue="1"
            min="1"
            max="20"
            required
          />
        </label>
        <label className="text-muted grid gap-1 text-xs font-semibold tracking-wide uppercase">
          Episode cap
          <input
            className="admin-input"
            type="number"
            name="episode"
            defaultValue="28"
            min="1"
            max="1000"
            required
          />
        </label>
        <label className="text-muted grid gap-1 text-xs font-semibold tracking-wide uppercase">
          Candidates
          <select
            className="admin-input"
            name="candidateCount"
            defaultValue="3"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="bg-sage rounded-lg px-5 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Generating and reviewing…" : "Generate ideas"}
        </button>
      </form>

      {state.message ? (
        <p
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${state.status === "ERROR" ? "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200" : "border-sage/30 bg-sage/10"}`}
          role={state.status === "ERROR" ? "alert" : "status"}
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "SUCCESS" && state.usage ? (
        <p className="text-muted mt-3 text-xs">
          Generator: {state.usage.generatorModel} · Critic:{" "}
          {state.usage.criticModel}
          {state.usage.cost !== undefined
            ? ` · $${state.usage.cost.toFixed(4)}`
            : ""}
        </p>
      ) : null}

      {state.candidates.length > 0 ? (
        <div className="mt-6 space-y-6">
          {state.candidates.map((candidate, candidateIndex) => (
            <article
              key={candidate.id}
              className="border-border rounded-2xl border p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-muted text-xs font-semibold uppercase">
                    Candidate {candidateIndex + 1} · {candidate.spoilerLabel}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl">
                    {candidate.theme}
                  </h3>
                </div>
                <span className="bg-magic/10 text-magic rounded-full px-3 py-1 text-xs font-bold">
                  {candidate.review.recommendation} ·{" "}
                  {candidate.review.fairnessScore}/10
                </span>
              </div>

              <p className="text-muted mt-3 text-sm leading-6">
                {candidate.constructionNotes}
              </p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {candidate.shuffledTiles.map((tile) => (
                  <div
                    key={tile.id}
                    className="bg-background border-border flex min-h-16 items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-semibold break-words"
                  >
                    {tile.text}
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {candidate.groups.map((group) => (
                  <div
                    key={group.id}
                    className="border-border rounded-xl border p-3"
                  >
                    <h4 className="text-sm font-bold">{group.label}</h4>
                    <p className="text-muted mt-1 text-xs leading-5">
                      {group.tiles.join(" · ")}
                    </p>
                    <p className="text-muted mt-2 text-xs leading-5">
                      {group.explanation}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-bold">Critic strengths</h4>
                  <ul className="text-muted mt-2 space-y-1 text-xs leading-5">
                    {candidate.review.strengths.map((strength) => (
                      <li key={strength}>• {strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-bold">Critic issues</h4>
                  {candidate.review.issues.length > 0 ? (
                    <ul className="text-muted mt-2 space-y-2 text-xs leading-5">
                      {candidate.review.issues.map((issue, issueIndex) => (
                        <li key={`${issue.type}-${issueIndex}`}>
                          <span className="font-bold">
                            {issue.severity} · {issue.type}
                          </span>{" "}
                          {issue.explanation}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted mt-2 text-xs">
                      No issues returned. Human review is still required.
                    </p>
                  )}
                </div>
              </div>

              <form
                action={saveGeneratedConnectionsCandidateAction}
                className="border-border mt-5 flex flex-wrap items-center gap-3 border-t pt-4"
              >
                <input type="hidden" name="date" value={dateKey} />
                {candidate.categoryIds.map((categoryId) => (
                  <input
                    key={categoryId}
                    type="hidden"
                    name="categoryId"
                    value={categoryId}
                  />
                ))}
                {replacesExistingDraft ? (
                  <label className="text-muted flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      name="confirmReplace"
                      value="yes"
                      required
                    />
                    Replace the current draft for {dateKey}
                  </label>
                ) : null}
                <button
                  type="submit"
                  className="bg-sage ml-auto rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {replacesExistingDraft
                    ? "Replace with this draft"
                    : "Use this draft"}
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
