"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentId } from "@/lib/types";
import { DEMO_SCRIPTS } from "@/lib/demo-scripts";
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
  fillInput: (text: string) => void
) {
  const [scriptIndex, setScriptIndex] = useState<Record<AgentId, number>>(makeInitialIndices);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasMoreScripts = scriptIndex[activeAgent] < DEMO_SCRIPTS[activeAgent].length;

  const advanceScript = useCallback(() => {
    const index = scriptIndex[activeAgent];
    const messages = DEMO_SCRIPTS[activeAgent];

    if (index >= messages.length) return;

    // Cancel any in-progress typewriter
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const message = messages[index];
    let charIndex = 0;
    fillInput("");

    intervalRef.current = setInterval(() => {
      charIndex++;
      fillInput(message.slice(0, charIndex));
      if (charIndex >= message.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, CHAR_DELAY_MS);

    setScriptIndex((prev) => ({ ...prev, [activeAgent]: index + 1 }));
  }, [activeAgent, scriptIndex, fillInput]);

  const resetScripts = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setScriptIndex(makeInitialIndices());
  }, []);

  return { advanceScript, resetScripts, hasMoreScripts };
}
