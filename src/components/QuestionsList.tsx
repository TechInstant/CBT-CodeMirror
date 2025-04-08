// QuestionsList.tsx
import React, { ChangeEvent, useState } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";
import { useQuestions, Question } from "../Context/QuestionContext"; 

interface ModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ModalProps> = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
      <div className="bg-white rounded p-6 w-80 shadow-lg border">
        <p className="mb-4">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Yes
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionsList: React.FC = () => {
  // Instead of our own questions state, use the context.
  const { questions, loading, updateQuestionInContext, deleteQuestionFromContext } = useQuestions();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);
  const [showDocumentDeleteModal, setShowDocumentDeleteModal] = useState(false);
  const [targetDocument, setTargetDocument] = useState<Question | null>(null);
  const [showLineDeleteModal, setShowLineDeleteModal] = useState(false);
  const [targetQuestionLineKey, setTargetQuestionLineKey] = useState<string | null>(null);

  const filteredQuestions = questions.filter((q) =>
    q.CourseTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const initiateDeleteDocument = (question: Question) => {
    setTargetDocument(question);
    setShowDocumentDeleteModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!targetDocument) return;
    try {
      const idToken = await GetToken();
      await axios.delete(`${baseUrl}/questions/${targetDocument.questionId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      deleteQuestionFromContext(targetDocument.questionId);
      if (selectedQuestion?.questionId === targetDocument.questionId) {
        setSelectedQuestion(null);
      }
    } catch (error) {
      console.error("Error deleting question:", error);
    } finally {
      setShowDocumentDeleteModal(false);
      setTargetDocument(null);
    }
  };

  const cancelDeleteDocument = () => {
    setShowDocumentDeleteModal(false);
    setTargetDocument(null);
  };

  const initiateDeleteQuestionLine = (key: string) => {
    setTargetQuestionLineKey(key);
    setShowLineDeleteModal(true);
  };

  const confirmDeleteQuestionLine = () => {
    if (!editedQuestion || !targetQuestionLineKey) return;
    const newQuestions = { ...editedQuestion.Questions };
    delete newQuestions[targetQuestionLineKey];
    setEditedQuestion({
      ...editedQuestion,
      Questions: newQuestions,
    });
    setShowLineDeleteModal(false);
    setTargetQuestionLineKey(null);
  };

  const cancelDeleteQuestionLine = () => {
    setShowLineDeleteModal(false);
    setTargetQuestionLineKey(null);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!editedQuestion) return;
    const { name, value } = e.target;
    setEditedQuestion({
      ...editedQuestion,
      [name]: name === "Duration" ? parseInt(value, 10) || 0 : value,
    });
  };

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

  const handleAddQuestionField = () => {
    if (!editedQuestion) return;
    const newKey = `Question${Object.keys(editedQuestion.Questions).length + 1}`;
    const newQuestions = {
      ...editedQuestion.Questions,
      [newKey]: "New question text here",
    };
    setEditedQuestion({
      ...editedQuestion,
      Questions: newQuestions,
    });
  };

  const handleSave = async () => {
    if (!editedQuestion) return;
    try {
      const idToken = await GetToken();
      const response = await axios.patch(
        `${baseUrl}/questions/${editedQuestion.questionId}`,
        editedQuestion,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      // Update the question in the context.
      updateQuestionInContext(response.data.data);
      setSelectedQuestion(response.data.data);
      setIsEditing(false);
      setEditedQuestion(null);
    } catch (error) {
      console.error("Error updating question:", error);
    }
  };

  return (
    <div className="p-4">
      {showDocumentDeleteModal && (
        <ConfirmationModal
          message="Are you sure you want to delete this entire question document?"
          onConfirm={confirmDeleteDocument}
          onCancel={cancelDeleteDocument}
        />
      )}
      {showLineDeleteModal && (
        <ConfirmationModal
          message="Are you sure you want to delete this question line?"
          onConfirm={confirmDeleteQuestionLine}
          onCancel={cancelDeleteQuestionLine}
        />
      )}
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
                    key={q.questionId}
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
        <div className="bg-white p-4 shadow-md rounded relative">
          <button
            onClick={handleBackToList}
            className="text-blue-600 hover:underline mb-4 flex items-center space-x-1"
          >
            <span aria-hidden="true">⬅️🔙</span>
            <span>Back to List</span>
          </button>
          {!isEditing ? (
            <>
              <h2 className="text-xl font-bold mb-2">{selectedQuestion.CourseTitle}</h2>
              {selectedQuestion.CourseCode && (
                <p className="mb-2">Course Code: {selectedQuestion.CourseCode}</p>
              )}
              <p className="mb-2">Duration: {selectedQuestion.Duration} minutes</p>
              <div>
                <h3 className="font-bold mb-1">Questions:</h3>
                <ul className="list-disc pl-5">
                  {Object.entries(selectedQuestion.Questions).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong>{" "}
                      {typeof value === "object" && value !== null
                        ? value.questionText
                        : value}
                    </li>
                  ))}
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
                  onClick={() => initiateDeleteDocument(selectedQuestion)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
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
                {/* Questions Object */}
                <div className="mb-2">
                  <h3 className="font-bold mb-1">Questions:</h3>
                  {Object.entries(editedQuestion.Questions).map(([key, value]) => (
                    <div key={key} className="flex items-center mb-2">
                      <div className="flex-grow">
                        <label className="block text-sm font-semibold">{key}:</label>
                        <input
                          type="text"
                          value={typeof value === "object" && value !== null ? value.questionText : value}
                          onChange={(e) => handleQuestionFieldChange(key, e.target.value)}
                          className="px-2 py-1 border rounded-md w-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => initiateDeleteQuestionLine(key)}
                        className="ml-2 text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {/* Add new question line */}
                  <button
                    type="button"
                    onClick={handleAddQuestionField}
                    className="mt-2 px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                  >
                    Add Question
                  </button>
                </div>
                <div className="mt-4 space-x-2">
                  <button onClick={handleSave} className="text-green-600 hover:underline">
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
