'use client';

import { SessionProvider } from "next-auth/react";
import { PromptProvider } from "@/features/chat/chat-ui/chat-prompt/chat-prompt-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PromptProvider>
        {children}
      </PromptProvider>
    </SessionProvider>
  );
} 