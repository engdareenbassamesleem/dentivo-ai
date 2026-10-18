import { auth } from "./firebase";

export type ChatHistory = {
  role: "user" | "model";
  parts: { text: string }[];
}[];

export async function chatWithAI(message: string, history: ChatHistory): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before using the assistant.");

  const token = await user.getIdToken();
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Too many messages. Please try again later."
        : "The assistant is temporarily unavailable.",
    );
  }

  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("answer" in data) ||
    typeof data.answer !== "string"
  ) {
    throw new Error("Unexpected assistant response.");
  }
  return data.answer;
}
