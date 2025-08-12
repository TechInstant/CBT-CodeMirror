import { grader } from "../App";

export async function gradeWithGroqAI(code: string, output: string, question: string): Promise<number> {
  // console.log("Grading with Groq AI:", {
  //   question,
  //   code,
  //   output,
  // });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${grader}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a strict but fair code evaluator. Score the student's code on a scale of 0 to 10 based on
            wa how well it answers the question.

- If the code is completely missing or empty, return a score of 0.
- If not, evaluate the code written against the question it aims to solve and return a numerical value between 1 and 10.
Do not consider better efficient ways to solve the problem, only consider 
the code in comparison to the expected result, and the nearness to the correct solution. 
Keep in mind, that users may make little errors like omitting colons, semicolons, or parentheses in some cases. 
This should not affect your evaluation of the code. 
The understanding of the question, by the way the solution is provided is more important 
than a direct comparison with expected solution.  
The whole point of the grading is to know how much the student understand the question and how near they are to the solution.

Only respond with the number score on a single line. Do not explain or justify.`,
          },
          {
            role: "user",
            content: `Question: ${question}\n\nStudent's Code:\n${code}\n\nOutput:\n${output}\n\nEvaluate and return only the score (0-10):`,
          },
        ],
      }),
    });

    // const clonedResponse = response.clone(); // safe debug
    // const raw = await clonedResponse.text();
    // console.log("Groq API raw response:", raw);

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() ?? "";
    // console.log("Raw message from Groq:", message);

    const match = message.match(/\d+/);
    const score = match ? parseInt(match[0]) : 0;

    return score;
  } catch (err) {
    // console.error("Grading failed:", err);
    return 0;
  }
}