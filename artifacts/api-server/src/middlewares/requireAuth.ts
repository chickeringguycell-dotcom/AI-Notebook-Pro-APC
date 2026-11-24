import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function getRequestUserId(req: Request): string | undefined {
  if (req.userId) return req.userId;
  const auth = getAuth(req);
  return auth?.sessionClaims?.sub || auth?.userId || undefined;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = getRequestUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  // Upsert a row in our users table on first sight so claim flag has a place to live.
  try {
    await db
      .insert(usersTable)
      .values({ id: userId })
      .onConflictDoNothing();
  } catch (err) {
    req.log.error({ err }, "Failed to upsert user row");
  }
  next();
}

/**
 * Returns the single global legacy-claim owner, if any. Storage fallback for
 * legacy `default-user` objects must only allow access to this exact user —
 * a per-user boolean would let multiple claimers each see all legacy data.
 */
export async function getLegacyClaimOwnerId(): Promise<string | null> {
  const [u] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.claimedLegacy, true))
    .limit(1);
  return u?.id ?? null;
}
