import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Languages, MessageCircle, Sparkles, Globe, Upload, X } from "lucide-react";
import { useState } from "react";

const AI_FRIEND_NAME_KEY = "aiFriendName";
const AI_FRIEND_PHOTO_KEY = "aiFriendPhoto";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendPhoto, setFriendPhoto] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isCreatingChat) return;
    setIsModalOpen(false);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFriendPhoto(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setFriendPhoto(result);
    };
    reader.readAsDataURL(file);
  };

  const handleStartChat = async () => {
    const trimmedName = friendName.trim();
    if (!trimmedName) {
      alert("Please enter a name for your AI friend.");
      return;
    }

    setIsCreatingChat(true);

    try {
      const browserLanguage = navigator.language?.toLowerCase().startsWith("es")
        ? "Spanish"
        : "English";
      localStorage.setItem(AI_FRIEND_NAME_KEY, trimmedName);

      if (friendPhoto) {
        localStorage.setItem(AI_FRIEND_PHOTO_KEY, friendPhoto);
      } else {
        localStorage.removeItem(AI_FRIEND_PHOTO_KEY);
      }

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${trimmedName} Chat`,
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
    } finally {
      setIsCreatingChat(false);
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
            onClick={handleOpenModal}
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

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 px-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Create Your AI Friend</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Add a name and optional photo before starting the chat.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isCreatingChat}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Close setup modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="friend-name" className="block text-sm font-semibold text-slate-700 mb-2">
                  AI Friend Name
                </label>
                <input
                  id="friend-name"
                  type="text"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="e.g. Sofia"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  AI Friend Photo (Optional)
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-slate-600 hover:bg-slate-100 transition-colors">
                  <Upload size={18} />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                {friendPhoto && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <img src={friendPhoto} alt="AI friend preview" className="h-12 w-12 rounded-full object-cover" />
                    <p className="text-sm text-slate-600">Photo ready</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full mt-6 h-12 rounded-xl text-base"
              onClick={handleStartChat}
              disabled={isCreatingChat}
            >
              {isCreatingChat ? "Starting..." : "Start Chat"}
            </Button>
          </div>
        </div>
      )}
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

