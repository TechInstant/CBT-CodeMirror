import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Download, X, FileText, RotateCcw, ClipboardCheck } from "lucide-react";
import ReviewPanel from "./ReviewPanel";
import {
  useSubmissions,
  QuestionResponse,
  GradingStatus,
} from "../Context/SubmissionsContext";
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
  Modal,
} from "./ui";

// Whoever is signed in. The review endpoints key marks by this, so the second
// marker's worklist is "in the subset, marked by someone, not yet by me".
const currentInstructorId = () => {
  try {
    const u = JSON.parse(localStorage.getItem("userData") || "{}");
    return u.Email || u.UserId || "unknown";
  } catch {
    return "unknown";
  }
};

interface FlatSubmission {
  docId: string;
  studentId: string;
  studentName: string;
  department: string;
  attemptIndex: number;
  timestamp: string;
  responses: QuestionResponse[];
  manualOverrides: Record<string, number>;
  gradingStatus?: GradingStatus;
  // Selected for the inter-rater subset, and who has marked it so far. Without
  // these on screen a second marker has no way to find the attempts that need
  // them, and marks whatever they happen to open — which is how six passes
  // produced no overlapping pair and nothing to compute kappa from.
  doubleMarked?: boolean;
  markers?: string[];
  markersDone?: number;
  paperId?: string;
  blindReview?: boolean;
  review?: { instructorId: string; openedAt: string; submittedAt?: string };
}

