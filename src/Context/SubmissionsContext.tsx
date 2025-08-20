
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

export interface QuestionResponse {
  QuestionsId: string;
  questionText: string;
  code: string;
  output: string;
  score: number;
}
export interface SubmissionDocument {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  attempts: Array<{
    timestamp: string;
    responses: QuestionResponse[];
    manualOverrides: Record<string, number>;
  }>;
}

interface SubmissionsContextType {
  submissions: SubmissionDocument[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubmissionsContext = createContext<SubmissionsContextType | null>(null);

export const SubmissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [submissions, setSubmissions] = useState<SubmissionDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = await GetToken();
      const resp = await axios.get<SubmissionDocument[]>(
        `${baseUrl}/submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmissions(resp.data);
    } catch (err) {
      // console.error("Failed to load submissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <SubmissionsContext.Provider value={{ submissions, loading, refresh: fetchAll }}>
      {children}
    </SubmissionsContext.Provider>
  );
};

export function useSubmissions() {
  const ctx = useContext(SubmissionsContext);
  if (!ctx) throw new Error("useSubmissions must be inside SubmissionsProvider");
  return ctx;
}
