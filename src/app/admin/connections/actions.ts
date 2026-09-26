"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { connectionsGenerationCatalog } from "@/features/connections/generation/catalog";
import { evaluateGeneratedConnectionsCandidate } from "@/features/connections/generation/validation";
import {
  approveConnectionsPuzzle,
  getConnectionsPuzzleStatusForDate,
  returnConnectionsPuzzleToDraft,
  saveConnectionsPuzzleDraft,
  voidConnectionsPuzzle,
} from "@/features/connections/server/admin";
import { requireAdmin } from "@/lib/authorization";
import { addUtcDays, parseUtcDateKey, utcDateKey } from "@/lib/utc-date";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const puzzleIdSchema = z.string().cuid();
const draftSchema = z.object({
  date: dateKeySchema,
  spoilerNote: z.string().max(500),
  groups: z
    .array(
      z.object({
        position: z.number().int().min(1).max(4),
        label: z.string().max(120),
        explanation: z.string().max(500),
        tiles: z.array(z.string().max(80)).length(4),
      }),
    )
    .length(4),
});

function dateContext(formData: FormData): string {
  return (
    dateKeySchema.safeParse(formData.get("date")).data ??
    utcDateKey(addUtcDays(new Date(), 1))
  );
}

function finish(date: string, notice: string): never {
  revalidatePath("/admin/connections");
  redirect(
    `/admin/connections?month=${date.slice(0, 7)}&date=${date}&notice=${encodeURIComponent(notice)}`,
  );
}

function errorNotice(error: unknown): string {
  if (error instanceof z.ZodError) {
    return `Error: ${error.issues[0]?.message ?? "The puzzle form is invalid."}`;
  }
  return `Error: ${error instanceof Error ? error.message : "The Connections operation failed."}`;
}

function readDraft(formData: FormData) {
  return draftSchema.parse({
    date: formData.get("date"),
    spoilerNote: formData.get("spoilerNote") ?? "",
    groups: Array.from({ length: 4 }, (_, groupIndex) => ({
      position: groupIndex + 1,
      label: formData.get(`groups.${groupIndex}.label`) ?? "",
      explanation: formData.get(`groups.${groupIndex}.explanation`) ?? "",
      tiles: Array.from(
        { length: 4 },
        (_, tileIndex) =>
          formData.get(`groups.${groupIndex}.tiles.${tileIndex}`) ?? "",
      ),
    })),
  });
}

function readPuzzleActionInput(formData: FormData) {
  return {
    puzzleId: puzzleIdSchema.parse(formData.get("puzzleId")),
    date: dateKeySchema.parse(formData.get("date")),
  };
}

export async function saveConnectionsPuzzleAction(formData: FormData) {
  await requireAdmin("/admin/connections");
  const date = dateContext(formData);
  let notice = "Puzzle draft saved.";

  try {
    const input = readDraft(formData);
    await saveConnectionsPuzzleDraft({
      dateUtc: parseUtcDateKey(input.date),
      spoilerNote: input.spoilerNote,
      groups: input.groups,
    });
  } catch (error) {
    notice = errorNotice(error);
  }

  finish(date, notice);
}

export async function saveGeneratedConnectionsCandidateAction(
  formData: FormData,
) {
  await requireAdmin("/admin/connections");
  const date = dateContext(formData);
  let notice = "Generated candidate saved as a draft.";

  try {
    const input = z
      .object({
        date: dateKeySchema,
        categoryIds: z.array(z.string().min(1).max(80)).length(4),
        confirmReplace: z.boolean(),
      })
      .parse({
        date: formData.get("date"),
        categoryIds: formData.getAll("categoryId"),
        confirmReplace: formData.get("confirmReplace") === "yes",
      });
    const dateUtc = parseUtcDateKey(input.date);
    const existingStatus = await getConnectionsPuzzleStatusForDate(dateUtc);
    if (existingStatus && !input.confirmReplace) {
      throw new Error(
        "Confirm that the generated candidate may replace the existing draft.",
      );
    }

    const evaluation = evaluateGeneratedConnectionsCandidate(
      {
        id: "admin-ai-selection",
        theme: "Admin AI selection",
        categoryIds: input.categoryIds,
        constructionNotes: "Selected through the admin generator.",
      },
      connectionsGenerationCatalog,
      { season: 999, episode: 999 },
    );
    if (evaluation.issues.length > 0 || !evaluation.materialized) {
      throw new Error(
        evaluation.issues.map((issue) => issue.message).join(" ") ||
          "The generated candidate is no longer valid.",
      );
    }

    await saveConnectionsPuzzleDraft({
      dateUtc,
      spoilerNote: evaluation.materialized.puzzle.spoilerNote,
      groups: evaluation.materialized.puzzle.groups.map((group) => ({
        position: group.position,
        label: group.label,
        explanation: group.explanation,
        tiles: group.tiles.map((tile) => tile.text),
      })),
    });
  } catch (error) {
    notice = errorNotice(error);
  }

  finish(date, notice);
}

export async function approveConnectionsPuzzleAction(formData: FormData) {
  await requireAdmin("/admin/connections");
  const date = dateContext(formData);
  let notice = "Puzzle approved.";

  try {
    const input = readPuzzleActionInput(formData);
    await approveConnectionsPuzzle(input.puzzleId);
  } catch (error) {
    notice = errorNotice(error);
  }

  finish(date, notice);
}

export async function returnConnectionsPuzzleToDraftAction(formData: FormData) {
  await requireAdmin("/admin/connections");
  const date = dateContext(formData);
  let notice = "Puzzle returned to draft and can now be edited.";

  try {
    const input = readPuzzleActionInput(formData);
    await returnConnectionsPuzzleToDraft(input.puzzleId);
  } catch (error) {
    notice = errorNotice(error);
  }

  finish(date, notice);
}

export async function voidConnectionsPuzzleAction(formData: FormData) {
  await requireAdmin("/admin/connections");
  const date = dateContext(formData);
  let notice = "Puzzle voided. Ranked results will not count.";

  try {
    const input = z
      .object({
        puzzleId: puzzleIdSchema,
        date: dateKeySchema,
        confirmVoid: z.literal("yes"),
      })
      .parse({
        puzzleId: formData.get("puzzleId"),
        date: formData.get("date"),
        confirmVoid: formData.get("confirmVoid"),
      });
    await voidConnectionsPuzzle(input.puzzleId);
  } catch (error) {
    notice = errorNotice(error);
  }

  finish(date, notice);
}
