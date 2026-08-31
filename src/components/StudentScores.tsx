import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Download, X, FileText } from "lucide-react";
import { useSubmissions, QuestionResponse } from "../Context/SubmissionsContext";
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
  EmptyState,
  Loading,
} from "./ui";

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
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [maxScore, setMaxScore] = useState(100);
  const [selected, setSelected] = useState<FlatSubmission | null>(null);

  // Build flat list whenever submissions change
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

  // Extract unique departments (for dropdown)
  const departments = React.useMemo(() => {
    const setDept = new Set<string>();
    flat.forEach(f => {
      if (f.department) {
        setDept.add(f.department);
      }
    });
    return Array.from(setDept).sort();
  }, [flat]);

  // Filter by searchTerm and selectedDept
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    setDisplayed(
      flat.filter(f => {
        const matchTerm =
          f.studentName.toLowerCase().includes(term) ||
          f.studentId.toLowerCase().includes(term);
        const matchDept =
          selectedDept === "All" || f.department === selectedDept;
        return matchTerm && matchDept;
      })
    );
  }, [flat, searchTerm, selectedDept]);

  /*
    NOTE: this divides by count * 100, but the grader scores each answer out of
    10 (totalScore is 10), so "Scaled" comes out ten times lower than intended
    and currently just mirrors "Avg". Left exactly as it was, because it decides
    the marks students receive and that is not a change to make silently — see
    the handover note. The correct denominator is the response's own totalScore.
  */
  const scoreFor = (s: FlatSubmission) => {
    const total = s.responses.reduce(
      (sum, r) => sum + (s.manualOverrides[r.QuestionsId] ?? r.score),
      0
    );
    const count = s.responses.length;
    const scaled = ((count ? total / (count * 100) : 0) * maxScore).toFixed(2);
    const avg = count ? (total / count).toFixed(2) : "0.00";
    return { total, count, scaled, avg };
  };

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
      toast.error("Failed to save overrides");
    }
  };

  const downloadCSV = () => {
    const header = ["Name", "Matric", "Department", "Attempt", "Q's", "Total", `Scaled(${maxScore})`, "Avg"];
    const rows = displayed.map(s => {
      const { total, count, scaled, avg } = scoreFor(s);
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_scores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Student Scores"
        subtitle={`${flat.length} attempt${flat.length === 1 ? "" : "s"}${
          displayed.length !== flat.length ? ` · ${displayed.length} shown` : ""
        }`}
        actions={
          <Button variant="secondary" size="sm" onClick={downloadCSV}>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <Input
            type="search"
            className="sm:max-w-xs"
            placeholder="Search by name or matric…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
            <option value="All">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Max score
            <Input
              type="number"
              className="w-24"
              value={maxScore}
              onChange={e => setMaxScore(+e.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <Loading label="Loading submissions" />
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title={flat.length === 0 ? "No submissions yet" : "No matches"}
            hint={
              flat.length === 0
                ? "Scores appear here once students have submitted."
                : "Try a different name, matric number or department."
            }
          />
        ) : (
          <TableWrap maxHeight="calc(100vh - 22rem)">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Matric</Th>
                <Th>Department</Th>
                <Th>Attempt</Th>
                <Th>Q's</Th>
                <Th>Total</Th>
                <Th>Scaled</Th>
                <Th>Avg</Th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(s => {
                const { total, count, scaled, avg } = scoreFor(s);
                return (
                  <tr
                    key={s.docId}
                    className={`cursor-pointer transition-colors ${
                      selected?.docId === s.docId ? "bg-navy-50/60" : "hover:bg-slate-50"
                    }`}
                    onClick={() => setSelected(s)}
                  >
                    <Td className="font-medium text-navy-900">{s.studentName}</Td>
                    <Td className="font-mono text-xs">{s.studentId}</Td>
                    <Td>
                      <Badge tone="navy">{s.department || "—"}</Badge>
                    </Td>
                    <Td>{s.attemptIndex + 1}</Td>
                    <Td>{count}</Td>
                    <Td className="font-medium">{total}</Td>
                    <Td>{scaled}</Td>
                    <Td>{avg}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {selected && (
        <Card className="mt-6">
          <CardHeader
            title={`${selected.studentName} · ${selected.studentId} · Attempt ${
              selected.attemptIndex + 1
            }`}
            actions={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveOverrides(selected)}>
                  Save overrides
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            }
          />
          <TableWrap>
            <thead>
              <tr>
                <Th className="w-[24%]">Question</Th>
                <Th className="w-[26%]">Code</Th>
                <Th className="w-[22%]">Output</Th>
                <Th>AI grade</Th>
                <Th>Override</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {selected.responses.map(r => {
                const ai = r.score;
                const over = selected.manualOverrides[r.QuestionsId] ?? ai;
                return (
                  <tr key={r.QuestionsId} className="align-top">
                    <Td className="whitespace-pre-wrap text-slate-700">{r.questionText}</Td>
                    <Td>
                      <pre className="max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                        {r.code || "— no answer —"}
                      </pre>
                    </Td>
                    <Td>
                      <pre className="max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700">
                        {r.output || "—"}
                      </pre>
                    </Td>
                    <Td>
                      <Badge tone={ai > 0 ? "green" : "slate"}>{ai}</Badge>
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={over}
                        className="w-20"
                        onChange={e =>
                          setSelected(prev =>
                            prev && {
                              ...prev,
                              manualOverrides: {
                                ...prev.manualOverrides,
                                [r.QuestionsId]: +e.target.value,
                              },
                            }
                          )
                        }
                      />
                    </Td>
                    <Td>
                      <Button
                        variant="gold"
                        size="sm"
                        title="Copy the AI grade into the override"
                        onClick={() =>
                          setSelected(prev =>
                            prev && {
                              ...prev,
                              manualOverrides: {
                                ...prev.manualOverrides,
                                [r.QuestionsId]: ai,
                              },
                            }
                          )
                        }
                      >
                        Transfer
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </>
  );
};

export default TeacherSubmissions;
