import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { EyeOff, Eye, Clock, Check } from "lucide-react";
import { baseUrl, GetToken } from "../App";
import { Card, CardHeader, Button, Input, Badge, Loading, TableWrap, Th, Td } from "./ui";

/*
  Marking screen for one attempt.

  When the attempt is allocated to blind review the server does not send the AI
  score, rubric or raw model response at all — this component could not display
  them if it wanted to. That is deliberate: an interface that merely hides a
  value it holds is one bug away from leaking it, and the whole point of R1.1 is
  that the instructor's mark is formed without seeing the model's.

  Opening the panel starts the clock the efficiency figure is measured from, so
  it is opened when marking begins, not while browsing.
*/

interface ReviewResponse {
  QuestionsId: string;
  questionText: string;
  code: string;
  output: string;
  totalScore: number;
  score?: number; // absent when blind
  instructorScore?: number;
  overrideReason?: string;
  grading?: { model: string; promptVersion: string; rubricScores?: Record<string, number> };
}

interface OpenedReview {
  blind: boolean;
  review: { instructorId: string; openedAt: string; submittedAt?: string };
  responses: ReviewResponse[];
}

const elapsed = (fromIso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(fromIso).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const ReviewPanel: React.FC<{
  studentId: string;
  paperId: string;
  studentName: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ studentId, paperId, studentName, onClose, onSaved }) => {
  const [data, setData] = useState<OpenedReview | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [tick, setTick] = useState(0);
  const [done, setDone] = useState<{ seconds: number | null } | null>(null);

  const instructorId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("userData") || "{}");
      return u.Email || u.UserId || "unknown";
    } catch {
      return "unknown";
    }
  })();

  // Opening the attempt is what stamps openedAt server-side.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const token = await GetToken();
        const res = await axios.post<OpenedReview>(
          `${baseUrl}/submissions/${studentId}/attempts/${paperId}/review`,
          { instructorId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!live) return;
        setData(res.data);
        const initial: Record<string, string> = {};
        res.data.responses.forEach((r) => {
          initial[r.QuestionsId] =
            typeof r.instructorScore === "number" ? String(r.instructorScore) : "";
        });
        setScores(initial);
      } catch (err: any) {
        toast.error(
          "Could not open for review: " +
            (err?.response?.data?.message || err?.message || "unknown error")
        );
        onClose();
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, paperId]);

  // Drives the visible clock, so the instructor knows the time is recorded.
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const save = async () => {
    if (!data) return;
    const payload = data.responses
      .map((r) => ({
        questionId: r.QuestionsId,
        instructorScore: Number(scores[r.QuestionsId]),
        overrideReason: reasons[r.QuestionsId] || undefined,
      }))
      .filter((s) => Number.isFinite(s.instructorScore));

    if (payload.length === 0) {
      toast.error("Enter at least one mark before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await GetToken();
      const res = await axios.put(
        `${baseUrl}/submissions/${studentId}/attempts/${paperId}/review`,
        { instructorId, scores: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDone({ seconds: res.data?.reviewSeconds ?? null });
      toast.success("Review recorded");
      onSaved();
    } catch (err: any) {
      toast.error(
        "Could not record review: " +
          (err?.response?.data?.message || err?.message || "unknown error")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    return (
      <Card className="mt-6">
        <Loading label="Opening for review" />
      </Card>
    );
  }

  return (
    <Card className={`mt-6 ${data.blind ? "border-navy-300" : ""}`}>
      <CardHeader
        title={`Review · ${studentName}`}
        actions={
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600"
              title="Time since this attempt was opened — recorded as the review duration"
            >
              <Clock className="h-3.5 w-3.5" />
              {elapsed(data.review.openedAt)}
              <span className="sr-only">{tick}</span>
            </span>
            <Button size="sm" onClick={save} disabled={submitting || !!done}>
              {submitting ? "Saving…" : done ? "Recorded" : "Submit review"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      />

      <div
        className={`flex items-start gap-3 border-b px-5 py-3 text-sm ${
          data.blind
            ? "border-navy-200 bg-navy-50 text-navy-800"
            : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
      >
        {data.blind ? <EyeOff className="mt-0.5 h-4 w-4 shrink-0" /> : <Eye className="mt-0.5 h-4 w-4 shrink-0" />}
        <div>
          <p className="font-medium">
            {data.blind ? "Blind review" : "Standard review — AI score visible"}
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            {data.blind
              ? "The AI score was not sent to this browser. Mark from the code and output alone; it is revealed once you submit."
              : "This attempt was allocated to the sighted group. The AI score is shown below."}
          </p>
        </div>
      </div>

      {done && (
        <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
          <Check className="h-4 w-4" />
          Recorded
          {done.seconds !== null && ` · review took ${Math.floor(done.seconds / 60)}m ${done.seconds % 60}s`}
          {data.blind && " · reopen to compare against the AI score"}
        </div>
      )}

      {/* Six columns of code and output need more room than the default before
          shrinking them stops being readable. */}
      <TableWrap minWidth="60rem">
        <thead>
          <tr>
            <Th className="w-[26%]">Question</Th>
            <Th className="w-[28%]">Code</Th>
            <Th className="w-[18%]">Output</Th>
            {!data.blind && <Th>AI</Th>}
            <Th>Your mark</Th>
            <Th className="w-[18%]">Reason (optional)</Th>
          </tr>
        </thead>
        <tbody>
          {data.responses.map((r) => (
            <tr key={r.QuestionsId} className="align-top">
              <Td className="whitespace-pre-wrap text-slate-700">{r.questionText}</Td>
              <Td>
                <pre className="max-h-52 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                  {r.code || "— no answer —"}
                </pre>
              </Td>
              <Td>
                <pre className="max-h-52 overflow-auto rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700">
                  {r.output || "—"}
                </pre>
              </Td>
              {!data.blind && (
                <Td>
                  <Badge tone={(r.score ?? 0) > 0 ? "green" : "slate"}>
                    {r.score ?? "—"}/{r.totalScore}
                  </Badge>
                  {r.grading?.rubricScores && (
                    <p className="mt-1 text-[11px] leading-tight text-slate-400">
                      c{r.grading.rubricScores.correctness} · s
                      {r.grading.rubricScores.structure} · e
                      {r.grading.rubricScores.efficiency}
                    </p>
                  )}
                </Td>
              )}
              <Td>
                <Input
                  type="number"
                  min={0}
                  max={r.totalScore}
                  className="w-20"
                  placeholder={`/${r.totalScore}`}
                  value={scores[r.QuestionsId] ?? ""}
                  disabled={!!done}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [r.QuestionsId]: e.target.value }))
                  }
                />
              </Td>
              <Td>
                <Input
                  placeholder="why you differed"
                  value={reasons[r.QuestionsId] ?? ""}
                  disabled={!!done}
                  onChange={(e) =>
                    setReasons((s) => ({ ...s, [r.QuestionsId]: e.target.value }))
                  }
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </Card>
  );
};

export default ReviewPanel;
