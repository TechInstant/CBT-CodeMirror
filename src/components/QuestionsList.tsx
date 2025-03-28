import React, { useState, useEffect } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

interface Question {
  id: string;
  CourseTitle: string;
  CourseCode?: string;
  Questions: { [key: string]: string }; // Object containing multiple questions
  Duration: number;
}

const QuestionsList: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [assignedQuestion, setAssignedQuestion] = useState<string>("");

  useEffect(() => {
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

    fetchQuestions();
  }, []);

  // Function to pick a random question from a Questions object
  const getRandomQuestion = (questionsObj: { [key: string]: string }): string => {
    const questionValues = Object.values(questionsObj);
    if (questionValues.length === 0) return "No questions available.";
    const randomIndex = Math.floor(Math.random() * questionValues.length);
    return questionValues[randomIndex];
  };

  // For demonstration, assign a random question from the first question object when data loads
  useEffect(() => {
    if (questions.length > 0) {
      const randomQ = getRandomQuestion(questions[0].Questions);
      setAssignedQuestion(randomQ);
    }
  }, [questions]);

  const filteredQuestions = questions.filter((q) =>
    q.CourseTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Questions List</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search questions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border rounded-md w-full"
        />
      </div>
      {loading ? (
        <p>Loading questions...</p>
      ) : (
        <div className="bg-white p-4 shadow-md rounded overflow-auto">
          <p className="mb-4 font-semibold">Assigned Question:</p>
          <p className="mb-4">{assignedQuestion}</p>
          <ul className="space-y-2">
            {filteredQuestions.map((q) => (
              <li key={q.id} className="border p-2 rounded-md bg-gray-50">
                <p className="font-bold">{q.CourseTitle}</p>
                <p>{getRandomQuestion(q.Questions)}</p>
                <div className="mt-1 space-x-2 text-sm">\n                  
            <button className="text-blue-600 hover:underline">Edit</button>                 
            <button className="text-red-600 hover:underline">Delete</button>             
            </div>\n              
            </li>           
        ))}         
        </ul>      
        </div>   
     )}
    </div>
  );
};

export default QuestionsList;
