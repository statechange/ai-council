import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BackendProvider, BackendConfig, ChatRequest, ChatResponse, ChatStreamChunk, ModelInfo } from "./types.js";

export function createGoogleBackend(config: BackendConfig): BackendProvider {
  const apiKey = config.apiKey ?? process.env.GOOGLE_API_KEY ?? "";
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    name: "google",
    defaultModel: "gemini-2.0-flash",

    async chat(request: ChatRequest): Promise<ChatResponse> {
      const model = genAI.getGenerativeModel({
        model: request.model,
        systemInstruction: request.systemPrompt,
        generationConfig: {
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        },
      });

      const history = request.messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({ history });
      const lastMessage = request.messages[request.messages.length - 1];
      const result = await chat.sendMessage(lastMessage?.content ?? "");
      const response = result.response;

      return {
        content: response.text(),
        tokenUsage: response.usageMetadata
          ? {
              input: response.usageMetadata.promptTokenCount ?? 0,
              output: response.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined,
      };
    },

    async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
      const genModel = genAI.getGenerativeModel({
        model: request.model,
        systemInstruction: request.systemPrompt,
        generationConfig: {
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        },
      });

      const history = request.messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const chat = genModel.startChat({ history });
      const lastMessage = request.messages[request.messages.length - 1];
      const result = await chat.sendMessageStream(lastMessage?.content ?? "");

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { delta: text };
        }
      }

      const response = await result.response;
      yield {
        delta: "",
        tokenUsage: response.usageMetadata
          ? {
              input: response.usageMetadata.promptTokenCount ?? 0,
              output: response.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined,
      };
    },

    async listModels(): Promise<ModelInfo[]> {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`,
      );
      if (!response.ok) throw new Error(`Google API error: ${response.status}`);
      const data = (await response.json()) as {
        models: Array<{ name: string; displayName: string; description: string }>;
      };
      return (data.models || [])
        .filter((m) => m.name.startsWith("models/gemini"))
        .map((m) => ({
          id: m.name.replace("models/", ""),
          name: m.displayName,
          description: m.description,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },
  };
}
