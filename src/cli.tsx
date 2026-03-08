#!/usr/bin/env node

import "dotenv/config";
import React from "react";
import { render } from "ink";
import meow from "meow";
import { resolve } from "node:path";
import { DiscussCommand } from "./commands/discuss.js";
import { ListCommand } from "./commands/list.js";
import { ConfigCommand } from "./commands/config.js";
import { CouncilorCommand } from "./commands/councilor.js";
import { HistoryCommand } from "./commands/history.js";
import { GuiCommand } from "./commands/gui.js";
import { InstallCommand } from "./commands/install.js";
import { ModelsCommand } from "./commands/models.js";

const cli = meow(
  `
  Usage
    $ council <command> [options]

  Commands
    discuss <topic>        Run a council discussion on a topic (string or file path)
    list                   List available councilors
    history                List past discussions
    history <id>           Show a specific past discussion
    councilor add <path-or-url>  Register a councilor from a local path or git URL
    councilor remove <id>        Unregister a councilor (--yes to delete cloned files)
    councilor list               List all registered councilors
    models [backend]       List available models (all backends, or specify one)
    gui                    Launch the Electron GUI
    install                Install AI Council as a macOS application
    install --uninstall    Remove AI Council from Applications
    config show            Show current configuration and key status
    config scan [paths..]  Scan for API keys in env files and shell profiles
    config import [paths..]  Import discovered keys into ~/.ai-council/config.json

  Options
    --council, -c       Path to council directory (default: ./council/)
    --councilors       Specific councilor directory paths (space-separated)
    --rounds, -r        Number of discussion rounds (default: 2)
    --output, -o        Output directory (default: ./output)
    --format, -f        Output format: md, json, or both (default: both)
    --mode, -m          Discussion mode: freeform or debate (default: freeform)
                          freeform — open group chat; every councilor sees the
                                     full conversation history on every turn
                          debate   — structured argument; round 1 is constructive
                                     (each councilor argues blind), then rebuttal
                                     rounds see only the constructives + previous
                                     round; speaker order is shuffled each round;
                                     interim summaries after every round
    --infographic, -i   Generate an infographic after discussion
    --yes, -y           Auto-confirm imports without prompting

  Examples
    $ council discuss "Should we pivot to enterprise?" --rounds 3
    $ council discuss "Should AI be open source?" --mode debate --rounds 3
    $ council discuss ./topic.md --councilors ./council/strategist ./council/critic
    $ council list --council ./council/
    $ council config scan
    $ council config scan ~/projects/myapp/.env ~/other/.env
    $ council config import
    $ council config show
`,
  {
    importMeta: import.meta,
    flags: {
      council: {
        type: "string",
        shortFlag: "c",
        default: "./council/",
      },
      councilors: {
        type: "string",
        isMultiple: true,
      },
      rounds: {
        type: "number",
        shortFlag: "r",
        default: 2,
      },
      output: {
        type: "string",
        shortFlag: "o",
        default: "./output",
      },
      format: {
        type: "string",
        shortFlag: "f",
        default: "both",
      },
      mode: {
        type: "string",
        shortFlag: "m",
        default: "freeform",
      },
      infographic: {
        type: "boolean",
        shortFlag: "i",
        default: false,
      },
      yes: {
        type: "boolean",
        shortFlag: "y",
        default: false,
      },
      uninstall: {
        type: "boolean",
        default: false,
      },
    },
  },
);

const command = cli.input[0];

switch (command) {
  case "discuss": {
    const topic = cli.input[1];
    if (!topic) {
      console.error("Error: Please provide a topic.\n  $ council discuss \"Your topic here\"");
      process.exit(1);
    }
    const format = cli.flags.format as "md" | "json" | "both";
    if (!["md", "json", "both"].includes(format)) {
      console.error("Error: --format must be md, json, or both");
      process.exit(1);
    }
    const mode = cli.flags.mode as "freeform" | "debate";
    if (!["freeform", "debate"].includes(mode)) {
      console.error("Error: --mode must be freeform or debate");
      process.exit(1);
    }
    render(
      <DiscussCommand
        topic={topic}
        councilDir={resolve(cli.flags.council)}
        councilorPaths={
          cli.flags.councilors && cli.flags.councilors.length > 0
            ? cli.flags.councilors.map((p) => resolve(p))
            : undefined
        }
        rounds={cli.flags.rounds}
        outputDir={resolve(cli.flags.output)}
        format={format}
        infographic={cli.flags.infographic}
        mode={mode}
      />,
    );
    break;
  }

  case "history": {
    const historyId = cli.input[1];
    render(<HistoryCommand id={historyId} />);
    break;
  }

  case "list":
    render(<ListCommand councilDir={resolve(cli.flags.council)} />);
    break;

  case "councilor": {
    const sub = cli.input[1];
    if (!sub || !["add", "remove", "list"].includes(sub)) {
      console.error("Usage: council councilor <add|remove|list> [target]");
      process.exit(1);
    }
    const target = cli.input[2];
    render(
      <CouncilorCommand
        subcommand={sub as "add" | "remove" | "list"}
        target={target}
        yes={cli.flags.yes}
      />,
    );
    break;
  }

  case "gui":
    render(<GuiCommand path={cli.input[1]} />);
    break;

  case "install":
    render(<InstallCommand uninstall={cli.flags.uninstall} />);
    break;

  case "models": {
    const backendName = cli.input[1];
    render(<ModelsCommand backend={backendName} />);
    break;
  }

  case "config": {
    const sub = cli.input[1];
    if (!sub || !["show", "scan", "import"].includes(sub)) {
      console.error("Usage: council config <show|scan|import> [paths..]");
      process.exit(1);
    }
    const extraPaths = cli.input.slice(2).map((p) => resolve(p));
    render(
      <ConfigCommand
        subcommand={sub as "show" | "scan" | "import"}
        extraPaths={extraPaths}
        yes={cli.flags.yes}
      />,
    );
    break;
  }

  default:
    cli.showHelp();
}
