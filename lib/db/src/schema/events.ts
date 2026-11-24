import { pgTable, text, serial, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    eventType: text("event_type").notNull(),
    artifact: text("artifact").notNull(),
    path: text("path"),
    metadata: jsonb("metadata"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_visitor_idx").on(t.visitorId),
    index("events_created_idx").on(t.createdAt),
    index("events_type_idx").on(t.eventType),
  ],
);

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
  userAgent: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type AnalyticsEvent = typeof eventsTable.$inferSelect;
