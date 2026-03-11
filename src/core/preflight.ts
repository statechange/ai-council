import type { Councilor, CouncilConfig, BackendProvider } from "../types.js";
import { getBackend } from "../backends/index.js";
import { log } from "./logger.js";

export interface CouncilorPreflightResult {
  councilor: Councilor;
  ok: boolean;
  model: string;
  issues: string[];
}

export interface PreflightResult {
  results: CouncilorPreflightResult[];
  valid: Councilor[];
  invalid: CouncilorPreflightResult[];
}

/**
 * Validates that each councilor's backend is reachable and model is available.
 * Probes each unique backend once, then checks every councilor against it.
 */
export async function preflightCheck(
  councilors: Councilor[],
  onStatus?: (message: string) => void,
): Promise<PreflightResult> {
  // Group councilors by backend to probe each only once
  const byBackend = new Map<string, Councilor[]>();
  for (const c of councilors) {
    const b = c.frontmatter.backend;
    if (!byBackend.has(b)) byBackend.set(b, []);
    byBackend.get(b)!.push(c);
  }

  // Probe each backend
  const backendInfo = new Map<string, {
    provider: BackendProvider | null;
    models: string[];
    error: string | null;
  }>();

  for (const [name, group] of byBackend) {
    onStatus?.(`Checking ${name} backend (${group.length} councilor${group.length > 1 ? "s" : ""})...`);
    let provider: BackendProvider | null = null;
    let models: string[] = [];
    let error: string | null = null;

    try {
      provider = await getBackend(name);
      if (provider.listModels) {
        const modelList = await provider.listModels();
        models = modelList.map((m) => m.id);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      log.error("preflight", `Backend "${name}" probe failed`, err);
    }

    backendInfo.set(name, { provider, models, error });
  }

  // Validate each councilor
  const results: CouncilorPreflightResult[] = [];

  for (const c of councilors) {
    const info = backendInfo.get(c.frontmatter.backend)!;
    const issues: string[] = [];
    const model = c.frontmatter.model ?? info.provider?.defaultModel ?? "(unknown)";

    if (info.error) {
      issues.push(`Backend "${c.frontmatter.backend}" unavailable: ${info.error}`);
    } else if (info.models.length > 0 && !info.models.includes(model)) {
      issues.push(
        `Model "${model}" not found on ${c.frontmatter.backend}`,
      );
    }

    results.push({ councilor: c, ok: issues.length === 0, model, issues });
  }

  return {
    results,
    valid: results.filter((r) => r.ok).map((r) => r.councilor),
    invalid: results.filter((r) => !r.ok),
  };
}
