import type {
  Councilor,
  ConversationTurn,
  ConversationResult,
  ConversationEvent,
  ChatMessage,
  CouncilConfig,
} from "../types.js";
import { getBackend } from "../backends/index.js";
import { runInterimSummary } from "./secretary.js";
import { log } from "./logger.js";

function buildMessages(
  topic: string,
  turns: ConversationTurn[],
  currentCouncilorId: string,
  previousTurns?: ConversationTurn[],
  previousSummary?: string,
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "user", content: topic }];

  // Prepend previous conversation context if continuing
  if (previousTurns?.length) {
    for (const turn of previousTurns) {
      if (turn.councilorId === currentCouncilorId) {
        messages.push({ role: "assistant", content: turn.content });
      } else {
        messages.push({
          role: "user",
          content: `[${turn.councilorName}, Round ${turn.round}]: ${turn.content}`,
        });
      }
    }
    if (previousSummary) {
      messages.push({
        role: "user",
        content: `[Secretary Summary]: ${previousSummary}`,
      });
    }
  }

  for (const turn of turns) {
    if (turn.councilorId === currentCouncilorId) {
      messages.push({ role: "assistant", content: turn.content });
    } else {
      messages.push({
        role: "user",
        content: `[${turn.councilorName}, Round ${turn.round}]: ${turn.content}`,
      });
    }
  }

  return messages;
}

function buildDebateMessages(
  topic: string,
  turns: ConversationTurn[],
  currentCouncilorId: string,
  currentRound: number,
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "user", content: topic }];

  if (currentRound === 1) {
    // Constructive: only the topic, no other turns visible
    return messages;
  }

  // Rebuttal: show all round 1 (constructive) turns
  const constructiveTurns = turns.filter((t) => t.round === 1);
  for (const turn of constructiveTurns) {
    if (turn.councilorId === currentCouncilorId) {
      messages.push({ role: "assistant", content: turn.content });
    } else {
      messages.push({
        role: "user",
        content: `[${turn.councilorName}, Constructive]: ${turn.content}`,
      });
    }
  }

  // Show only the previous rebuttal round (N-1)
  const prevRound = currentRound - 1;
  if (prevRound > 1) {
    const prevTurns = turns.filter((t) => t.round === prevRound);
    for (const turn of prevTurns) {
      if (turn.councilorId === currentCouncilorId) {
        messages.push({ role: "assistant", content: turn.content });
      } else {
        messages.push({
          role: "user",
          content: `[${turn.councilorName}, Round ${prevRound}]: ${turn.content}`,
        });
      }
    }
  }

  // Include current councilor's own prior turns from other rebuttal rounds (not round 1, not prevRound)
  for (const turn of turns) {
    if (
      turn.councilorId === currentCouncilorId &&
      turn.round !== 1 &&
      turn.round !== prevRound &&
      turn.round < currentRound
    ) {
      messages.push({ role: "assistant", content: turn.content });
    }
  }

  return messages;
}

function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  // Simple seeded PRNG (mulberry32)
  let s = seed | 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildResult(
  opts: RunConversationOptions,
  turns: ConversationTurn[],
  startedAt: string,
  totalInput: number,
  totalOutput: number,
  roundSummaries?: Record<number, string>,
): ConversationResult {
  return {
    topic: opts.topic,
    topicSource: opts.topicSource,
    councilors: opts.councilors.map((c) => ({
      id: c.id,
      name: c.frontmatter.name,
      description: c.frontmatter.description,
      backend: c.frontmatter.backend,
      model: c.frontmatter.model ?? "default",
      avatarUrl: c.avatarUrl,
    })),
    rounds: opts.rounds,
    turns,
    startedAt,
    completedAt: new Date().toISOString(),
    totalTokenUsage: { input: totalInput, output: totalOutput },
    ...(roundSummaries && Object.keys(roundSummaries).length > 0 ? { roundSummaries } : {}),
    ...(opts.mode === "debate" ? { mode: "debate" as const } : {}),
  };
}

export interface RunConversationOptions {
  topic: string;
  topicSource: "inline" | "file";
  councilors: Councilor[];
  rounds: number;
  onEvent: (event: ConversationEvent) => void;
  beforeTurn?: () => Promise<ConversationTurn | null>;
  signal?: AbortSignal;
  mode?: "freeform" | "debate";
  config?: CouncilConfig;
  previousTurns?: ConversationTurn[];
  previousSummary?: string;
}

