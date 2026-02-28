import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyImageButtonProps {
  base64: string;
  className?: string;
}

export function CopyImageButton({ base64, className }: CopyImageButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const res = await fetch(`data:image/png;base64,${base64}`);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: can't copy image in this context
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={className ?? "p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"}
      title="Copy image to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
