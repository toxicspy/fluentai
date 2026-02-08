import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateConversation } from "@/hooks/use-conversations";
import { useLocation } from "wouter";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { Conversation } from "@shared/routes";

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Chinese",
  "Japanese",
  "Korean",
  "Hindi",
  "Telugu",
  "Kannada",
  "Arabic",
].sort();

const formSchema = z.object({
  nativeLanguage: z.string().min(1),
  targetLanguage: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const createConversation = useCreateConversation();

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nativeLanguage: "English",
      targetLanguage: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log("Submitting chat form:", data);

    createConversation.mutate(
      {
        title: `${data.targetLanguage} Practice`,
        nativeLanguage: data.nativeLanguage,
        targetLanguage: data.targetLanguage,
      },
      {
        onSuccess: (res: Conversation) => {
          console.log("Conversation created:", res);

          const chatId = res?.id;

          if (!chatId) {
            console.error("No chat ID returned from backend");
            return;
          }

          reset();
          onOpenChange(false);

          // IMPORTANT: navigate AFTER dialog closes
          setTimeout(() => {
            setLocation(`/chat/${chatId}`);
          }, 0);
        },
        onError: (err) => {
          console.error("Create conversation failed:", err);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Start a New Chat
          </DialogTitle>
          <DialogDescription>
            Choose the language you want to practice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div>
              <Label>Target Language</Label>
              <Controller
                name="targetLanguage"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.targetLanguage && (
                <p className="text-xs text-red-500">
                  {errors.targetLanguage.message}
                </p>
              )}
            </div>

            <div>
              <Label>Native Language</Label>
              <Controller
                name="nativeLanguage"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={createConversation.isPending}>
              {createConversation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Let's Chat"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
