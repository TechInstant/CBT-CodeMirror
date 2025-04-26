
import { db } from "./firebase"; 
import { collection, addDoc } from "firebase/firestore";

export async function saveSubmissionToFirebase(data: any) {
  try {
    await addDoc(collection(db, "Submissions"), data);
    return true;
  } catch {
    console.log("Error saving submission:");
    return false;
  }
}
