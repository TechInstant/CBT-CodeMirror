import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

interface QuestionResponse {
  questionId: string;
  questionText: string;
  code: string;
  output: string;
  score: number;
}

interface SubmissionDoc {
  id: string;
  studentId: string;
  studentName: string;
  questions: QuestionResponse[];
  manualOverrides: { [qid: string]: number };
}

const TeacherSubmissions: React.FC = () => {
  const [subs, setSubs] = useState<SubmissionDoc[]>([]);
  const [selected, setSelected] = useState<SubmissionDoc | null>(null);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "Submissions"));
      const data: SubmissionDoc[] = snap.docs.map((d) => {
        const dd = d.data() as any;
        return {
          id: d.id,
          studentId: dd.studentId,
          studentName: dd.studentName,
          questions: Array.isArray(dd.responses)
            ? dd.responses.map((r: any) => ({
                questionId: r.questionId,
                questionText: r.questionText,
                code: r.code,
                output: r.output,
                score: r.score,
              }))
            : [],
          manualOverrides: dd.manualOverrides || {},
        };
      });
      setSubs(data);
    })();
  }, []);

  const filteredSubs = searchTerm
    ? subs.filter(
        (s) =>
          s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : subs;

  const saveOverrides = async (sub: SubmissionDoc) => {
    const ref = doc(db, "Submissions", sub.id);
    await updateDoc(ref, { manualOverrides: sub.manualOverrides });
    alert("Overrides saved!");
    setSubs((prev) => prev.map((s) => (s.id === sub.id ? sub : s)));
  };

  const downloadCSV = () => {
    const header = [
      "Name",
      "Matric",
      "Questions Attempted",
      "RawScore",
      `Scaled(${maxScore})`,
      "Average"
    ];
    const rows = filteredSubs.map((s) => {
      const questionCount = s.questions.length;
      const totalScore = s.questions.reduce(
        (sum, q) => sum + (s.manualOverrides[q.questionId] ?? q.score),
        0
      );
      const scaled = (
        (totalScore / (questionCount * 100)) *
        maxScore
      ).toFixed(2);
      const avg = (totalScore / questionCount).toFixed(2);
      return [
        s.studentName,
        s.studentId,
        questionCount.toString(),
        totalScore.toString(),
        scaled,
        avg,
      ];
    });
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_scores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">All Student Scores</h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or matric ID"
          className="border px-3 py-2 w-full sm:w-80"
        />
        <input
          type="number"
          value={maxScore}
          onChange={(e) => setMaxScore(+e.target.value)}
          placeholder="Max Score (e.g., 100)"
          className="border px-3 py-2 w-full sm:w-40"
        />
        <button
          onClick={downloadCSV}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Download CSV
        </button>
      </div>

      <table className="min-w-full bg-white border mt-4">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border p-2">Name</th>
            <th className="border p-2">Matric</th>
            <th className="border p-2">Attempted</th>
            <th className="border p-2">Total Score</th>
            <th className="border p-2">Scaled</th>
            <th className="border p-2">Average</th>
          </tr>
        </thead>
        <tbody>
          {filteredSubs.map((s) => {
            const totalScore = s.questions.reduce(
              (sum, q) => sum + (s.manualOverrides[q.questionId] ?? q.score),
              0
            );
            const questionCount = s.questions.length;
            const scaled = (
              (totalScore / (questionCount * 100)) *
              maxScore
            ).toFixed(2);
            const avg = (totalScore / questionCount).toFixed(2);
            return (
              <tr
                key={s.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(s)}
              >
                <td className="border p-2 text-blue-600">{s.studentName}</td>
                <td className="border p-2 text-blue-600">{s.studentId}</td>
                <td className="border p-2">{questionCount}</td>
                <td className="border p-2">{totalScore}</td>
                <td className="border p-2">{scaled}</td>
                <td className="border p-2">{avg}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected && (
        <div className="mt-8 p-4 border rounded bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">
              {selected.studentName} — {selected.studentId}
            </h3>
            <button
              onClick={() => setSelected(null)}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>

          <table className="min-w-full mt-4 bg-white border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border p-2">Question</th>
                <th className="border p-2">Code</th>
                <th className="border p-2">Output</th>
                <th className="border p-2">AI Grade</th>
                <th className="border p-2">Override</th>
                <th className="border p-2">Transfer</th>
              </tr>
            </thead>
            <tbody>
              {selected.questions.map((q) => {
                const ai = q.score;
                const over = selected.manualOverrides[q.questionId] ?? ai;
                return (
                  <tr key={q.questionId} className="border-t">
                    <td className="border p-2">{q.questionText}</td>
                    <td className="border p-2 whitespace-pre-wrap font-mono">{q.code}</td>
                    <td className="border p-2 whitespace-pre-wrap font-mono">{q.output}</td>
                    <td className="border p-2">{ai}</td>
                    <td className="border p-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={over}
                        onChange={(e) => {
                          const val = +e.target.value;
                          setSelected((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  manualOverrides: {
                                    ...prev.manualOverrides,
                                    [q.questionId]: val,
                                  },
                                }
                              : prev
                          );
                        }}
                        className="w-20 border px-2 py-1"
                      />
                    </td>
                    <td className="border p-2">
                      <button
                        onClick={() =>
                          setSelected((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  manualOverrides: {
                                    ...prev.manualOverrides,
                                    [q.questionId]: ai,
                                  },
                                }
                              : prev
                          )
                        }
                        className="bg-yellow-500 text-white px-2 py-1 rounded"
                      >
                        Transfer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-6">
            <button
              onClick={() => saveOverrides(selected)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Save Overrides
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSubmissions;
