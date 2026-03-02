import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Languages, MessageCircle, Sparkles, Globe } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();

  const handleStartChat = async () => {
    try {
      const browserLanguage = navigator.language?.toLowerCase().startsWith("es")
        ? "Spanish"
        : "English";

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Chat",
          nativeLanguage: browserLanguage,
          targetLanguage: "Spanish",
        }),
      });

      if (!res.ok) throw new Error("Failed to create conversation");

      const conversation = await res.json();
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      console.error("Failed to start chat:", err);
      alert("Unable to start chat. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              FL
            </div>
            <span className="text-xl font-display font-bold">FluentAI</span>
          </div>
          <Button size="sm" className="rounded-full px-6" onClick={() => navigate("/")}>
            Open App
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border mb-6">
            <Sparkles size={16} className="text-amber-500" />
            AI-Powered Language Tutor
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Learn languages by <span className="text-primary">chatting</span>
          </h1>

          <p className="text-xl text-slate-500 mb-10">
            Practice real conversations with AI that understands you.
          </p>

          <Button
            size="lg"
            onClick={handleStartChat}
            className="h-14 px-10 rounded-full text-lg shadow-xl"
          >
            Let's Chat
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<MessageCircle className="w-8 h-8 text-blue-500" />}
            title="Natural Conversations"
            description="Talk about real topics in real time."
          />
          <FeatureCard
            icon={<Languages className="w-8 h-8 text-purple-500" />}
            title="Instant Translation"
            description="Type in your language, learn another."
          />
          <FeatureCard
            icon={<Globe className="w-8 h-8 text-green-500" />}
            title="Cultural Context"
            description="Learn how people really speak."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-8 rounded-3xl border shadow-sm">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-500">{description}</p>
    </div>
  );
}

