import { z } from "zod";

export const CouncilorFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  interests: z.array(z.string()).default([]),
  backend: z.enum(["anthropic", "openai", "google", "ollama"]),
  model: z.string().optional(),
  skills: z.array(z.string()).default([]),
  temperature: z.number().min(0).max(2).optional(),
  avatar: z.string().optional(),
});

export type CouncilorFrontmatter = z.infer<typeof CouncilorFrontmatterSchema>;

export interface Councilor {
  id: string;
  frontmatter: CouncilorFrontmatter;
  systemPrompt: string;
  dirPath: string;
  avatarUrl?: string;
}

export interface ConversationTurn {
  round: number;
  councilorId: string;
  councilorName: string;
  content: string;
  timestamp: string;
  model: string;
  backend: string;
  tokenUsage?: { input: number; output: number };
  avatarUrl?: string;
}

export interface ConversationResult {
  topic: string;
  topicSource: "inline" | "file";
  councilors: Array<{
    id: string;
    name: string;
    description: string;
    backend: string;
    model: string;
    avatarUrl?: string;
  }>;
  rounds: number;
  turns: ConversationTurn[];
  startedAt: string;
  completedAt: string;
  totalTokenUsage: { input: number; output: number };
  summary?: string;
  diagram?: unknown[];
  title?: string;
  infographics?: string[];
  roundSummaries?: Record<number, string>;
  mode?: "freeform" | "debate";
  continuedFrom?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  temperature?: number;
}

export interface ChatResponse {
  content: string;
  tokenUsage?: { input: number; output: number };
}

export interface ChatStreamChunk {
  delta: string;
  tokenUsage?: { input: number; output: number };
}

export interface ModelInfo {
  id: string;
  name?: string;
  description?: string;
  created?: string;
}

export interface BackendProvider {
  name: string;
  defaultModel: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream?(request: ChatRequest): AsyncIterable<ChatStreamChunk>;
  listModels?(): Promise<ModelInfo[]>;
}

export interface BackendConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface CouncilorRegistryEntry {
  path: string;            // absolute path to councilor directory
  source: "local" | "git";
  url?: string;            // git origin, if cloned
  addedAt: string;         // ISO timestamp
}

export interface CouncilConfig {
  backends: Partial<Record<string, BackendConfig>>;
  councilors?: Record<string, CouncilorRegistryEntry>;
  /** @deprecated Use councilors */
  counsellors?: Record<string, CouncilorRegistryEntry>;
  secretary?: {
    backend: string;
    model?: string;
    systemPrompt?: string;
  };
  infographic?: {
    backend: "openai" | "google";
  };
  defaults?: {
    councilorIds?: string[];
    infographicBackends?: ("openai" | "google")[];
    mode?: "freeform" | "debate";
  };
  onboardingComplete?: boolean;
}

export type ConversationEvent =
  | { type: "turn_start"; round: number; councilorName: string }
  | { type: "turn_chunk"; councilorName: string; delta: string }
  | { type: "turn_complete"; turn: ConversationTurn }
  | { type: "round_complete"; round: number }
  | { type: "error"; councilorName: string; error: string }
  | { type: "summary_start" }
  | { type: "summary_chunk"; delta: string }
  | { type: "summary_complete"; summary: string; diagram?: unknown[] }
  | { type: "title_generated"; title: string }
  | { type: "round_summary_start"; round: number }
  | { type: "round_summary_chunk"; round: number; delta: string }
  | { type: "round_summary_complete"; round: number; summary: string }
  | { type: "infographic_start" }
  | { type: "infographic_complete"; infographic: string }
  | { type: "infographic_error"; error: string };
