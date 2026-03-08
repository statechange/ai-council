import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { getBackend } from "../backends/index.js";
import type { ModelInfo } from "../types.js";

interface Props {
  backend?: string;
}

const BACKENDS = ["anthropic", "openai", "google", "ollama"];

export function ModelsCommand({ backend }: Props) {
  const [results, setResults] = useState<
    Array<{ backend: string; models?: ModelInfo[]; error?: string; loading: boolean }>
  >([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function run() {
      const backends = backend ? [backend] : BACKENDS;

      // Validate backend name
      if (backend && !BACKENDS.includes(backend)) {
        setResults([{ backend, error: `Unknown backend "${backend}". Available: ${BACKENDS.join(", ")}`, loading: false }]);
        setDone(true);
        return;
      }

      // Initialize loading state
      setResults(backends.map((b) => ({ backend: b, loading: true })));

      // Fetch models for each backend
      const promises = backends.map(async (name, idx) => {
        try {
          const provider = await getBackend(name);
          if (!provider.listModels) {
            return { backend: name, error: "Model listing not supported", loading: false };
          }
          const models = await provider.listModels();
          return { backend: name, models, loading: false };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // Simplify common auth errors
          if (msg.includes("API key") || msg.includes("api_key") || msg.includes("401") || msg.includes("403")) {
            return { backend: name, error: "No API key configured", loading: false };
          }
          if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
            return { backend: name, error: "Connection refused (is the service running?)", loading: false };
          }
          return { backend: name, error: msg, loading: false };
        }
      });

      const settled = await Promise.all(promises);
      setResults(settled);
      setDone(true);
    }

    run();
  }, []);

  if (!done) {
    return (
      <Box>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> Fetching available models...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {results.map((r) => (
        <Box key={r.backend} flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            {r.backend}
          </Text>
          {r.error ? (
            <Text color="yellow">  {r.error}</Text>
          ) : r.models && r.models.length > 0 ? (
            r.models.map((m) => (
              <Text key={m.id}>
                {"  "}{m.id}
                {m.name && m.name !== m.id ? <Text dimColor> — {m.name}</Text> : ""}
              </Text>
            ))
          ) : (
            <Text dimColor>  No models found</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
