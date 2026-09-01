import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Papa from "papaparse";
import axios from "axios";
import { UploadCloud, FileCheck2, Check, Info } from "lucide-react";
import { baseUrl, GetToken } from "../App";
import {
  Card,
  CardHeader,
  PageHeader,
  Button,
  Input,
  Select,
  TableWrap,
  Th,
  Td,
  Badge,
} from "./ui";

const steps = [
  { n: 1, label: "Students" },
  { n: 2, label: "Questions" },
  { n: 3, label: "Course details" },
];

const AdminUpload: React.FC = () => {
  const [step, setStep] = useState(1);
  const [studentsFile, setStudentsFile] = useState<File | null>(null);
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [questionsData, setQuestionsData] = useState<any[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [timer, setTimer] = useState("");
  const [MaxAnswerable, setMaxAnswerable] = useState<number>(0);
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [showMaxInfo, setShowMaxInfo] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });

  const navigate = useNavigate();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    if (event.target.files) {
      const file = event.target.files[0];
      type === "students" ? setStudentsFile(file) : setQuestionsFile(file);

      const reader = new FileReader();
      reader.onload = async ({ target }) => {
        if (target?.result) {
          Papa.parse(target.result as string, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
              if (type === "students") {
                const formattedStudents = results.data.map((student: any) => {
                  const names = student.Names ? student.Names.split(" ") : ["", ""];
                  return {
                    StudentId: student.MatricNo || " ",
                    FirstName: names[1] || " ",
                    LastName: names[0] || " ",
                    Department: student.Department || " ",
                    Password: student.Password || " ",
                    Role: "Student",
                    Email: " ",
                  };
                });
                setStudentsData(formattedStudents);
              } else {
                const questionsArray: any = [];
                results.data.forEach((question: any) => {
                  questionsArray.push({
                    questionId: question["Question ID"],
                    questionText: question.Question,
                  });
                });
                setQuestionsData(questionsArray);
                // Clamp MaxAnswerable if needed
                setMaxAnswerable((prev) =>
                  prev > questionsArray.length ? questionsArray.length : prev
                );
              }
            },
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleNext = () => {
    if (step === 1 && !studentsFile) {
      return toast.error("Please upload the students CSV file!");
    }
    if (step === 2 && !questionsFile) {
      return toast.error("Please upload the questions CSV file!");
    }
    if (step === 3 && !courseTitle) {
      return toast.error("Please enter a course title!");
    }
    setStep(step + 1);
  };

  const handlePrevious = () => step > 1 && setStep(step - 1);

  const handleSubmit = async () => {
    if (studentsData.length === 0 || questionsData.length === 0) {
      return toast.error(
        "Please upload and process both students and questions files!"
      );
    }
    setSubmitting(true);
    try {
      const idToken = await GetToken();
      const existingResponse = await axios.get(`${baseUrl}/students`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const existingStudents = existingResponse.data;
      const existingStudentIds = new Set(
        existingStudents.map((s: any) => s.StudentId)
      );

      const toCreate = studentsData.filter(
        (s) => !existingStudentIds.has(s.StudentId)
      );
      setProgress({ done: 0, total: toCreate.length, failed: 0 });

      // Sequential on purpose: a whole cohort fired at once is a burst the API
      // has no reason to absorb. Failures are counted rather than swallowed, so
      // a partial upload cannot look like a complete one.
      let failed = 0;
      for (let i = 0; i < toCreate.length; i++) {
        try {
          await axios.post(`${baseUrl}/students`, toCreate[i], {
            headers: { Authorization: `Bearer ${idToken}` },
          });
        } catch {
          failed++;
        }
        setProgress({ done: i + 1, total: toCreate.length, failed });
      }

      const questions = {
        CourseTitle: courseTitle,
        Duration: Number(timer),
        MaxAnswerable: MaxAnswerable,
        Questions: questionsData,
        CourseCode: "",
        Language: language,
      };

      await axios.post(`${baseUrl}/questions`, questions, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      const skipped = studentsData.length - toCreate.length;
      if (failed > 0) {
        toast.warn(
          `Paper created. ${toCreate.length - failed} students added, ${failed} failed${
            skipped ? `, ${skipped} already existed` : ""
          }.`
        );
      } else {
        toast.success(
          `Uploaded. ${toCreate.length} students added${
            skipped ? `, ${skipped} already existed` : ""
          }.`
        );
      }
      navigate("/AdminDashboard");
    } catch {
      toast.error("Error uploading data.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalQuestions = questionsData.length;

  const DropZone: React.FC<{
    id: string;
    file: File | null;
    rows: number;
    label: string;
    type: string;
  }> = ({ id, file, rows, label, type }) => (
    <>
      <button
        onClick={() => document.getElementById(id)?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2
          border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition-colors
          hover:border-navy-400 hover:bg-navy-50/40"
      >
        {file ? (
          <FileCheck2 className="h-8 w-8 text-emerald-600" />
        ) : (
          <UploadCloud className="h-8 w-8 text-slate-400" />
        )}
        <span className="text-sm font-medium text-navy-900">
          {file ? file.name : label}
        </span>
        <span className="text-xs text-slate-500">
          {file ? `${rows} row${rows === 1 ? "" : "s"} parsed · click to replace` : "CSV files only"}
        </span>
      </button>
      <input
        type="file"
        id={id}
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFileChange(e, type)}
      />
    </>
  );

  return (
    <>
      <PageHeader
        title="Upload"
        subtitle="Load a student roster and a question paper."
      />

      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step > s.n
                  ? "bg-emerald-600 text-white"
                  : step === s.n
                  ? "bg-navy-700 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {step > s.n ? <Check className="h-4 w-4" /> : s.n}
            </span>
            <span
              className={`hidden text-sm sm:block ${
                step >= s.n ? "font-medium text-navy-900" : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={`h-px flex-1 ${step > s.n ? "bg-emerald-600" : "bg-slate-200"}`}
              />
            )}
          </li>
        ))}
      </ol>

      <Card>
        {step === 1 && (
          <>
            <CardHeader
              title="Step 1 · Students CSV"
              actions={studentsData.length > 0 && <Badge tone="green">{studentsData.length} rows</Badge>}
            />
            <div className="space-y-4 p-5">
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-navy-700">
                  Required CSV format
                </summary>
                <p className="mt-2 text-xs text-slate-600">
                  Headers are case-sensitive: <code className="rounded bg-white px-1 py-0.5">Names,MatricNo,Department,Password</code>
                  . <strong>Names</strong> is the full name (e.g. "Doe John"); the first
                  word is taken as the surname.
                </p>
                <div className="mt-2 overflow-x-auto rounded border border-slate-200 bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <Th>Names</Th>
                        <Th>MatricNo</Th>
                        <Th>Department</Th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <Td>Doe John</Td>
                        <Td>CS12345</Td>
                        <Td>Computer Science</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>

              <DropZone
                id="studentsFile"
                file={studentsFile}
                rows={studentsData.length}
                label="Upload students CSV"
                type="students"
              />

              {studentsData.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Preview · first row
                  </p>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <TableWrap>
                      <thead>
                        <tr>
                          {Object.keys(studentsData[0]).map((key) => (
                            <Th key={key}>{key}</Th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {studentsData.slice(0, 1).map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, idx) => (
                              <Td key={idx}>{value as string}</Td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader
              title="Step 2 · Questions CSV"
              actions={questionsData.length > 0 && <Badge tone="green">{questionsData.length} questions</Badge>}
            />
            <div className="space-y-4 p-5">
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-navy-700">
                  Required CSV format
                </summary>
                <p className="mt-2 text-xs text-slate-600">
                  Headers are case-sensitive:{" "}
                  <code className="rounded bg-white px-1 py-0.5">Question ID,Question</code>
                </p>
                <div className="mt-2 overflow-x-auto rounded border border-slate-200 bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <Th>Question ID</Th>
                        <Th>Question</Th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <Td>Q1</Td>
                        <Td>Explain OOP concepts.</Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>

              <DropZone
                id="questionsFile"
                file={questionsFile}
                rows={questionsData.length}
                label="Upload questions CSV"
                type="questions"
              />

              {questionsData.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Preview · first row
                  </p>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <TableWrap>
                      <thead>
                        <tr>
                          <Th>Question ID</Th>
                          <Th>Question</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {questionsData.slice(0, 1).map((q, idx) => (
                          <tr key={idx}>
                            <Td>{q.questionId}</Td>
                            <Td>{q.questionText}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader title="Step 3 · Course details" />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Course title
                </span>
                <Input
                  type="text"
                  placeholder="e.g. Introduction to Programming"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Duration (minutes)
                </span>
                <Input
                  type="number"
                  value={timer}
                  onChange={(e) => setTimer(e.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Language
                </span>
                <Select
                  value={language}
                  onChange={(e) =>
                    setLanguage(e.target.value as "python" | "javascript")
                  }
                  className="w-full sm:w-56"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </Select>
                <span className="mt-1.5 block text-xs text-slate-500">
                  Every student sits this paper in this language; the editor runs
                  and highlights it accordingly.
                </span>
              </label>

              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Max answerable questions
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMaxInfo(!showMaxInfo)}
                    className="text-slate-400 hover:text-navy-700"
                    aria-label="What is this?"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                {showMaxInfo && (
                  <p className="mb-2 rounded-lg border border-navy-100 bg-navy-50 p-3 text-xs text-navy-800">
                    How many questions each student is given, drawn at random from the
                    uploaded set. Use <strong>MAX</strong> to give every student all of
                    them.
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    className="w-28"
                    value={MaxAnswerable}
                    min={0}
                    max={totalQuestions}
                    onChange={(e) => {
                      let val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < 0) val = 0;
                      if (val > totalQuestions) val = totalQuestions;
                      setMaxAnswerable(val);
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={MaxAnswerable === totalQuestions}
                    onClick={() => setMaxAnswerable(totalQuestions)}
                  >
                    MAX
                  </Button>
                  <span className="text-sm text-slate-500">of {totalQuestions}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Upload progress — a 140-student roster is posted one at a time. */}
        {submitting && progress.total > 0 && (
          <div className="border-t border-slate-200 px-5 py-4">
            <div className="mb-2 flex justify-between text-xs text-slate-600">
              <span>
                Adding students… {progress.done} of {progress.total}
                {progress.failed > 0 && (
                  <span className="text-red-600"> · {progress.failed} failed</span>
                )}
              </span>
              <span>{Math.round((progress.done / progress.total) * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-navy-700 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={step === 1 || submitting}
          >
            Previous
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Uploading…" : "Create paper & upload students"}
            </Button>
          )}
        </div>
      </Card>
      <ToastContainer />
    </>
  );
};

export default AdminUpload;
