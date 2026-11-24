import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
  ScanImageTextBody,
  PolishTextBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/openai/conversations", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(conversations.createdAt);
  res.json(convs);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db
    .insert(conversations)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, userId)));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .delete(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, userId)))
    .returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, userId)));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, userId)));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId: params.data.id,
    role: "user",
    content: parsed.data.content,
  });

  const history = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  const chatMessages = history.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: "You are a helpful AI writing assistant integrated into a notepad. Help the user with writing, editing, brainstorming, summarizing, and improving their notes. Be concise and practical." },
      ...chatMessages,
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  await db.insert(messages).values({
    conversationId: params.data.id,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/openai/scan-image", async (req, res): Promise<void> => {
  const parsed = ScanImageTextBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { image, contentType } = parsed.data;

  if (!contentType.startsWith("image/")) {
    res.status(400).json({ error: "contentType must be an image MIME type" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You are an OCR engine. The user will give you a photo of printed or handwritten text. Reply with ONLY the text content from the image, preserving line breaks and paragraph structure as best you can. Do not add commentary, headings, code fences, or quotation marks. If the image contains no readable text, reply with an empty string.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all text from this image." },
            {
              type: "image_url",
              image_url: { url: `data:${contentType};base64,${image}` },
            },
          ],
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ text });
  } catch (err) {
    req.log.error({ err }, "scan-image failed");
    res.status(500).json({ error: "Failed to read text from image" });
  }
});

router.post("/openai/polish-text", async (req, res): Promise<void> => {
  const parsed = PolishTextBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, context } = parsed.data;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2048,
      messages: [
        {
          role: "system",
          content:
            "You clean up speech-to-text dictation. Add proper punctuation and capitalization. Fix obvious mis-heard words using context (e.g. 'their/there', 'to/two/too', proper nouns, homophones, common dictation glitches). Keep the user's voice, word choice, and meaning intact — do NOT rewrite, summarize, expand, or change style. Do NOT add commentary, headings, quotation marks, or code fences. Reply with ONLY the cleaned text.",
        },
        ...(context
          ? [
              {
                role: "user" as const,
                content: `For context, here is the surrounding text already in the note (do NOT include this in your reply, just use it to disambiguate words):\n\n"""${context}"""`,
              },
            ]
          : []),
        {
          role: "user",
          content: `Clean up this dictated text:\n\n"""${text}"""`,
        },
      ],
    });

    const cleaned = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ text: cleaned || text });
  } catch (err) {
    req.log.error({ err }, "polish-text failed");
    res.status(500).json({ error: "Failed to polish text" });
  }
});

export default router;
