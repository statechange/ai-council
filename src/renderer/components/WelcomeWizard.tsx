import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight, Check, Loader2, Wifi, WifiOff, Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { cn } from "../lib/utils";
import { CouncilorAvatar } from "./CouncilorAvatar";
import { BackendIcon } from "./BackendIcon";
import type { CouncilConfig, Councilor } from "../../types";

const STEPS = ["Welcome", "Councilors", "Backends", "Ready"] as const;

const backendNames = ["anthropic", "openai", "google", "ollama"] as const;
const envVarNames: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
};
const backendDisplayNames: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  ollama: "Ollama",
};
const backendDescriptions: Record<string, string> = {
  anthropic: "Claude models from Anthropic",
  openai: "GPT and O-series models from OpenAI",
  google: "Gemini models from Google",
  ollama: "Local models via Ollama",
};

// Backends used by the starter councilors
const starterBackends = new Set(["anthropic", "google"]);

interface BackendProbe {
  loading: boolean;
  connected: boolean | null;
  models: string[];
  error?: string;
}

interface WelcomeWizardProps {
  onComplete: () => void;
}

export function WelcomeWizard({ onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<CouncilConfig>({ backends: {} });
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({});
  const [councilors, setCouncilors] = useState<Councilor[]>([]);
  const [probes, setProbes] = useState<Record<string, BackendProbe>>({});
  const [councilDir, setCouncilDir] = useState("");

  // Load config and councilors on mount
  useEffect(() => {
    window.councilAPI.getConfig().then((result) => {
      setConfig(result.config);
      setEnvStatus(result.envStatus);
    });
    window.councilAPI.getCouncilDir().then((dir) => {
      setCouncilDir(dir);
      window.councilAPI.listCouncilors(dir).then((list: Councilor[]) => {
        // Show only the 3 starter councilors
        const starterIds = new Set(["strategist", "creative", "critic"]);
        const starters = list.filter((c) => starterIds.has(c.id));
        setCouncilors(starters.length > 0 ? starters : list.slice(0, 3));
      });
    });
  }, []);

  const probeOne = useCallback(async (name: string) => {
    setProbes((prev) => ({ ...prev, [name]: { loading: true, connected: null, models: [] } }));
    const bc = config.backends[name] || {};
    const result = await window.councilAPI.probeBackend(name, {
      apiKey: bc.apiKey,
      baseUrl: bc.baseUrl,
    });
    setProbes((prev) => ({
      ...prev,
      [name]: { loading: false, connected: result.connected, models: result.models, error: result.error },
    }));
  }, [config]);

  // Probe backends when entering step 2
  useEffect(() => {
    if (step === 2) {
      for (const name of backendNames) {
        probeOne(name);
      }
    }
  }, [step]);

  const updateBackend = (name: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      backends: {
        ...prev.backends,
        [name]: { ...prev.backends[name], apiKey: value || undefined },
      },
    }));
  };

  const handleSaveAndProbe = async (name: string) => {
    await window.councilAPI.saveConfig(config);
    probeOne(name);
  };

  const handleFinish = async () => {
    const finalConfig = { ...config, onboardingComplete: true };
    await window.councilAPI.saveConfig(finalConfig);
    onComplete();
  };

  const connectedBackends = Object.entries(probes).filter(([, p]) => p.connected).map(([name]) => name);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-8 pt-8 pb-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                i < step ? "bg-primary" :
                i === step ? "bg-primary ring-4 ring-primary/20" :
                "bg-muted-foreground/20",
              )}
            />
            <span className={cn(
              "text-xs font-medium transition-colors",
              i === step ? "text-foreground" : "text-muted-foreground/50",
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-2xl px-8 py-8">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && <CouncilorsStep councilors={councilors} onNext={() => setStep(2)} />}
          {step === 2 && (
            <BackendsStep
              config={config}
              envStatus={envStatus}
              probes={probes}
              onUpdateKey={updateBackend}
              onSaveAndProbe={handleSaveAndProbe}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <ReadyStep
              councilors={councilors}
              connectedBackends={connectedBackends}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Step 1: Welcome ---- */

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <img src="./icon.png" alt="Council" className="h-20 w-20 mx-auto rounded-xl shadow-lg" />
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Council</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Council brings together AI-powered councilors — each with their own perspective,
          personality, and expertise — to discuss any topic you throw at them.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm max-w-lg mx-auto">
        <div className="space-y-2 p-4 rounded-lg bg-card border">
          <div className="text-2xl">1</div>
          <p className="text-muted-foreground">Pick a topic or question</p>
        </div>
        <div className="space-y-2 p-4 rounded-lg bg-card border">
          <div className="text-2xl">2</div>
          <p className="text-muted-foreground">Councilors discuss in rounds</p>
        </div>
        <div className="space-y-2 p-4 rounded-lg bg-card border">
          <div className="text-2xl">3</div>
          <p className="text-muted-foreground">Get a synthesized summary</p>
        </div>
      </div>

      <Button size="lg" onClick={onNext} className="gap-2">
        Get Started <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ---- Step 2: Meet Your Council ---- */

function CouncilorsStep({ councilors, onNext }: { councilors: Councilor[]; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Your Starter Council</h2>
        <p className="text-muted-foreground">
          Three councilors are ready to go — covering strategy, creativity, and critical analysis.
          You can add more later.
        </p>
      </div>

      <div className="grid gap-4">
        {councilors.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <CouncilorAvatar name={c.frontmatter.name} avatarUrl={c.avatarUrl} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.frontmatter.name}</span>
                  <Badge variant="secondary" className="text-[11px] font-mono font-normal gap-1">
                    <BackendIcon backend={c.frontmatter.backend} size={12} />
                    {c.frontmatter.backend}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{c.frontmatter.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={onNext} className="gap-2">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---- Step 3: Backend Configuration ---- */

interface BackendsStepProps {
  config: CouncilConfig;
  envStatus: Record<string, boolean>;
  probes: Record<string, BackendProbe>;
  onUpdateKey: (name: string, value: string) => void;
  onSaveAndProbe: (name: string) => void;
  onNext: () => void;
}

function BackendsStep({ config, envStatus, probes, onUpdateKey, onSaveAndProbe, onNext }: BackendsStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Connect Your AI Backends</h2>
        <p className="text-muted-foreground">
          Your starter councilors need <strong>Anthropic</strong> and <strong>Google</strong> backends.
          Add API keys below, or skip and configure later in Settings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {backendNames.map((name) => {
          const bc = config.backends[name] || {};
          const envVar = envVarNames[name];
          const hasEnv = envVar ? envStatus[envVar] : false;
          const probe = probes[name];
          const isNeeded = starterBackends.has(name);

          return (
            <Card key={name} className={cn(!isNeeded && "opacity-60")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BackendIcon backend={name} size={18} />
                    <CardTitle className="text-sm">{backendDisplayNames[name]}</CardTitle>
                  </div>
                  {probe && (
                    probe.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : probe.connected ? (
                      <div className="flex items-center gap-1 text-xs text-green-500">
                        <Wifi className="h-3.5 w-3.5" />
                        <span>Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                        <WifiOff className="h-3.5 w-3.5" />
                      </div>
                    )
                  )}
                </div>
                <CardDescription className="text-xs">
                  {backendDescriptions[name]}
                  {isNeeded && <span className="text-primary font-medium"> (used by starter councilors)</span>}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                {name !== "ollama" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={bc.apiKey || ""}
                        onChange={(e) => onUpdateKey(name, e.target.value)}
                        placeholder={hasEnv ? "(using env variable)" : "Enter API key..."}
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSaveAndProbe(name)}
                        className="shrink-0"
                      >
                        Test
                      </Button>
                    </div>
                    {hasEnv && (
                      <p className="text-[11px] text-green-500 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Found {envVar} in environment
                      </p>
                    )}
                  </div>
                )}
                {name === "ollama" && (
                  <p className="text-xs text-muted-foreground">No API key needed — runs locally</p>
                )}
                {probe && !probe.loading && probe.error && (
                  <p className="text-xs text-destructive">{probe.error}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={onNext} className="gap-2">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---- Step 4: Ready ---- */

interface ReadyStepProps {
  councilors: Councilor[];
  connectedBackends: string[];
  onFinish: () => void;
}

function ReadyStep({ councilors, connectedBackends, onFinish }: ReadyStepProps) {
  const connectedSet = new Set(connectedBackends);

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-3">
        <Sparkles className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">You're All Set!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your council is assembled and ready to discuss.
        </p>
      </div>

      {/* Connected backends summary */}
      <div className="flex justify-center gap-3">
        {backendNames.map((name) => (
          <div key={name} className="flex items-center gap-1.5 text-sm">
            <BackendIcon backend={name} size={14} />
            <span className={cn(
              connectedSet.has(name) ? "text-green-500" : "text-muted-foreground/40",
            )}>
              {backendDisplayNames[name]}
            </span>
            {connectedSet.has(name) && <Check className="h-3.5 w-3.5 text-green-500" />}
          </div>
        ))}
      </div>

      {/* Councilors summary */}
      <div className="flex justify-center gap-3">
        {councilors.map((c) => (
          <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border">
            <CouncilorAvatar name={c.frontmatter.name} avatarUrl={c.avatarUrl} size={24} />
            <span className="text-sm font-medium">{c.frontmatter.name}</span>
          </div>
        ))}
      </div>

      {connectedBackends.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No backends connected yet. You can configure API keys in Settings anytime.
        </p>
      )}

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Try asking: <em>"What's the most important skill for a founder to develop?"</em>
        </p>
        <Button size="lg" onClick={onFinish} className="gap-2">
          Start Discussing <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
