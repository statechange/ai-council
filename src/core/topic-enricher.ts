import { log } from "./logger.js";

const URL_REGEX = /https?:\/\/[^\s)<>]+/g;

/**
 * Extract URLs from a topic string.
 */
export function extractUrls(topic: string): string[] {
  const matches = topic.match(URL_REGEX);
  if (!matches) return [];
  // Deduplicate
  return [...new Set(matches)];
}

/**
 * Fetch a URL and return a text summary of its content.
 * Tries to get clean text; falls back to raw HTML trimmed.
 */
async function fetchUrlContent(url: string, signal?: AbortSignal): Promise<{ url: string; title?: string; content: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  // Chain the external signal
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Council/1.0 (AI Discussion Tool)",
        "Accept": "text/html, application/json, text/plain, */*",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { url, content: `[Failed to fetch: HTTP ${res.status}]` };
    }

    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();

    // JSON responses — pretty-print truncated
    if (contentType.includes("application/json")) {
      try {
        const parsed = JSON.stringify(JSON.parse(raw), null, 2);
        return { url, content: parsed.slice(0, 8000) };
      } catch {
        return { url, content: raw.slice(0, 8000) };
      }
    }

    // Plain text
    if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
      return { url, content: raw.slice(0, 8000) };
    }

    // HTML — extract readable content
    const { title, text } = extractFromHtml(raw);
    return { url, title, content: text.slice(0, 8000) };
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      return { url, content: "[Fetch timed out]" };
    }
    return { url, content: `[Failed to fetch: ${msg}]` };
  }
}

/**
 * Simple HTML to text extraction.
 * Strips tags, decodes entities, collapses whitespace.
 */
function extractFromHtml(html: string): { title: string; text: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : "";

  // Remove script, style, nav, header, footer
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  // Convert block elements to newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = decodeEntities(text);

  // Collapse whitespace
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return { title, text };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-zA-Z]+;/g, " ");
}

/**
 * Enrich a topic by fetching any URLs found in it.
 * Returns the original topic with fetched content appended.
 */
export async function enrichTopic(
  topic: string,
  signal?: AbortSignal,
  onStatus?: (msg: string) => void,
): Promise<string> {
  const urls = extractUrls(topic);
  if (urls.length === 0) return topic;

  log.info("topic-enricher", `Found ${urls.length} URL(s) in topic`, { urls });
  onStatus?.(`Fetching ${urls.length} link${urls.length > 1 ? "s" : ""}...`);

  const results = await Promise.all(
    urls.map((url) => fetchUrlContent(url, signal)),
  );

  let enriched = topic;
  for (const result of results) {
    const header = result.title
      ? `Resource: ${result.title} (${result.url})`
      : `Resource: ${result.url}`;
    enriched += `\n\n---\n${header}\n${result.content}`;
  }

  log.info("topic-enricher", `Enriched topic with ${results.length} resource(s)`);
  return enriched;
}
