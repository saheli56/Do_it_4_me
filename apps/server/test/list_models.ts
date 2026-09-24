import OpenAI from "openai";
import { loadConfig } from "../src/config.js";

async function listModels() {
  const config = loadConfig();
  const client = new OpenAI({
    apiKey: config.LLM_API_KEY,
    baseURL: config.LLM_BASE_URL
  });

  const list = await client.models.list();
  console.log("Available Groq Models:", list.data.map((m) => m.id));
}

listModels().catch(console.error);
