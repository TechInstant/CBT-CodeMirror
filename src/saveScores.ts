// src/saveScores.ts
import { db } from "./firebase";
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

export async function saveSubmissionToFirebase(attempt: any) {
  const rawId = attempt.studentId as string;
  if (!rawId) throw new Error("Missing studentId");
  const studentId = rawId.replace(/\//g, "_");
  const docRef = doc(db, "Submissions", studentId);

  try {
    // if doc doesn't exist yet, create an empty one
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, { studentId, studentName: attempt.studentName, attempts: [] });
    }

    // push this new attempt onto the 'attempts' array
    await updateDoc(docRef, {
      attempts: arrayUnion(attempt),
    });

    return true;
  } catch (err) {
    console.error("Error saving submission:", err);
    return false;
  }
}
