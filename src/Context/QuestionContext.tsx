// QuestionsContext.tsx
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
  refreshQuestions: () => Promise<void>;
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


  const fetchQuestions = async () => {
    try {
      const idToken = await GetToken();
      const response = await axios.get<Question[]>(`${baseUrl}/questions`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setQuestions(response.data);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const refreshQuestions = async () => {
    setLoading(true);
    await fetchQuestions();
  };

  const updateQuestionInContext = (updatedQuestion: Question) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === updatedQuestion.questionId ? updatedQuestion : q
      )
    );
  };

  const deleteQuestionFromContext = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
  };


  const fetchAndAssignRandomQuestions = async (activeQuestionId: string) => {
    try {
      const idToken = await GetToken();
      const response = await axios.get(
        `${baseUrl}/questions/randomized/${activeQuestionId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      const randomizedQuestions: string[] = response.data.data;
      localStorage.setItem("assignedQuestions", JSON.stringify(randomizedQuestions));
      setStudentQuestions(randomizedQuestions);
    } catch (err) {
      console.error("Error fetching randomized questions:", err);
    }
  };

  const value: QuestionsContextType = {
    questions,
    loading,
    refreshQuestions,
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
