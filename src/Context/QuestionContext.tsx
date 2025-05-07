import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

export interface StudentQuestion {
  QuestionsId: string;
  questionText: string;
}

export interface Question {
  QuestionsId: string;
  CourseTitle: string;
  CourseCode?: string;
  Questions: Record<string, string | { QuestionsId: string; questionText: string }>;
  Duration: number;
  MaxAnswerableQuestions?: number;
  isActive?: boolean;
  isDeleted?: boolean;
}

interface QuestionsContextType {
  questions: Question[];
  loading: boolean;
  updateQuestionInContext: (updatedQuestion: Question) => void;
  deleteQuestionFromContext: (QuestionsId: string) => void;
  studentQuestions: StudentQuestion[];
  setStudentQuestions: (questions: StudentQuestion[]) => void;
  fetchAndAssignRandomQuestions: (activeQuestionsId: string) => Promise<void>;
  getActiveQuestion: () => Question | undefined;
}

export const QuestionsContext = createContext<QuestionsContextType | null>(null);

export const QuestionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentQuestions, setStudentQuestions] = useState<StudentQuestion[]>([]);

  // Fetch all docs for admin list
  const fetchQuestions = async () => {
    try {
      const idToken = await GetToken();
      const resp = await axios.get<Question[]>(
        `${baseUrl}/questions`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      setQuestions(resp.data);
    } catch (e) {
      console.error("Error fetching questions:", e);
    } finally {
      setLoading(false);
    }
  };

  // Randomized selection of student questions
  const fetchAndAssignRandomQuestions = async (activeQuestionsId: string) => {
    try {
      const activeDoc = questions.find((q) => q.QuestionsId === activeQuestionsId);
      if (!activeDoc) return;

      const idToken = await GetToken();
      const resp = await axios.get<{ data: any[] }>(
        `${baseUrl}/questions/randomized/${activeDoc.QuestionsId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      const raw = resp.data.data;

      let qq: StudentQuestion[];

      if (raw.length > 0 && typeof raw[0] === "object" && "questionText" in raw[0]) {
        qq = raw as StudentQuestion[];
      } else {
   
        qq = (raw as string[]).map((qid) => {
          const entry = activeDoc.Questions[qid];
          const text =
            typeof entry === "object" && "questionText" in entry
              ? entry.questionText
              : typeof entry === "string"
              ? entry
              : "";
          return { QuestionsId: qid, questionText: text };
        });
      }

      setStudentQuestions(qq);
      localStorage.setItem("assignedQuestions", JSON.stringify(qq));
      localStorage.setItem("activeQuestionsId", activeQuestionsId);
    } catch (err) {
      console.error("Error fetching randomized questions:", err);
    }
  };

  useEffect(() => { fetchQuestions(); }, []);

  useEffect(() => {
    if (!questions.length) return;
    const active = questions.find((q) => q.isActive);
    if (!active) {
      console.error("No active question in context!");
      return;
    }

    const stored = localStorage.getItem("assignedQuestions");
    if (stored) {
      setStudentQuestions(JSON.parse(stored));
    } else {
      fetchAndAssignRandomQuestions(active.QuestionsId);
    }
  }, [questions]);

  const getActiveQuestion = () => {
    const activeId = localStorage.getItem("activeQuestionsId");
    return questions.find(q => q.QuestionsId === activeId);
  };

  const updateQuestionInContext = (updatedQuestion: Question) => {
    setQuestions(prev => prev.map(q => q.QuestionsId === updatedQuestion.QuestionsId ? updatedQuestion : q));
  };

  const deleteQuestionFromContext = (QuestionsId: string) => {
    setQuestions(prev => prev.filter(q => q.QuestionsId !== QuestionsId));
  };

  return (
    <QuestionsContext.Provider value={{
      questions,
      loading,
      updateQuestionInContext,
      deleteQuestionFromContext,
      studentQuestions,
      setStudentQuestions,
      fetchAndAssignRandomQuestions,
      getActiveQuestion,
    }}>
      {children}
    </QuestionsContext.Provider>
  );
};

export const useQuestions = () => {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error("useQuestions must be used within QuestionsProvider");
  return ctx;
};
