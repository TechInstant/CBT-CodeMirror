import React, { createContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

export interface Student {
  StudentId: string;
  FirstName: string;
  LastName: string;
  Department: string;
  Email: string;
  Scores: number;
}

interface StudentsContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  refreshStudents: () => void;
}

export const StudentsContext = createContext<StudentsContextType | undefined>(undefined);

export const StudentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);

  const refreshStudents = async () => {
    try {
      const idToken = await GetToken();
      const response = await axios.get<Student[]>(`${baseUrl}/students`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  // useEffect(() => {
  //   const storedUser = localStorage.getItem("userData");
  //   if (storedUser) {
  //     const parsed = JSON.parse(storedUser);
  //     setCurrentStudent(parsed);
  //   }
  // }, []);
  

  useEffect(() => {
    refreshStudents();
  }, []);

  return (
    <StudentsContext.Provider value={{ students, setStudents, refreshStudents }}>
      {children}
    </StudentsContext.Provider>
  );
};
