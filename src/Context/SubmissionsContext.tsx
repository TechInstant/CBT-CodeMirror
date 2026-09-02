
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

export interface QuestionResponse {
  QuestionsId: string;
  questionText: string;
  code: string;
  output: string;
  score: number;
  totalScore?: number;
  grading?: {
    model: string;
    rawResponse: string;
    latencyMs: number;
    attempts: number;
    gradedAt: string;
    error?: string;
  };
}

export type GradingStatus = "pending" | "graded" | "failed";

export interface AttemptReview {
  instructorId: string;
  blind: boolean;
  aiScoreVisibleAtReview: boolean;
  openedAt: string;
  submittedAt?: string;
  // This marker's own scores, so a second marker cannot overwrite the first.
  scores?: Record<string, { instructorScore: number; overrideReason?: string }>;
}

export interface Attempt {
  timestamp: string;
  responses: QuestionResponse[];
  manualOverrides: Record<string, number>;
  // Grading happens out of band, so an attempt can exist before it has marks.
  paperId?: string;
  gradingStatus?: GradingStatus;
  gradingError?: string;
  // Allocated at submission time, before anyone sees the work.
  blindReview?: boolean;
  // The primary marker's pass. Kept for readers that predate multiple markers.
  review?: AttemptReview;
  /*
    Every marking pass, keyed by instructor. Inter-rater reliability needs two
    independent marks on the same attempt, which a single review object could not
    hold — the second marker overwrote the first.
  */
  reviews?: Record<string, AttemptReview>;
  primaryInstructorId?: string;
  // Selected for the inter-rater subset; a second marker is expected.
  doubleMarked?: boolean;
}

export interface SubmissionDocument {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  attempts: Attempt[];
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
