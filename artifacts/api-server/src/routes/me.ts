import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * Invite codes that grant Pro. Validated server-side so a redemption persists
 * on the user's account (survives reinstalls and syncs across devices) instead
 * of living only in browser localStorage.
 */
const VALID_INVITE_CODES = new Set<string>([
  "FRIEND2025",
  "GIFTED2025",
  "FOUNDERFRIEND",
  "AIWRITER",
]);

/**
 * GET /me
 * Returns the authenticated user's account status (currently just Pro state).
 */
router.get("/me", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const rows = await db
      .select({ pro: usersTable.pro })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    res.json({ isPro: rows[0]?.pro ?? false });
  } catch (err) {
    req.log.error({ err }, "Failed to load account status");
    res.status(500).json({ error: "Failed to load account status" });
  }
});

/**
 * Until this date, an authenticated client that still has the pre-existing
 * device-only (localStorage) unlock may migrate it onto the account via
 * `legacy: true`. After it passes, `legacy` is ignored and only valid invite
 * codes grant Pro — this bounds the migration so it can't become a permanent
 * self-serve unlock path. Real existing users will open the app well within
 * this window; the window only needs to outlast the reinstall we asked them to
 * do for the Android share-target.
 */
const LEGACY_MIGRATION_DEADLINE = new Date("2026-09-13T00:00:00Z");

/**
 * POST /pro/redeem
 * Enables Pro on the authenticated user's account by either:
 *  - a valid invite code, or
 *  - `legacy: true` (only before LEGACY_MIGRATION_DEADLINE), which migrates a
 *    pre-existing device-only (localStorage) unlock onto the account so it
 *    survives reinstalls. Pro has always been an honor-system client-side flag.
 */
router.post("/pro/redeem", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const body = (req.body ?? {}) as { code?: unknown; legacy?: unknown };
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const legacyMigration = body.legacy === true && Date.now() < LEGACY_MIGRATION_DEADLINE.getTime();

  if (!legacyMigration && !VALID_INVITE_CODES.has(code)) {
    res.status(400).json({ error: "That code isn't valid." });
    return;
  }

  try {
    await db
      .insert(usersTable)
      .values({ id: userId, pro: true })
      .onConflictDoUpdate({ target: usersTable.id, set: { pro: true } });
    res.json({ isPro: true });
  } catch (err) {
    req.log.error({ err }, "Failed to enable Pro");
    res.status(500).json({ error: "Failed to enable Pro" });
  }
});

export default router;
