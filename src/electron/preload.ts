import { contextBridge, ipcRenderer } from "electron";

const councilAPI = {
  getCouncilDir: () =>
    ipcRenderer.invoke("app:getCouncilDir") as Promise<string>,

  listCouncilors: (councilDir: string) =>
    ipcRenderer.invoke("councilors:list", councilDir),

  getCouncilor: (dirPath: string) =>
    ipcRenderer.invoke("councilors:get", dirPath),

  saveCouncilor: (dirPath: string, aboutMd: string) =>
    ipcRenderer.invoke("councilors:save", dirPath, aboutMd),

  createCouncilor: (councilDir: string, id: string, aboutMd: string) =>
    ipcRenderer.invoke("councilors:create", councilDir, id, aboutMd),

  deleteCouncilor: (dirPath: string) =>
    ipcRenderer.invoke("councilors:delete", dirPath),

  getConfig: () =>
    ipcRenderer.invoke("config:get"),

  saveConfig: (config: unknown) =>
    ipcRenderer.invoke("config:save", config),

  probeBackend: (name: string, config: { apiKey?: string; baseUrl?: string }) =>
    ipcRenderer.invoke("backend:probe", name, config),

  listModels: (backend: string) =>
    ipcRenderer.invoke("backend:models", backend),

  startDiscussion: (params: {
    topic: string;
    topicSource: "inline" | "file";
    councilDir: string;
    councilorIds?: string[];
    rounds: number;
    infographicBackends?: ("openai" | "google")[];
    mode?: "freeform" | "debate";
    previousTurns?: import("../types.js").ConversationTurn[];
    previousSummary?: string;
    continuedFrom?: string;
  }) => ipcRenderer.invoke("discussion:start", params),

  stopDiscussion: () =>
    ipcRenderer.invoke("discussion:stop"),

  injectMessage: (content: string) =>
    ipcRenderer.invoke("discussion:inject", content),

  onDiscussionEvent: (callback: (event: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data);
    ipcRenderer.on("discussion:event", handler);
    return () => {
      ipcRenderer.removeListener("discussion:event", handler);
    };
  },

  listHistory: () =>
    ipcRenderer.invoke("history:list"),

  getHistoryEntry: (id: string) =>
    ipcRenderer.invoke("history:get", id),

  deleteHistoryEntry: (id: string) =>
    ipcRenderer.invoke("history:delete", id),

  selectDirectory: () =>
    ipcRenderer.invoke("dialog:selectDirectory"),

  openInFinder: (dirPath: string) =>
    ipcRenderer.invoke("shell:open-in-finder", dirPath),

  openInTerminal: (dirPath: string) =>
    ipcRenderer.invoke("shell:open-in-terminal", dirPath),

  openInEditor: (dirPath: string) =>
    ipcRenderer.invoke("shell:open-in-editor", dirPath),

  registryAddLocal: (dirPath: string) =>
    ipcRenderer.invoke("registry:add-local", dirPath),

  registryAddRemote: (url: string) =>
    ipcRenderer.invoke("registry:add-remote", url),

  registryRemove: (id: string, deleteFiles?: boolean) =>
    ipcRenderer.invoke("registry:remove", id, deleteFiles),

  readFileAsText: (filePath: string) =>
    ipcRenderer.invoke("file:read-as-text", filePath),

  checkMarkitdown: () =>
    ipcRenderer.invoke("markitdown:check"),

  installMarkitdown: () =>
    ipcRenderer.invoke("markitdown:install"),

  generateInfographic: (historyId: string, backend?: "openai" | "google") =>
    ipcRenderer.invoke("infographic:generate", historyId, backend),

  deleteInfographic: (historyId: string, index: number) =>
    ipcRenderer.invoke("infographic:delete", historyId, index),
};

contextBridge.exposeInMainWorld("councilAPI", councilAPI);
