import React, { useState, useEffect, ChangeEvent } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

interface Question {
  QuestionId: string;
  CourseTitle: string;
  CourseCode?: string;
  Questions: { [key: string]: string };
  Duration: number;
}


const QuestionsList: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);

 
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const idToken = await GetToken();
        const response = await axios.get<Question[]>(`${baseUrl}/questions`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        setQuestions(response.data);
      } catch (error) {
        console.log("Error fetching questions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Filter questions by CourseTitle
  const filteredQuestions = questions.filter((q) =>
    q.CourseTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers for click, edit, and delete actions
  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setIsEditing(false);
    setEditedQuestion(null);
  };

  const handleBackToList = () => {
    setSelectedQuestion(null);
    setIsEditing(false);
    setEditedQuestion(null);
  };


  const handleEdit = (question: Question) => {
    setIsEditing(true);
    setEditedQuestion({ ...question });
  };

  // Handler for deleting a question
  const handleDelete = async (question: Question) => {
    try {
      const idToken = await GetToken();
      await axios.delete(`${baseUrl}/questions/${question.QuestionId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      setQuestions((prev) => prev.filter((q) => q.QuestionId !== question.QuestionId));
      if (selectedQuestion?.QuestionId === question.QuestionId) {
        setSelectedQuestion(null);
      }
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  // Update input fields for editing
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!editedQuestion) return;
    const { name, value } = e.target;
    setEditedQuestion({
      ...editedQuestion,
      [name]:
        name === "Duration" ? parseInt(value, 10) || 0 : value,
    });
  };

  // Update a specific question field in the Questions object
  const handleQuestionFieldChange = (key: string, value: string) => {
    if (!editedQuestion) return;
    setEditedQuestion({
      ...editedQuestion,
      Questions: {
        ...editedQuestion.Questions,
        [key]: value,
      },
    });
  };

  // Save edited question to the backend
  const handleSave = async () => {
    if (!editedQuestion) return;
    try {
      const idToken = await GetToken();
      const response = await axios.patch(
        `${baseUrl}/questions/${editedQuestion.QuestionId}`,
        editedQuestion,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      // Update the questions state with the edited question
      setQuestions((prev) =>
        prev.map((q) =>
          q.QuestionId === editedQuestion.QuestionId ? response.data.data : q
        )
      );
      setSelectedQuestion(response.data.data);
      setIsEditing(false);
      setEditedQuestion(null);
    } catch (error) {
      console.error("Error updating question:", error);
    }
  };

  return (
    <div className="p-4">
      {!selectedQuestion ? (
        <>
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
              <ul className="space-y-2">
                {filteredQuestions.map((q) => (
                  <li
                    key={q.QuestionId}
                    className="border p-2 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleQuestionClick(q)}
                  >
                    <p className="font-bold">{q.CourseTitle}</p>
                    {q.CourseCode && <p>{q.CourseCode}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white p-4 shadow-md rounded">
          <button
            onClick={handleBackToList}
            className="text-blue-600 hover:underline mb-4"
          >
            Back to List
          </button>
          {!isEditing ? (
            <>
              <h2 className="text-xl font-bold mb-2">
                {selectedQuestion.CourseTitle}
              </h2>
              {selectedQuestion.CourseCode && (
                <p className="mb-2">
                  Course Code: {selectedQuestion.CourseCode}
                </p>
              )}
              <p className="mb-2">
                Duration: {selectedQuestion.Duration} minutes
              </p>
              <div>
                <h3 className="font-bold mb-1">Questions:</h3>
                <ul className="list-disc pl-5">
                  {Object.entries(selectedQuestion.Questions).map(
                    ([key, value]) => (
                      <li key={key}>
                        <strong>{key}:</strong> {value}
                      </li>
                    )
                  )}
                </ul>
              </div>
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => handleEdit(selectedQuestion)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedQuestion)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            // Editing form
            editedQuestion && (
              <div>
                <h2 className="text-xl font-bold mb-2">Edit Question</h2>
                <div className="mb-2">
                  <label className="block mb-1">Course Title:</label>
                  <input
                    type="text"
                    name="CourseTitle"
                    value={editedQuestion.CourseTitle}
                    onChange={handleInputChange}
                    className="px-2 py-1 border rounded-md w-full"
                  />
                </div>
                <div className="mb-2">
                  <label className="block mb-1">Course Code:</label>
                  <input
                    type="text"
                    name="CourseCode"
                    value={editedQuestion.CourseCode || ""}
                    onChange={handleInputChange}
                    className="px-2 py-1 border rounded-md w-full"
                  />
                </div>
                <div className="mb-2">
                  <label className="block mb-1">Duration (minutes):</label>
                  <input
                    type="number"
                    name="Duration"
                    value={editedQuestion.Duration}
                    onChange={handleInputChange}
                    className="px-2 py-1 border rounded-md w-full"
                  />
                </div>
                <div className="mb-2">
                  <h3 className="font-bold mb-1">Questions:</h3>
                  {Object.entries(editedQuestion.Questions).map(
                    ([key, value]) => (
                      <div key={key} className="mb-1">
                        <label className="block text-sm font-semibold">
                          {key}:
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            handleQuestionFieldChange(key, e.target.value)
                          }
                          className="px-2 py-1 border rounded-md w-full"
                        />
                      </div>
                    )
                  )}
                </div>
                <div className="mt-4 space-x-2">
                  <button
                    onClick={handleSave}
                    className="text-green-600 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedQuestion(null);
                    }}
                    className="text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionsList;
