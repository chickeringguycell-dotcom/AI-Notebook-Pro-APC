import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export function WelcomePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6 py-10">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <FileText className="w-8 h-8 text-amber-700" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-serif font-semibold text-stone-800">
            My AI Notebook
          </h1>
          <p className="text-stone-600">
            Your personal lined-paper notepad with voice dictation, scan-to-text, and an AI writing assistant. Sign in to open your private notebook.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/sign-in">
            <Button size="lg" className="w-full sm:w-auto">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">Create account</Button>
          </Link>
        </div>
        <p className="text-xs text-stone-400 pt-4">
          Each account gets its own private notebook. Nobody else can see your notes.
        </p>
      </div>
    </div>
  );
}
