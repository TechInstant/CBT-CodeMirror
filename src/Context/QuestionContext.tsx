// QuestionsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

// Define the Question interface (adjust as needed)
export interface Question {
  questionId: string;
  CourseTitle: string;
  CourseCode?: string;
  Questions: { [key: string]: string | { questionId: string; questionText: string } };
  Duration: number;
}

// Define the type for our Context's value.
interface QuestionsContextType {
  questions: Question[];
  loading: boolean;
  refreshQuestions: () => Promise<void>;
  updateQuestionInContext: (updatedQuestion: Question) => void;
  deleteQuestionFromContext: (questionId: string) => void;
}

// Create the Context with default value as null
const QuestionsContext = createContext<QuestionsContextType | null>(null);


export const QuestionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch the questions from your backend
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

  // Call fetchQuestions once when the provider is mounted
  useEffect(() => {
    fetchQuestions();
  }, []);

  // Function to force a refresh of the questions
  const refreshQuestions = async () => {
    setLoading(true);
    await fetchQuestions();
  };

    // Function to update a question in the state context
  const updateQuestionInContext = (updatedQuestion: Question) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.questionId === updatedQuestion.questionId ? updatedQuestion : q
      )
    );
  };

  // Function to remove a question from the state context
  const deleteQuestionFromContext = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
  };

  const value: QuestionsContextType = {
    questions,
    loading,
    refreshQuestions,
    updateQuestionInContext,
    deleteQuestionFromContext,
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
