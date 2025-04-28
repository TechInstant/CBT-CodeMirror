import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

export interface Question {
  questionId: string;
  CourseTitle: string;
  CourseCode?: string;
  Questions: { [key: string]: string | { questionId: string; questionText: string } };
  Duration: number;
  MaxAnswerableQuestions?: number;
}

interface QuestionsContextType {
  questions: Question[];
  loading: boolean;
  updateQuestionInContext: (updatedQuestion: Question) => void;
  deleteQuestionFromContext: (questionId: string) => void;
  studentQuestions: (string | { questionId: string; questionText: string })[];
  setStudentQuestions: (questions: (string | { questionId: string; questionText: string })[]) => void;
  fetchAndAssignRandomQuestions: (activeQuestionId: string) => Promise<void>;
}

export const QuestionsContext = createContext<QuestionsContextType | null>(null);

export const QuestionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentQuestions, setStudentQuestions] = useState<(string | { questionId: string; questionText: string })[]>([]);

  // Fetch all docs for admin list
  const fetchQuestions = async () => {
    try {
      const idToken = await GetToken();
      const resp = await axios.get<Question[]>(`${baseUrl}/questions`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setQuestions(resp.data);
    } catch (e) {
      console.error("Error fetching questions:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveQuestionId = async (): Promise<string | null> => {
    try {
      const idToken = await GetToken();
      const resp = await axios.get<{ activeQuestionId: string }>(`${baseUrl}/questions/active`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      return resp.data.activeQuestionId;
    } catch (error) {
      console.error("Error fetching active question:", error);
      return null;
    }
  };
  
  
  // Randomized selection of student questions
  const fetchAndAssignRandomQuestions = async (activeQuestionId: string) => {
    try {
      const idToken = await GetToken();
      const resp = await axios.get<{ data: string[] }>(
        `${baseUrl}/questions/randomized/${activeQuestionId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      const randomized = resp.data.data;
      localStorage.setItem("assignedQuestions", JSON.stringify(randomized));
      setStudentQuestions(randomized);
    } catch  {
      console.log("Error fetching randomized questions:");
    }
  };
  
  useEffect(() => {
    const initialize = async () => {
      await fetchQuestions();
  
      let activeId = localStorage.getItem("activeQuestionId");
      const stored = localStorage.getItem("assignedQuestions");
  
      if (!activeId) {
        activeId = await fetchActiveQuestionId();
        if (activeId) {
          localStorage.setItem("activeQuestionId", activeId);
        }
      }
  
      if (activeId) {
        if (stored) {
          setStudentQuestions(JSON.parse(stored));
        } else {
          await fetchAndAssignRandomQuestions(activeId);
        }
      }
    };
  
    initialize();
  }, []);
  
  
  const updateQuestionInContext = (updatedQuestion: Question) => {
    setQuestions((prev) =>
      prev.map((q) => (q.questionId === updatedQuestion.questionId ? updatedQuestion : q))
    );
  };

  const deleteQuestionFromContext = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
  };

  const value: QuestionsContextType = {
    questions,
    loading,
    updateQuestionInContext,
    deleteQuestionFromContext,
    studentQuestions,
    setStudentQuestions,
    fetchAndAssignRandomQuestions,
  };

  return (
    <QuestionsContext.Provider value={value}>
      {children}
    </QuestionsContext.Provider>
  );
};

export const useQuestions = () => {
  const context = useContext(QuestionsContext);
  if (!context) {
    throw new Error("useQuestions must be used within a QuestionsProvider");
  }
  return context;
};
