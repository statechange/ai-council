import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import matter from "gray-matter";

const searchPaths = (councilorDir: string, skillName: string): string[] => [
  join(councilorDir, "skills", skillName, "SKILL.md"),
  join(process.cwd(), ".claude", "skills", skillName, "SKILL.md"),
  join(homedir(), ".agents", "skills", skillName, "SKILL.md"),
  join(homedir(), ".claude", "skills", skillName, "SKILL.md"),
];

export async function resolveSkill(
  skillName: string,
  councilorDir: string,
): Promise<string | null> {
  for (const candidate of searchPaths(councilorDir, skillName)) {
    if (existsSync(candidate)) {
      const raw = await readFile(candidate, "utf-8");
      const { content } = matter(raw);
      return content.trim();
    }
  }
  return null;
}

export async function resolveSkills(
  skillNames: string[],
  councilorDir: string,
): Promise<string> {
  const sections: string[] = [];
  for (const name of skillNames) {
    const content = await resolveSkill(name, councilorDir);
    if (content) {
      sections.push(`## Skill: ${name}\n\n${content}`);
    }
  }
  return sections.join("\n\n");
}
