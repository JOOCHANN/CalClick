import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }
  const baseURL = process.env.OPENAI_BASE_URL;
  client = new OpenAI({ apiKey, baseURL: baseURL || undefined });
  return client;
}