const TeacherSubmissions: React.FC = () => {
  const { submissions, loading, refresh } = useSubmissions();
  const [flat, setFlat] = useState<FlatSubmission[]>([]);
  const [displayed, setDisplayed] = useState<FlatSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [maxScore, setMaxScore] = useState(100);
  const [selected, setSelected] = useState<FlatSubmission | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [confirmResit, setConfirmResit] = useState<FlatSubmission | null>(null);
  const [reviewing, setReviewing] = useState<FlatSubmission | null>(null);
  const [queue, setQueue] = useState<"all" | "unmarked" | "needs-second">("all");

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
          gradingStatus: att.gradingStatus,
          paperId: att.paperId,
          blindReview: att.blindReview,
          review: att.review,
          doubleMarked: att.doubleMarked,
          markers: Object.keys(att.reviews ?? {}),
          markersDone: Object.values(att.reviews ?? {}).filter(
            (r: any) => r?.submittedAt
          ).length,
        });
      })
    );
    setFlat(all);
  }, [submissions]);

  // How many attempts are waiting on the person signed in, for the queue label.
  const secondMarkerQueue = React.useMemo(() => {
    const me = currentInstructorId();
    return flat.filter(
      f =>
        f.doubleMarked === true &&
        (f.markersDone ?? 0) >= 1 &&
        !(f.markers ?? []).includes(me)
    ).length;
  }, [flat]);

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

  // Filter by searchTerm, department and marking state
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    const me = currentInstructorId();
    setDisplayed(
      flat.filter(f => {
        const matchTerm =
          f.studentName.toLowerCase().includes(term) ||
          f.studentId.toLowerCase().includes(term);
        const matchDept =
          selectedDept === "All" || f.department === selectedDept;

        let matchQueue = true;
        if (queue === "unmarked") {
          matchQueue = (f.markersDone ?? 0) === 0;
        } else if (queue === "needs-second") {
          // In the inter-rater subset, already marked by someone, and not yet by
          // whoever is signed in. This is the second marker's worklist.
          matchQueue =
            f.doubleMarked === true &&
            (f.markersDone ?? 0) >= 1 &&
            !(f.markers ?? []).includes(me);
        }
        return matchTerm && matchDept && matchQueue;
      })
    );
  }, [flat, searchTerm, selectedDept, queue]);

  /*
    The denominator is the sum of each answer's own totalScore (10 per question,
    as the grader marks out of 10), not a hardcoded 100 per question. The old
    formula divided by count * 100, which made "Scaled" ten times too low — it
    silently produced a mark out of 10 while claiming to be out of maxScore, and
    happened to equal "Avg". Reading totalScore also means the figure stays right
    if the per-question mark ever changes.
  */
  const scoreFor = (s: FlatSubmission) => {
    const total = s.responses.reduce(
      (sum, r) => sum + (s.manualOverrides[r.QuestionsId] ?? r.score),
      0
    );
    const count = s.responses.length;
    const obtainable = s.responses.reduce(
      (sum, r) => sum + (typeof r.totalScore === "number" ? r.totalScore : 10),
      0
    );
    const scaled = ((obtainable ? total / obtainable : 0) * maxScore).toFixed(2);
    const avg = count ? (total / count).toFixed(2) : "0.00";
    return { total, count, obtainable, scaled, avg };
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

  /*
    Only one attempt per paper is accepted, so a student who submitted by mistake
    or was cut off has no way back in without this.
  */
  const allowResit = async (sub: FlatSubmission) => {
    if (!sub.paperId) {
      toast.error("This attempt predates paper tracking and cannot be reset individually.");
      return;
    }
    setResetting(sub.docId);
    try {
      const token = await GetToken();
      const studentDocId = sub.docId.replace(/_\d+$/, "");
      await axios.delete(
        `${baseUrl}/submissions/${studentDocId}/attempts/${sub.paperId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refresh();
      setSelected(null);
      toast.success(`${sub.studentName} can sit this paper again`);
    } catch (err: any) {
      toast.error(
        "Could not reset attempt: " +
          (err?.response?.data?.message || err?.message || "unknown error")
      );
    } finally {
      setResetting(null);
      setConfirmResit(null);
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
      {confirmResit && (
        <Modal
          title="Allow this student to sit again?"
          onClose={() => setConfirmResit(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmResit(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => allowResit(confirmResit)}>
                Delete attempt
              </Button>
            </>
          }
        >
          This permanently deletes <strong>{confirmResit.studentName}</strong>'s
          attempt at this paper, including their code and marks, so they can start
          it again. Their attempts at other papers are untouched.
        </Modal>
      )}

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
          {/* Marking queues. "Needs 2nd marker" is what makes the inter-rater
              subset findable — without it a second marker opens whatever is in
              front of them and the two never overlap. */}
          <Select
            value={queue}
            onChange={e => setQueue(e.target.value as typeof queue)}
            title="Filter by marking state"
          >
            <option value="all">All attempts</option>
            <option value="unmarked">Not yet marked</option>
            <option value="needs-second">Needs 2nd marker ({secondMarkerQueue})</option>
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
                <Th>Review</Th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(s => {
                const { total, count, obtainable, scaled, avg } = scoreFor(s);
                // Grading is asynchronous, so an ungraded attempt legitimately
                // has zeroes. Showing those as marks would misreport the student.
                const ungraded = s.gradingStatus === "pending";
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
                    {ungraded ? (
                      <Td colSpan={3}>
                        <Badge tone="gold">Awaiting grading</Badge>
                      </Td>
                    ) : (
                      <>
                        <Td className="font-medium">
                          {total}
                          <span className="text-slate-400"> / {obtainable}</span>
                        </Td>
                        <Td>{scaled}</Td>
                        <Td>{avg}</Td>
                      </>
                    )}
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(s.markersDone ?? 0) > 0 ? (
                          <Badge tone="green">
                            Marked ×{s.markersDone}
                            {s.blindReview ? " (blind)" : ""}
                          </Badge>
                        ) : s.blindReview ? (
                          <Badge tone="navy">Blind</Badge>
                        ) : (
                          <Badge tone="slate">Sighted</Badge>
                        )}
                        {/* Only worth flagging while a second mark is still
                            outstanding; once two are in it is done. */}
                        {s.doubleMarked && (s.markersDone ?? 0) < 2 && (
                          <Badge tone="gold">2nd marker</Badge>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {reviewing && reviewing.paperId && (
        <ReviewPanel
          studentId={reviewing.docId.replace(/_\d+$/, "")}
          paperId={reviewing.paperId}
          studentName={`${reviewing.studentName} · ${reviewing.studentId}`}
          onClose={() => setReviewing(null)}
          onSaved={refresh}
        />
      )}

      {selected && (
        <Card className="mt-6">
          <CardHeader
            title={`${selected.studentName} · ${selected.studentId} · Attempt ${
              selected.attemptIndex + 1
            }`}
            actions={
              <div className="flex gap-2">
                {/* Opening review starts the measured clock, so it is a
                    deliberate action rather than a side effect of browsing. */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setReviewing(selected); setSelected(null); }}
                  disabled={!selected.paperId}
                  title={selected.paperId ? "Mark this attempt" : "Attempt predates paper tracking"}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Review
                </Button>
                <Button size="sm" onClick={() => saveOverrides(selected)}>
                  Save overrides
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={resetting === selected.docId}
                  onClick={() => setConfirmResit(selected)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {resetting === selected.docId ? "Resetting…" : "Allow re-sit"}
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
