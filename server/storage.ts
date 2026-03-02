import {
  conversations,
  messages,
  users,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "../shared/schema.js";
import { db } from "./db.js";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<void>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;
}

class MemoryStorage implements IStorage {
  private conversationId = 1;
  private messageId = 1;
  private conversations: Conversation[] = [];
  private messages: Message[] = [];

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const item: Conversation = {
      ...conversation,
      id: this.conversationId++,
      createdAt: new Date(),
    };
    this.conversations.push(item);
    return item;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return this.conversations
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.find((c) => c.id === id);
  }

  async deleteConversation(id: number): Promise<void> {
    this.conversations = this.conversations.filter((c) => c.id !== id);
    this.messages = this.messages.filter((m) => m.conversationId !== id);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const item: Message = {
      ...message,
      id: this.messageId++,
      createdAt: new Date(),
    };
    this.messages.push(item);
    return item;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return this.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

class DatabaseStorage implements IStorage {
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

class ResilientStorage implements IStorage {
  private dbStorage = new DatabaseStorage();
  private memoryStorage = new MemoryStorage();
  private dbHealthy = true;
  private warned = false;

  private async runWithFallback<T>(
    operation: string,
    dbOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    if (!this.dbHealthy) return fallbackOperation();

    try {
      return await dbOperation();
    } catch (error) {
      this.dbHealthy = false;
      if (!this.warned) {
        this.warned = true;
        console.error(`[storage] Database unavailable, switching to in-memory fallback during runtime. Failed at: ${operation}`, error);
      }
      return fallbackOperation();
    }
  }

  createConversation(conversation: InsertConversation): Promise<Conversation> {
    return this.runWithFallback(
      "createConversation",
      () => this.dbStorage.createConversation(conversation),
      () => this.memoryStorage.createConversation(conversation)
    );
  }

  getConversations(userId: string): Promise<Conversation[]> {
    return this.runWithFallback(
      "getConversations",
      () => this.dbStorage.getConversations(userId),
      () => this.memoryStorage.getConversations(userId)
    );
  }

  getConversation(id: number): Promise<Conversation | undefined> {
    return this.runWithFallback(
      "getConversation",
      () => this.dbStorage.getConversation(id),
      () => this.memoryStorage.getConversation(id)
    );
  }

  deleteConversation(id: number): Promise<void> {
    return this.runWithFallback(
      "deleteConversation",
      () => this.dbStorage.deleteConversation(id),
      () => this.memoryStorage.deleteConversation(id)
    );
  }

  createMessage(message: InsertMessage): Promise<Message> {
    return this.runWithFallback(
      "createMessage",
      () => this.dbStorage.createMessage(message),
      () => this.memoryStorage.createMessage(message)
    );
  }

  getMessages(conversationId: number): Promise<Message[]> {
    return this.runWithFallback(
      "getMessages",
      () => this.dbStorage.getMessages(conversationId),
      () => this.memoryStorage.getMessages(conversationId)
    );
  }
}

export const storage: IStorage = new ResilientStorage();

let authStorageWarned = false;

export const authStorage = {
  async upsertUser(user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string | null;
  }) {
    try {
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
    } catch (error) {
      if (!authStorageWarned) {
        authStorageWarned = true;
        console.error("[authStorage] Could not upsert user. Continuing without DB-backed auth user sync.", error);
      }
    }
  },
};
