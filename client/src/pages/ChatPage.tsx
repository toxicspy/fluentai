import { Layout } from "@/components/Layout";
import { useConversation, useSendMessage } from "@/hooks/use-conversations";
import { useParams } from "wouter";
import { ChatMessage } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import type { Message } from "@shared/routes";

export default function ChatPage() {
  const params = useParams<{ id?: string }>();

  const id = params?.id ? Number(params.id) : undefined;

  const { data, isLoading, error } = useConversation(id);
  const sendMessage = useSendMessage();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [data?.messages, sendMessage.isPending]);

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending || typeof id !== "number") return;

    sendMessage.mutate(
      { id, content: input },
      {
        onSuccess: () => {
          setInput("");
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-slate-400 text-sm">Loading conversation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center h-full gap-4">
          <h2 className="text-xl font-bold text-slate-900">Conversation not found</h2>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const conversation = data?.conversation;
  const messages = (data?.messages ?? []) as Message[];

  return (
    <Layout>
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 md:rounded-tl-3xl shadow-2xl relative overflow-hidden">
        <header className="px-4 py-3 border-b flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>

          <div>
            <h2 className="text-lg font-bold">{conversation?.title ?? "New Chat"}</h2>
            <p className="text-xs text-slate-500">Active Session</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <Send size={32} />
              <p className="mt-2">Say hello to start learning!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role as "user" | "assistant"}
                content={`${msg.targetContent}\n${msg.nativeContent}`}
              />
            ))
          )}

          {sendMessage.isPending && (
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <Loader2 className="animate-spin" />
              AI is thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending || typeof id !== "number"}>
              {sendMessage.isPending ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}