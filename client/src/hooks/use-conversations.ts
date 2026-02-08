import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Conversation, type Message } from "@shared/routes";
import type { InsertConversation } from "@shared/schema";

type ConversationWithMessages = {
  conversation: Conversation;
  messages: Message[];
};

type CreateConversationInput = Omit<InsertConversation, "userId">;

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch(api.conversations.list.path, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch conversations");
      }

      return (await res.json()) as Conversation[];
    },
  });
}

export function useConversation(id: number | undefined) {
  return useQuery<ConversationWithMessages | null>({
    queryKey: ["conversation", id],
    enabled: typeof id === "number" && Number.isFinite(id),
    queryFn: async () => {
      if (typeof id !== "number") {
        return null;
      }

      const url = buildUrl(api.conversations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });

      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");

      return (await res.json()) as ConversationWithMessages;
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateConversationInput) => {
      const res = await fetch(api.conversations.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to create conversation");
      }

      return (await res.json()) as Conversation;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.conversations.delete.path, { id });

      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete conversation");
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const url = buildUrl(api.messages.create.path, { id });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      return (await res.json()) as Message[];
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", variables.id],
      });
    },
  });
}