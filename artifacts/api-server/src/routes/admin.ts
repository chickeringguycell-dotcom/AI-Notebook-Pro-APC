import { Router, type IRouter, type Request, type Response } from "express";
import { eq, isNull, sql } from "drizzle-orm";
import { db, notesTable, conversations, usersTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * POST /admin/claim-legacy
 *
 * One-time, GLOBAL claim: assigns every NULL-owner note and conversation to
 * the requester. Requires the original NOTEPAD_PASSPHRASE.
 *
 * Hard-locked: if any user has already been marked as the legacy claimer,
 * subsequent claim attempts are rejected — even with a correct passphrase —
 * to prevent multiple users from gaining access to legacy default-user
 * private objects via the storage fallback.
 */
router.post("/admin/claim-legacy", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const expected = process.env.NOTEPAD_PASSPHRASE;
  if (!expected) {
    res.status(503).json({ error: "Legacy claim is not available (NOTEPAD_PASSPHRASE not set)" });
    return;
  }
  const body = req.body as { passphrase?: unknown };
  const submitted = typeof body?.passphrase === "string" ? body.passphrase : "";
  if (submitted !== expected) {
    req.log.warn({ userId }, "Failed legacy-claim attempt");
    res.status(401).json({ error: "Incorrect passphrase" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Lock all rows in users table briefly so two concurrent claim attempts can't both succeed.
      const existing = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.claimedLegacy, true))
        .for("update");

      if (existing.length > 0) {
        if (existing.some((u) => u.id === userId)) {
          return { alreadyOwner: true, notesClaimed: 0, conversationsClaimed: 0 };
        }
        return { alreadyTaken: true };
      }

      const notesUpdated = await tx
        .update(notesTable)
        .set({ userId })
        .where(isNull(notesTable.userId))
        .returning({ id: notesTable.id });

      const convsUpdated = await tx
        .update(conversations)
        .set({ userId })
        .where(isNull(conversations.userId))
        .returning({ id: conversations.id });

      // Upsert + flag in case the row didn't exist yet (requireAuth normally seeds it).
      await tx
        .insert(usersTable)
        .values({ id: userId, claimedLegacy: true })
        .onConflictDoUpdate({
          target: usersTable.id,
          set: { claimedLegacy: true },
        });

      return {
        notesClaimed: notesUpdated.length,
        conversationsClaimed: convsUpdated.length,
      };
    });

    if ((result as { alreadyTaken?: boolean }).alreadyTaken) {
      res.status(409).json({ error: "Legacy notes have already been claimed by another account." });
      return;
    }

    res.json({
      notesClaimed: result.notesClaimed,
      conversationsClaimed: result.conversationsClaimed,
      alreadyOwner: Boolean((result as { alreadyOwner?: boolean }).alreadyOwner),
    });
  } catch (err) {
    req.log.error({ err }, "Legacy claim failed");
    res.status(500).json({ error: "Failed to claim legacy notes" });
  }
});

// Silence ts unused
void sql;

export default router;
