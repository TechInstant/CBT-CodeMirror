// src/components/TeacherSubmissions.tsx
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

interface FlatSubmission {
  docId: string;            // e.g. "PHY_2022_004_0"
  studentId: string;        // e.g. "PHY/2022/004" → sanitized
  studentName: string;
  attemptIndex: number;     // 0, 1, 2…
  timestamp: string;        // ISO string from the attempt
  responses: QuestionResponse[];
  manualOverrides: Record<string, number>;
}

const TeacherSubmissions: React.FC = () => {
  const [subs, setSubs] = useState<FlatSubmission[]>([]);
  const [selected, setSelected] = useState<FlatSubmission | null>(null);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "Submissions"));
      const all: FlatSubmission[] = [];
      for (let docSnap of snap.docs) {
        const dd = docSnap.data() as any;
        const studentId = dd.studentId as string;
        const name = dd.studentName as string;
        const attempts = Array.isArray(dd.attempts) ? dd.attempts : [];

        attempts.forEach((att: any, idx: number) => {
          if (!att.responses) return; // skip malformed
          all.push({
            docId: `${docSnap.id}_${idx}`,
            studentId,
            studentName: name,
            attemptIndex: idx,
            timestamp: att.timestamp,
            responses: (att.responses as any[]).map(r => ({
              questionId: r.QuestionsId,
              questionText: r.questionText,
              code: r.code,
              output: r.output,
              score: r.score,
            })),
            manualOverrides: att.manualOverrides || {},
          });
        });
      }
      setSubs(all);
    })();
  }, []);

  const filtered = searchTerm
    ? subs.filter(s =>
        s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : subs;

  const saveOverrides = async (sub: FlatSubmission) => {
    // the underlying student doc is the prefix before the last "_"
    const [studentDocId] = sub.docId.split(/_\d+$/);
    const ref = doc(db, "Submissions", studentDocId);
    // update only that one attempt's manualOverrides
    const attemptField = `attempts.${sub.attemptIndex}.manualOverrides`;
    await updateDoc(ref, {
      [attemptField]: sub.manualOverrides
    });
    alert("Overrides saved!");
    setSubs(prev => prev.map(s => s.docId === sub.docId ? sub : s));
  };

  const downloadCSV = () => {
    const header = ["Name","Matric","Attempt","Questions","RawScore",`Scaled(${maxScore})`,"Average"];
    const rows = filtered.map(s => {
      const count = s.responses.length;
      const total = s.responses.reduce((sum,r) => sum + (s.manualOverrides[r.questionId] ?? r.score), 0);
      const scaled = ((total/(count*100))*maxScore).toFixed(2);
      const avg = (total/count).toFixed(2);
      return [
        s.studentName, s.studentId, String(s.attemptIndex+1),
        String(count), String(total), scaled, avg
      ];
    });
    const csv = [header, ...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "student_scores.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">All Student Scores</h2>
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
        <input
          type="text" value={searchTerm}
          onChange={e=>setSearchTerm(e.target.value)}
          placeholder="Search by name or matric"
          className="border px-3 py-2 w-full sm:w-80"
        />
        <input
          type="number" value={maxScore}
          onChange={e=>setMaxScore(+e.target.value)}
          placeholder="Max Score"
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
            {["Name","Matric","Attempt","Q’s","Total","Scaled","Avg"].map(h=>
              <th key={h} className="border p-2">{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {filtered.map(s => {
            const total = s.responses.reduce((sum,r)=>sum+(s.manualOverrides[r.questionId] ?? r.score),0);
            const qCount = s.responses.length;
            const scaled = ((total/(qCount*100))*maxScore).toFixed(2);
            const avg = (total/qCount).toFixed(2);
            return (
              <tr
                key={s.docId}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={()=>setSelected(s)}
              >
                <td className="border p-2 text-blue-600">{s.studentName}</td>
                <td className="border p-2 text-blue-600">{s.studentId}</td>
                <td className="border p-2">{s.attemptIndex+1}</td>
                <td className="border p-2">{qCount}</td>
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
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">
              {selected.studentName} ({selected.studentId}) — Attempt {selected.attemptIndex+1}
            </h3>
            <button
              onClick={()=>setSelected(null)}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>

          <table className="min-w-full mt-4 bg-white border">
            <thead>
              <tr className="bg-gray-100 text-left">
                {["Question","Code","Output","AI Grade","Override","Transfer"].map(h =>
                  <th key={h} className="border p-2">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {selected.responses.map(q => {
                const ai    = q.score;
                const over  = selected.manualOverrides[q.questionId] ?? ai;
                return (
                  <tr key={q.questionId} className="border-t align-top">
                    <td className="border p-2">
                      <div className="max-h-32 overflow-auto w-64 whitespace-pre-wrap">
                        {q.questionText}
                      </div>
                    </td>
                    <td className="border p-2">
                      <div className="max-h-32 overflow-auto w-64 bg-gray-100 p-2 rounded font-mono text-sm">
                        {q.code}
                      </div>
                    </td>
                    <td className="border p-2">
                      <div className="max-h-32 overflow-auto w-64 bg-gray-100 p-2 rounded font-mono text-sm">
                        {q.output}
                      </div>
                    </td>
                    <td className="border p-2">{ai}</td>
                    <td className="border p-2">
                      <input
                        type="number" min={0} max={100}
                        value={over}
                        onChange={e=>{
                          const val = +e.target.value;
                          setSelected(prev=>
                            prev
                              ? { ...prev, manualOverrides: { ...prev.manualOverrides, [q.questionId]: val } }
                              : prev
                          );
                        }}
                        className="w-20 border px-2 py-1"
                      />
                    </td>
                    <td className="border p-2">
                      <button
                        onClick={()=>
                          setSelected(prev=>
                            prev
                              ? { ...prev, manualOverrides: { ...prev.manualOverrides, [q.questionId]: ai } }
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
              onClick={()=>saveOverrides(selected)}
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
