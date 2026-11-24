import { pgTable, text, serial, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notesTable = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    category: text("category").notNull().default("General"),
    paperTheme: text("paper_theme").notNull().default("classic"),
    lineStyle: text("line_style").notNull().default("lined"),
    inkColor: text("ink_color").notNull().default(""),
    font: text("font").notNull().default(""),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("notes_user_idx").on(t.userId)],
);

export const insertNoteSchema = createInsertSchema(notesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;
