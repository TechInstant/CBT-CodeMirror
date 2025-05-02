// saveScores.ts
import { db } from "./firebase";
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

export async function saveSubmissionToFirebase(data: any) {
  try {
    // sanitize the id exactly as you did before
    const rawId = data.studentId || "";
    const studentId = rawId.replace(/\//g, "_");
    const docRef = doc(db, "Submissions", studentId);

    // 1) ensure the doc exists (and maybe store name once)
    await setDoc(
      docRef,
      { studentName: data.studentName },
      { merge: true }
    );

    // 2) push this new submission into an array called "attempts"
    await updateDoc(docRef, {
      attempts: arrayUnion(data),
    });

    return true;
  } catch (err) {
    console.error("Error saving submission:", err);
    return false;
  }
}
