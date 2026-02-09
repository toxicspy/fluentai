import {
  conversations,
  messages,
  users,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

/* =====================================================
   CHAT STORAGE (existing logic – unchanged)
===================================================== */

export interface IStorage {
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<void>;

  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
}

/** ✅ Used by chat routes */
export const storage = new DatabaseStorage();

/* =====================================================
   AUTH STORAGE (NEW – fixes your crash)
===================================================== */

export const authStorage = {
  async upsertUser(user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string | null;
  }) {
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl ?? null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl ?? null,
        },
      });
  },
};