export async function runConversation(
  topicOrOpts: string | RunConversationOptions,
  topicSource?: "inline" | "file",
  councilors?: Councilor[],
  rounds?: number,
  onEvent?: (event: ConversationEvent) => void,
): Promise<ConversationResult> {
  let opts: RunConversationOptions;
  if (typeof topicOrOpts === "string") {
    opts = {
      topic: topicOrOpts,
      topicSource: topicSource!,
      councilors: councilors!,
      rounds: rounds!,
      onEvent: onEvent!,
    };
  } else {
    opts = topicOrOpts;
  }

  const startedAt = new Date().toISOString();
  const turns: ConversationTurn[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  const isDebate = opts.mode === "debate";
  const roundSummaries: Record<number, string> = {};

  // When continuing, offset round numbers past the previous rounds
  const roundOffset = opts.previousTurns?.length
    ? Math.max(...opts.previousTurns.map((t) => t.round))
    : 0;

  log.info("conversation", `Starting ${isDebate ? "debate" : "freeform"} — ${opts.councilors.length} councilors, ${opts.rounds} rounds`, {
    councilors: opts.councilors.map((c) => `${c.frontmatter.name} (${c.frontmatter.backend}/${c.frontmatter.model ?? "default"})`),
    topic: opts.topic.slice(0, 200),
  });

  for (let round = 1; round <= opts.rounds; round++) {
    // In debate mode: round 1 keeps original order, rounds 2+ shuffle
    const roundCouncilors = isDebate && round > 1
      ? shuffleWithSeed(opts.councilors, round)
      : opts.councilors;

    for (const councilor of roundCouncilors) {
      if (opts.signal?.aborted) {
        return buildResult(opts, turns, startedAt, totalInput, totalOutput, roundSummaries);
      }

      if (opts.beforeTurn) {
        const injected = await opts.beforeTurn();
        if (injected) {
          turns.push(injected);
          opts.onEvent({ type: "turn_complete", turn: injected });
        }
      }

      const displayRound = round + roundOffset;
      opts.onEvent({ type: "turn_start", round: displayRound, councilorName: councilor.frontmatter.name });

      try {
        const backend = await getBackend(councilor.frontmatter.backend);
        const model = councilor.frontmatter.model ?? backend.defaultModel;
        const messages = isDebate
          ? buildDebateMessages(opts.topic, turns, councilor.id, round)
          : buildMessages(opts.topic, turns, councilor.id, opts.previousTurns, opts.previousSummary);
        const chatRequest = {
          model,
          systemPrompt: councilor.systemPrompt,
          messages,
          temperature: councilor.frontmatter.temperature,
        };

        let content: string;
        let tokenUsage: { input: number; output: number } | undefined;

        if (backend.chatStream) {
          content = "";
          for await (const chunk of backend.chatStream(chatRequest)) {
            if (opts.signal?.aborted) break;
            content += chunk.delta;
            if (chunk.delta) {
              opts.onEvent({ type: "turn_chunk", councilorName: councilor.frontmatter.name, delta: chunk.delta });
            }
            if (chunk.tokenUsage) {
              tokenUsage = chunk.tokenUsage;
            }
          }
        } else {
          const response = await backend.chat(chatRequest);
          content = response.content;
          tokenUsage = response.tokenUsage;
        }

        const turn: ConversationTurn = {
          round: displayRound,
          councilorId: councilor.id,
          councilorName: councilor.frontmatter.name,
          content,
          timestamp: new Date().toISOString(),
          model,
          backend: councilor.frontmatter.backend,
          tokenUsage,
          avatarUrl: councilor.avatarUrl,
        };

        if (tokenUsage) {
          totalInput += tokenUsage.input;
          totalOutput += tokenUsage.output;
        }

        turns.push(turn);
        opts.onEvent({ type: "turn_complete", turn });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("conversation", `Turn failed for ${councilor.frontmatter.name} (round ${round}, model ${councilor.frontmatter.model ?? "default"}, backend ${councilor.frontmatter.backend})`, err);
        opts.onEvent({ type: "error", councilorName: councilor.frontmatter.name, error: message });

        // Emit a turn_complete with the error as content so the UI can
        // clean up the streaming bubble and show the failure inline.
        const errorTurn: ConversationTurn = {
          round: displayRound,
          councilorId: councilor.id,
          councilorName: councilor.frontmatter.name,
          content: "",
          timestamp: new Date().toISOString(),
          model: councilor.frontmatter.model ?? "default",
          backend: councilor.frontmatter.backend,
          avatarUrl: councilor.avatarUrl,
          error: message,
        };
        turns.push(errorTurn);
        opts.onEvent({ type: "turn_complete", turn: errorTurn });
      }
    }

    opts.onEvent({ type: "round_complete", round });

    // Interim secretary summary after each round (debate mode only)
    if (isDebate && opts.config?.secretary?.backend && !opts.signal?.aborted) {
      try {
        const interimResult = buildResult(opts, turns, startedAt, totalInput, totalOutput, roundSummaries);
        opts.onEvent({ type: "round_summary_start", round });
        const summary = await runInterimSummary({
          result: interimResult,
          roundNumber: round,
          config: opts.config,
          onChunk: (delta) => {
            opts.onEvent({ type: "round_summary_chunk", round, delta });
          },
          signal: opts.signal,
        });
        roundSummaries[round] = summary;
        opts.onEvent({ type: "round_summary_complete", round, summary });
      } catch (err) {
        log.error("conversation", `Interim summary failed for round ${round}`, err);
      }
    }
  }

  return buildResult(opts, turns, startedAt, totalInput, totalOutput, roundSummaries);
}
