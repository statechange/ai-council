import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { execSync } from "node:child_process";

export function UpdateCommand() {
  const [status, setStatus] = useState("Checking for updates...");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<{
    current: string;
    latest: string;
    updated: boolean;
  } | null>(null);

  useEffect(() => {
    async function run() {
      try {
        // Get current version from our own package.json
        const { createRequire } = await import("node:module");
        const { fileURLToPath } = await import("node:url");
        const { resolve, dirname } = await import("node:path");
        const { readFileSync } = await import("node:fs");

        const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
        const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf-8"));
        const current = pkg.version;

        // Check latest version on npm
        setStatus("Checking npm for latest version...");
        let latest: string;
        try {
          latest = execSync("npm view @statechange/council version", {
            encoding: "utf-8",
            timeout: 15000,
          }).trim();
        } catch {
          setError("Could not reach npm registry. Check your internet connection.");
          setDone(true);
          return;
        }

        if (current === latest) {
          setDetails({ current, latest, updated: false });
          setStatus(`Already on the latest version (${current}).`);
          setDone(true);
          return;
        }

        // Update
        setStatus(`Updating from ${current} → ${latest}...`);

        // Detect package manager — prefer whatever installed us globally
        let installCmd = "npm install -g @statechange/council@latest";
        try {
          const bunPath = execSync("which bun", { encoding: "utf-8", timeout: 5000 }).trim();
          if (bunPath) {
            // Check if we were installed via bun
            const bunGlobalDir = execSync("bun pm -g ls 2>/dev/null || true", {
              encoding: "utf-8",
              timeout: 10000,
            });
            if (bunGlobalDir.includes("@statechange/council")) {
              installCmd = "bun install -g @statechange/council@latest";
            }
          }
        } catch {
          // npm fallback is fine
        }

        try {
          execSync(installCmd, {
            encoding: "utf-8",
            timeout: 120000,
            stdio: "pipe",
          });
        } catch (err: any) {
          // npm install can fail for permission reasons
          const msg = err.stderr || err.message || String(err);
          if (msg.includes("EACCES") || msg.includes("permission")) {
            setError(
              `Permission denied. Try running with sudo:\n\n  sudo npm install -g @statechange/council@latest`,
            );
          } else {
            setError(`Update failed: ${msg.slice(0, 200)}`);
          }
          setDone(true);
          return;
        }

        setDetails({ current, latest, updated: true });
        setStatus(`Updated from ${current} → ${latest}`);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setDone(true);
      }
    }

    run();
  }, []);

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (!done) {
    return (
      <Box>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> {status}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color={details?.updated ? "green" : "cyan"}>{status}</Text>
      {details?.updated && (
        <Text dimColor>
          Restart any running council processes to use the new version.
        </Text>
      )}
    </Box>
  );
}
