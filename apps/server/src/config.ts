import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const ServerConfigSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  LLM_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY is required"),
  LLM_MODEL: z.string().default("qwen/qwen3.8-27b")
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export function loadConfig(): ServerConfig {
  const parsed = ServerConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Invalid server environment configuration: ${errorDetails}`);
  }
  return parsed.data;
}
