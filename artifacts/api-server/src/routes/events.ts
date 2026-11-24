import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, eventsTable } from "@workspace/db";

const router: IRouter = Router();

const TrackEventBody = z.object({
  visitorId: z.string().min(1).max(64),
  eventType: z.string().min(1).max(64),
  artifact: z.string().min(1).max(32),
  path: z.string().max(512).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = TrackEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid event" });
    return;
  }

  try {
    await db.insert(eventsTable).values({
      visitorId: parsed.data.visitorId,
      eventType: parsed.data.eventType,
      artifact: parsed.data.artifact,
      path: parsed.data.path ?? null,
      metadata: parsed.data.metadata ?? null,
      userAgent: (req.headers["user-agent"] ?? "").toString().slice(0, 512),
    });
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "failed to record analytics event");
    res.sendStatus(204);
  }
});

export default router;
