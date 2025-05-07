import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSubmissions, QuestionResponse } from "../Context/SubmissionsContext";
import { baseUrl, GetToken } from "../App";
import { toast } from "react-toastify";

interface FlatSubmission {
  docId: string;
  studentId: string;
  studentName: string;
  department: string;
  attemptIndex: number;
  timestamp: string;
  responses: QuestionResponse[];
  manualOverrides: Record<string, number>;
}

const TeacherSubmissions: React.FC = () => {
  const { submissions, loading, refresh } = useSubmissions();
  const [flat, setFlat] = useState<FlatSubmission[]>([]);
  const [displayed, setDisplayed] = useState<FlatSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [selected, setSelected] = useState<FlatSubmission | null>(null);

  useEffect(() => {
    const all: FlatSubmission[] = [];
    submissions.forEach(student =>
      student.attempts.forEach((att, idx) => {
        all.push({
          docId: `${student.id}_${idx}`,
          studentId: student.studentId,
          studentName: student.studentName,
          department: student.department,
          attemptIndex: idx,
          timestamp: att.timestamp,
          responses: att.responses,
          manualOverrides: att.manualOverrides || {},
        });
      })
    );
    setFlat(all);
  }, [submissions]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setDisplayed(
      flat.filter(f => {
        return (
          f.studentName.toLowerCase().includes(term) ||
          f.studentId.toLowerCase().includes(term) ||
          f.department.toLowerCase().includes(term)
        );
      })
    );
  }, [flat, searchTerm]);
  

  const saveOverrides = async (sub: FlatSubmission) => {
    try {
      const token = await GetToken();
      const studentDocId = sub.docId.replace(/_\d+$/, "");
      const endpoint = `${baseUrl}/submissions/${studentDocId}/override`;

      await Promise.all(
        Object.entries(sub.manualOverrides).map(([questionId, newScore]) =>
          axios.patch(
            endpoint,
            { attemptIndex: sub.attemptIndex, questionId, newScore },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      await refresh();    
      setSelected(null);
      toast.success("Overrides saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save overrides");
    }
  };

  const downloadCSV = () => {
    const header = ["Name", "Matric", "Department", "Attempt", "Q’s", "Total", `Scaled(${maxScore})`, "Avg"];
    const rows = displayed.map(s => {
      const total = s.responses.reduce(
        (sum, r) => sum + (s.manualOverrides[r.QuestionsId] ?? r.score),
        0
      );
      const count  = s.responses.length;
      const scaled = ((total / (count * 100)) * maxScore).toFixed(2);
      const avg    = count ? (total / count).toFixed(2) : "0.00";
      return [
        s.studentName,
        s.studentId,
        s.department,
        String(s.attemptIndex + 1),
        String(count),
        String(total),
        scaled,
        avg
      ];
    });
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "student_scores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Loading submissions…</div>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">All Student Scores</h2>

      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
        <input
          type="text"
          className="border px-3 py-2 w-full sm:w-80"
          placeholder="Search by name, matric, or department"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <input
          type="number"
          className="border px-3 py-2 w-full sm:w-40"
          placeholder="Max Score"
          value={maxScore}
          onChange={e => setMaxScore(+e.target.value)}
        />
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={downloadCSV}
        >
          Download CSV
        </button>
      </div>

      <table className="min-w-full bg-white border mt-4">
        <thead>
          <tr className="bg-gray-100">
            {["Name","Matric", "Department", "Attempt","Q’s","Total","Scaled","Avg"].map(h => (
              <th key={h} className="border p-2 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map(s => {
            const total = s.responses.reduce(
              (sum, r) => sum + (s.manualOverrides[r.QuestionsId] ?? r.score),
              0
            );
            const count  = s.responses.length;
            const scaled = ((total/(count*100))*maxScore).toFixed(2);
            const avg    = count ? (total/count).toFixed(2) : "0.00";
            return (
              <tr
                key={s.docId}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(s)}
              >
                <td className="border p-2 text-blue-600">{s.studentName}</td>
                <td className="border p-2 text-blue-600">{s.studentId}</td>
                <td className="border p-2">{s.department}</td>
                <td className="border p-2">{s.attemptIndex+1}</td>
                <td className="border p-2">{count}</td>
                <td className="border p-2">{total}</td>
                <td className="border p-2">{scaled}</td>
                <td className="border p-2">{avg}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected && (
        <div className="mt-8 p-4 border rounded bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {selected.studentName} ({selected.studentId}) — Practicals {selected.attemptIndex+1}
            </h3>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                {["Question","Code","Output","AI Grade","Override","Transfer"].map(h => (
                  <th key={h} className="border p-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.responses.map(r => {
                const ai   = r.score;
                const over = selected.manualOverrides[r.QuestionsId] ?? ai;
                return (
                  <tr key={r.QuestionsId} className="border-t align-top">
                    <td className="border p-2 max-w-xs whitespace-pre-wrap">{r.questionText}</td>
                    <td className="border p-2 font-mono text-sm max-w-xs overflow-auto bg-gray-100">{r.code}</td>
                    <td className="border p-2 font-mono text-sm max-w-xs overflow-auto bg-gray-100">{r.output}</td>
                    <td className="border p-2">{ai}</td>
                    <td className="border p-2">
                      <input
                        type="number" min={0} max={100}
                        value={over}
                        onChange={e => setSelected(prev => prev && ({
                          ...prev,
                          manualOverrides: {
                            ...prev.manualOverrides,
                            [r.QuestionsId]: +e.target.value
                          }
                        }))}
                        className="w-20 border px-1 py-0.5"
                      />
                    </td>
                    <td className="border p-2">
                      <button
                        className="bg-yellow-500 text-white px-2 py-1 rounded"
                        onClick={() => setSelected(prev => prev && ({
                          ...prev,
                          manualOverrides: {
                            ...prev.manualOverrides,
                            [r.QuestionsId]: ai
                          }
                        }))}
                      >
                        Transfer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() => saveOverrides(selected!)}
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
