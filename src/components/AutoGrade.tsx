import { grader } from "../App";

export async function gradeWithGroqAI(code: string, output: string, question: string): Promise<number> {
  console.log("Grading with Groq AI:", {
    question,
    code,
    output,
  });
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${grader}`,
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `You are a strict but fair code evaluator. Score the student's code on a scale of 0 to 100 based on how well it answers the question.

- If the code is completely missing or empty, return a score of 0.
- If the output is missing or invalid but the code shows some effort, return a low score between 1 and 2.
- If both code and output are valid, evaluate based on correctness and logic.

 Only respond with the number score on a single line. Do not explain or justify.`,
          },
          {
            role: "user",
            content: `Question: ${question}\n\nStudent's Code:\n${code}\n\nOutput:\n${output}\n\nEvaluate and return only the score (0-100):`,
          },
        ],
      }),
    });

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() ?? "";
    console.log("Raw message from Groq:", message);

    const match = message.match(/\d+/);
    const score = match ? parseInt(match[0]) : 0;

    return score;
  } catch (err) {
    console.error("Grading failed:", err);
    return 0;
  }
}
