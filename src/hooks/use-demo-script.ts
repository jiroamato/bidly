"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentId } from "@/lib/types";
import { DEMO_SCRIPTS, type DemoEntry } from "@/lib/demo-scripts";
import { AGENT_ORDER } from "@/lib/agents";

const CHAR_DELAY_MS = 25;

function makeInitialIndices(): Record<AgentId, number> {
  const indices = {} as Record<AgentId, number>;
  for (const id of AGENT_ORDER) {
    indices[id] = 0;
  }
  return indices;
}

export function useDemoScript(
  activeAgent: AgentId,
  fillInput: (text: string) => void,
  onDemoAction?: (command: Exclude<DemoEntry, string>) => void
) {
  const [scriptIndex, setScriptIndex] = useState<Record<AgentId, number>>(makeInitialIndices);
  const scriptIndexRef = useRef(scriptIndex);
  scriptIndexRef.current = scriptIndex;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasMoreScripts = scriptIndex[activeAgent] < DEMO_SCRIPTS[activeAgent].length;

  const advanceScript = useCallback(() => {
    const index = scriptIndexRef.current[activeAgent];
    const entries = DEMO_SCRIPTS[activeAgent];

    if (index >= entries.length) return;

    // Cancel any in-progress typewriter
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const entry = entries[index];

    // Advance the index regardless of entry type
    setScriptIndex((prev) => ({ ...prev, [activeAgent]: index + 1 }));

    // Command entry — dispatch action, no typewriter
    if (typeof entry !== "string") {
      onDemoAction?.(entry);
      return;
    }

    // String entry — typewriter fill
    let charIndex = 0;
    fillInput("");

    intervalRef.current = setInterval(() => {
      charIndex++;
      fillInput(entry.slice(0, charIndex));
      if (charIndex >= entry.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, CHAR_DELAY_MS);
  }, [activeAgent, fillInput, onDemoAction]);

  const resetScripts = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setScriptIndex(makeInitialIndices());
  }, []);

  return { advanceScript, resetScripts, hasMoreScripts };
}
