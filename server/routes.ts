// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, authStorage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const GUEST_USER_ID = "guest-user";

function isRequestAuthenticated(req: any): boolean {
  return true;
}

function getUserId(req: any): string | null {
  return req.user?.claims?.sub ?? req.user?.id ?? GUEST_USER_ID;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Ensure guest identity exists so FK constraints are satisfied when auth is disabled.
  await authStorage.upsertUser({
    id: GUEST_USER_ID,
    email: "guest@fluentai.local",
    firstName: "Guest",
    lastName: "User",
    profileImageUrl: null,
  });

  // --- Conversations API ---
  app.get(api.conversations.list.path, async (req, res) => {
    if (!isRequestAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const conversations = await storage.getConversations(userId);
    res.json(conversations);
  });

  app.post(api.conversations.create.path, async (req, res) => {
    if (!isRequestAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.conversations.create.input.parse(req.body);
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const conversation = await storage.createConversation({ ...input, userId });
      res.status(201).json(conversation);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.get(api.conversations.get.path, async (req, res) => {
    if (!isRequestAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = Number(req.params.id);
    const conversation = await storage.getConversation(id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (conversation.userId !== userId) return res.status(401).json({ message: "Unauthorized" });
    const messages = await storage.getMessages(id);
    res.json({ conversation, messages });
  });

  app.delete(api.conversations.delete.path, async (req, res) => {
    if (!isRequestAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    const id = Number(req.params.id);
    const conversation = await storage.getConversation(id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (conversation.userId !== userId) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteConversation(id);
    res.status(204).send();
  });

  // --- Messages API ---
  app.post(api.messages.create.path, async (req, res) => {
    if (!isRequestAuthenticated(req)) return res.status(401).json({ message: "Unauthorized" });
    try {
      const conversationId = Number(req.params.id);
      const { content: nativeContent } = api.messages.create.input.parse(req.body);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      if (conversation.userId !== userId) return res.status(401).json({ message: "Unauthorized" });

      // Save user message immediately so chat always progresses even if AI call fails.
      const userMessage = await storage.createMessage({
        conversationId,
        role: "user",
        nativeContent,
        targetContent: nativeContent,
      });

      try {
        const systemPrompt = `You are a friendly peer and close friend helping with language practice.
Return JSON only with keys: userTarget, userTransliteration, aiTarget, aiTransliteration, aiNative.
Keep aiTarget short (1-2 sentences), natural, and conversational.`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-5.1",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: nativeContent }
          ],
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");
        if (!result.userTarget || !result.aiTarget || !result.aiNative) {
          throw new Error("Invalid AI response");
        }

        const userTargetWithPhonetic = result.userTransliteration
          ? `${result.userTarget}\n(${result.userTransliteration})`
          : result.userTarget;

        const assistantTargetWithPhonetic = result.aiTransliteration
          ? `${result.aiTarget}\n(${result.aiTransliteration})`
          : result.aiTarget;

        const normalizedUserMessage = {
          ...userMessage,
          targetContent: userTargetWithPhonetic,
        };

        const aiMessage = await storage.createMessage({
          conversationId,
          role: "assistant",
          nativeContent: result.aiNative,
          targetContent: assistantTargetWithPhonetic
        });

        return res.status(201).json([normalizedUserMessage, aiMessage]);
      } catch (aiError) {
        console.error("AI unavailable, using fallback:", aiError);
        const fallbackMessage = await storage.createMessage({
          conversationId,
          role: "assistant",
          nativeContent: "I could not reach the AI service right now. Please try again shortly.",
          targetContent: "I could not reach the AI service right now. Please try again shortly.",
        });
        return res.status(201).json([userMessage, fallbackMessage]);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  return httpServer;
}
