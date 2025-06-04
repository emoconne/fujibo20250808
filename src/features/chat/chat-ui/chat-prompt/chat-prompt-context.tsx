'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useSession } from "next-auth/react";
import { queryPrompt, queryPromptCompany } from "./chat-prompt-cosmos";

type Prompt = {
  title: string;
  content: string;
  id: number;
  dept: string;
  username: string;
};

interface PromptContextType {
  personalPrompts: Prompt[];
  companyPrompts: Prompt[];
  isLoading: boolean;
  refreshPrompts: () => Promise<void>;
  updatePersonalPrompts: (prompts: Prompt[]) => void;
  updateCompanyPrompts: (prompts: Prompt[]) => void;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export function PromptProvider({ children }: { children: ReactNode }) {
  const [personalPrompts, setPersonalPrompts] = useState<Prompt[]>([]);
  const [companyPrompts, setCompanyPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const refreshPrompts = useCallback(async () => {
    if (!session?.user?.name || isLoading) return;
    
    setIsLoading(true);
    try {
      const [personalList, companyList] = await Promise.all([
        queryPrompt("個人", session.user.name),
        queryPromptCompany("会社全体")
      ]);

      const formattedPersonal = personalList.map(item => ({ 
        ...item, 
        id: Number(item.id), 
        username: item.username || "" 
      }));

      const formattedCompany = companyList.map(item => ({ 
        ...item, 
        id: Number(item.id), 
        username: item.username || "" 
      }));

      setPersonalPrompts(formattedPersonal);
      setCompanyPrompts(formattedCompany);
    } catch (error) {
      console.error("データ取得エラー:", error);
      setPersonalPrompts([]);
      setCompanyPrompts([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.name, isLoading]);

  const updatePersonalPrompts = useCallback((prompts: Prompt[]) => {
    setPersonalPrompts(prompts);
  }, []);

  const updateCompanyPrompts = useCallback((prompts: Prompt[]) => {
    setCompanyPrompts(prompts);
  }, []);

  return (
    <PromptContext.Provider value={{
      personalPrompts,
      companyPrompts,
      isLoading,
      refreshPrompts,
      updatePersonalPrompts,
      updateCompanyPrompts
    }}>
      {children}
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  const context = useContext(PromptContext);
  if (context === undefined) {
    throw new Error('usePrompt must be used within a PromptProvider');
  }
  return context;
} 