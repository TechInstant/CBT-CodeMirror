import React, { ChangeEvent, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  HelpCircle,
  Clock,
  Hash,
  Code2,
} from "lucide-react";
import { baseUrl, GetToken } from "../App";
import { useQuestions, Question, PaperLanguage } from "../Context/QuestionContext";
import {
  Card,
  CardHeader,
  PageHeader,
  Button,
  Input,
  Select,
  Badge,
  EmptyState,
  Loading,
  Modal,
} from "./ui";

const QuestionsList: React.FC = () => {
  const {
    questions,
    loading,
    updateQuestionInContext,
    deleteQuestionFromContext,
    setStudentQuestions,
    fetchAndAssignRandomQuestions,
  } = useQuestions();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);
  const [showDocumentDeleteModal, setShowDocumentDeleteModal] = useState(false);
  const [targetDocument, setTargetDocument] = useState<Question | null>(null);
  const [showLineDeleteModal, setShowLineDeleteModal] = useState(false);
  const [targetQuestionLineKey, setTargetQuestionLineKey] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredQuestions = questions.filter((q) =>
    `${q.CourseTitle} ${q.CourseCode ?? ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const countQuestions = (q: Question) =>
    q.Questions ? Object.keys(q.Questions).length : 0;

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

  /*
    Activation lives on the server (isActive on the question document), and the
    endpoint toggles it. Deactivate previously only cleared localStorage, so the
    paper stayed active for every other browser and students could still be
    served it. Both directions now go through the API, and the list reads
    isActive from the document rather than from this browser's localStorage.
  */
  const toggleActivation = async (q: Question) => {
    setBusyId(q.QuestionsId);
    try {
      const idToken = await GetToken();
      await axios.patch(
        `${baseUrl}/questions/activate/${q.QuestionsId}`,
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      const nowActive = !q.isActive;
      updateQuestionInContext({ ...q, isActive: nowActive });

      if (nowActive) {
        localStorage.setItem("activeQuestionsId", q.QuestionsId);
        await fetchAndAssignRandomQuestions(q.QuestionsId);
        toast.success(`"${q.CourseTitle}" is now active`);
      } else {
        localStorage.removeItem("activeQuestionsId");
        localStorage.removeItem("assignedQuestions");
        setStudentQuestions([]);
        toast.success(`"${q.CourseTitle}" deactivated`);
      }
    } catch (err: any) {
      toast.error(
        "Could not change activation: " +
          (err?.response?.data?.message || err?.message || "unknown error")
      );
    } finally {
      setBusyId(null);
    }
  };

  const initiateDeleteDocument = (question: Question) => {
    setTargetDocument(question);
    setShowDocumentDeleteModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!targetDocument) return;
    try {
      const idToken = await GetToken();
      await axios.delete(`${baseUrl}/questions/${targetDocument.QuestionsId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      deleteQuestionFromContext(targetDocument.QuestionsId);
      if (selectedQuestion?.QuestionsId === targetDocument.QuestionsId) {
        setSelectedQuestion(null);
      }
      toast.success("Paper deleted");
    } catch (err: any) {
      toast.error("Could not delete paper: " + (err?.message || "unknown error"));
    } finally {
      setShowDocumentDeleteModal(false);
      setTargetDocument(null);
    }
  };

  const initiateDeleteQuestionLine = (key: string) => {
    setTargetQuestionLineKey(key);
    setShowLineDeleteModal(true);
  };

  const confirmDeleteQuestionLine = () => {
    if (!editedQuestion || !targetQuestionLineKey) return;
    const newQuestions = { ...editedQuestion.Questions };
    delete newQuestions[targetQuestionLineKey];
    setEditedQuestion({ ...editedQuestion, Questions: newQuestions });
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
      Questions: { ...editedQuestion.Questions, [key]: value },
    });
  };

  const handleAddQuestionField = () => {
    if (!editedQuestion) return;
    const newKey = `Question${Object.keys(editedQuestion.Questions).length + 1}`;
    setEditedQuestion({
      ...editedQuestion,
      Questions: { ...editedQuestion.Questions, [newKey]: "New question text here" },
    });
  };

  const handleSave = async () => {
    if (!editedQuestion) return;
    try {
      const idToken = await GetToken();
      const response = await axios.patch(
        `${baseUrl}/questions/${editedQuestion.QuestionsId}`,
        editedQuestion,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      updateQuestionInContext(response.data.data);
      setSelectedQuestion(response.data.data);
      setIsEditing(false);
      setEditedQuestion(null);
      toast.success("Paper saved");
    } catch (error: any) {
      toast.error("Could not save paper: " + (error?.message || "unknown error"));
    }
  };

  const modals = (
    <>
      {showDocumentDeleteModal && (
        <Modal
          title="Delete this paper?"
          onClose={() => setShowDocumentDeleteModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowDocumentDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDeleteDocument}>
                Delete paper
              </Button>
            </>
          }
        >
          This removes <strong>{targetDocument?.CourseTitle}</strong> and all of its
          questions. Submissions already recorded against it are not affected.
        </Modal>
      )}
      {showLineDeleteModal && (
        <Modal
          title="Delete this question?"
          onClose={() => setShowLineDeleteModal(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowLineDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDeleteQuestionLine}>
                Delete question
              </Button>
            </>
          }
        >
          Removes <strong>{targetQuestionLineKey}</strong> from this paper. Nothing is
          saved until you press Save.
        </Modal>
      )}
    </>
  );

  /* ---------- List view ---------- */
  if (!selectedQuestion) {
    return (
      <>
        {modals}
        <PageHeader
          title="Question Papers"
          subtitle={`${questions.length} paper${questions.length === 1 ? "" : "s"}`}
        />

        <Card>
          <div className="border-b border-slate-200 p-4">
            <Input
              type="search"
              placeholder="Search by course title or code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <Loading label="Loading papers" />
          ) : filteredQuestions.length === 0 ? (
            <EmptyState
              icon={<HelpCircle className="h-10 w-10" />}
              title={questions.length === 0 ? "No papers yet" : "No matches"}
              hint={
                questions.length === 0
                  ? "Upload a questions CSV from the Upload page to create one."
                  : "Try a different course title or code."
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredQuestions.map((q) => (
                <li
                  key={q.QuestionsId}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => handleQuestionClick(q)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-navy-900">{q.CourseTitle}</span>
                      {q.isActive && <Badge tone="green">Active</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {q.CourseCode && (
                        <span className="inline-flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {q.CourseCode}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {q.Duration} min
                      </span>
                      <span>{countQuestions(q)} questions</span>
                      <span className="inline-flex items-center gap-1">
                        <Code2 className="h-3 w-3" />
                        {q.Language === "javascript" ? "JavaScript" : "Python"}
                      </span>
                    </div>
                  </button>

                  <Button
                    variant={q.isActive ? "secondary" : "primary"}
                    size="sm"
                    disabled={busyId === q.QuestionsId}
                    onClick={() => toggleActivation(q)}
                    className="shrink-0"
                  >
                    {busyId === q.QuestionsId
                      ? "Working…"
                      : q.isActive
                      ? "Deactivate"
                      : "Activate"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </>
    );
  }

  /* ---------- Detail / edit view ---------- */
  return (
    <>
      {modals}
      <Button variant="ghost" size="sm" onClick={handleBackToList} className="mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to papers
      </Button>

      {!isEditing ? (
        <Card>
          <CardHeader
            title={selectedQuestion.CourseTitle}
            actions={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleEdit(selectedQuestion)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => initiateDeleteDocument(selectedQuestion)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            }
          />
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
            {selectedQuestion.CourseCode && (
              <span>
                <span className="text-slate-400">Code:</span> {selectedQuestion.CourseCode}
              </span>
            )}
            <span>
              <span className="text-slate-400">Duration:</span> {selectedQuestion.Duration} minutes
            </span>
            <span>
              <span className="text-slate-400">Questions:</span>{" "}
              {countQuestions(selectedQuestion)}
            </span>
            {selectedQuestion.isActive && <Badge tone="green">Active</Badge>}
          </div>
          <ol className="divide-y divide-slate-100">
            {Object.entries(selectedQuestion.Questions).map(([key, value], i) => (
              <li key={key} className="flex gap-4 px-5 py-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-700">
                  {i + 1}
                </span>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {typeof value === "object" && value !== null ? value.questionText : value}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        editedQuestion && (
          <Card>
            <CardHeader
              title="Edit paper"
              actions={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedQuestion(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save changes
                  </Button>
                </div>
              }
            />
            <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Course title
                </span>
                <Input
                  name="CourseTitle"
                  value={editedQuestion.CourseTitle}
                  onChange={handleInputChange}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Course code
                </span>
                <Input
                  name="CourseCode"
                  value={editedQuestion.CourseCode || ""}
                  onChange={handleInputChange}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Duration (minutes)
                </span>
                <Input
                  type="number"
                  name="Duration"
                  value={editedQuestion.Duration}
                  onChange={handleInputChange}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Language
                </span>
                <Select
                  value={editedQuestion.Language ?? "python"}
                  onChange={(e) =>
                    setEditedQuestion({
                      ...editedQuestion,
                      Language: e.target.value as PaperLanguage,
                    })
                  }
                  className="w-full"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </Select>
              </label>
            </div>

            <div className="space-y-3 p-5">
              {Object.entries(editedQuestion.Questions).map(([key, value]) => (
                <div key={key} className="flex items-end gap-3">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">
                      {key}
                    </span>
                    <Input
                      value={
                        typeof value === "object" && value !== null
                          ? value.questionText
                          : value
                      }
                      onChange={(e) => handleQuestionFieldChange(key, e.target.value)}
                    />
                  </label>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => initiateDeleteQuestionLine(key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={handleAddQuestionField}>
                <Plus className="h-3.5 w-3.5" />
                Add question
              </Button>
            </div>
          </Card>
        )
      )}
    </>
  );
};

export default QuestionsList;
