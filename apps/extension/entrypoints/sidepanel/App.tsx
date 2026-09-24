import { useState, useEffect, useRef } from "preact/hooks";
import type { TaskState, ServerMessage, ExtensionMessage } from "@difm/shared";

export function App() {
  const [goal, setGoal] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [approvalPrompt, setApprovalPrompt] = useState<{
    summary: string;
    consequences: string;
  } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:3001/ws");
    socketRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;

        if (msg.type === "REQUEST_APPROVAL") {
          setTaskState("WAITING_FOR_APPROVAL");
          setApprovalPrompt({
            summary: msg.summary,
            consequences: msg.consequences
          });
          setLogs((prev) => [...prev, `[Action Required]: ${msg.summary}`]);
        } else if (msg.type === "EXECUTE_ACTION") {
          setApprovalPrompt(null);
          setTaskState("EXECUTING");
          setLogs((prev) => [...prev, `Executing: [${msg.action.type}]`]);

          if (msg.action.type === "COMPLETE") {
            setTaskState("COMPLETED");
            setLogs((prev) => [...prev, `Task Completed: ${msg.action.summary}`]);
            return;
          }
          if (msg.action.type === "FAIL") {
            setTaskState("FAILED");
            setLogs((prev) => [...prev, `Task Failed: ${msg.action.error}`]);
            return;
          }

          const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          const activeTabId = tab?.id;
          if (!activeTabId) return;

          chrome.tabs.sendMessage(activeTabId, { type: "EXECUTE_ACTION", action: msg.action }, () => {
            if (chrome.runtime.lastError) {
              // Silently retry or acknowledge
            }
            setTimeout(() => {
              chrome.tabs.sendMessage(activeTabId, { type: "CAPTURE_OBSERVATION" }, (obsRes) => {
                if (chrome.runtime.lastError || !obsRes) return;
                if (obsRes?.observation && socketRef.current && msg.taskId) {
                  const nextObsMsg: ExtensionMessage = {
                    type: "OBSERVATION_CAPTURED",
                    taskId: msg.taskId,
                    observation: obsRes.observation
                  };
                  socketRef.current.send(JSON.stringify(nextObsMsg));
                }
              });
            }, 600);
          });
        } else if (msg.type === "TASK_STATE_CHANGED") {
          setTaskState(msg.state);
          setLogs((prev) => [...prev, `Status: ${msg.statusMessage}`]);
        }
      } catch {
        // Handled silently
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleStartTask = async () => {
    if (!goal.trim()) return;

    try {
      setLogs([`Creating task for goal: "${goal}"...`]);
      setTaskState("UNDERSTANDING");

      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id) {
        setLogs((prev) => [...prev, "Error: No active browser tab found. Please click on the webpage tab."]);
        return;
      }

      const res = await fetch("http://127.0.0.1:3001/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal })
      });

      const data = (await res.json()) as { taskId: string; state: TaskState };
      setTaskId(data.taskId);

      const sendObservation = (obs: PageObservation) => {
        if (socketRef.current) {
          const observationMsg: ExtensionMessage = {
            type: "OBSERVATION_CAPTURED",
            taskId: data.taskId,
            observation: obs
          };
          socketRef.current.send(JSON.stringify(observationMsg));
          setLogs((prev) => [
            ...prev,
            `Page observed (${obs.interactiveNodes.length} interactive elements). Planning next action...`
          ]);
        }
      };

      chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_OBSERVATION" }, (response) => {
        if (chrome.runtime.lastError || !response?.observation) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id! },
              files: ["content-scripts/content.js"]
            },
            () => {
              if (chrome.runtime.lastError) {
                setLogs((prev) => [...prev, "Error: Unable to access page. Please refresh the page tab."]);
                return;
              }
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id!, { type: "CAPTURE_OBSERVATION" }, (retryRes) => {
                  if (chrome.runtime.lastError || !retryRes?.observation) {
                    setLogs((prev) => [...prev, "Please refresh your cart webpage tab and click Start again."]);
                    return;
                  }
                  sendObservation(retryRes.observation);
                });
              }, 200);
            }
          );
        } else {
          sendObservation(response.observation);
        }
      });
    } catch (err) {
      setLogs((prev) => [...prev, "Error: Could not connect to backend server. Make sure `pnpm --filter @difm/server dev` is running."]);
    }
  };

  const handleDecision = (approved: boolean) => {
    if (!taskId || !socketRef.current) return;

    const approvalMsg: ExtensionMessage = {
      type: "USER_APPROVAL_RESPONSE",
      taskId,
      approved
    };
    socketRef.current.send(JSON.stringify(approvalMsg));
    setApprovalPrompt(null);
    setLogs((prev) => [...prev, approved ? "Action approved." : "Action rejected."]);
  };

  return (
    <div class="p-4 flex flex-col h-screen max-w-md mx-auto">
      <header class="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
        <h1 class="text-lg font-bold text-indigo-400">Do It For Me</h1>
        {taskState && (
          <span class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-indigo-300">
            {taskState}
          </span>
        )}
      </header>

      <div class="mb-4">
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Outcome Goal
        </label>
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Return these shoes or Cancel subscription"
            value={goal}
            onInput={(e) => setGoal((e.target as HTMLInputElement).value)}
            disabled={taskState !== null && taskState !== "COMPLETED" && taskState !== "CANCELLED"}
            class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={handleStartTask}
            disabled={!goal.trim() || (taskState !== null && taskState !== "COMPLETED" && taskState !== "CANCELLED")}
            class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-medium px-4 py-2 rounded text-sm transition"
          >
            Start
          </button>
        </div>
      </div>

      {approvalPrompt && (
        <div class="bg-amber-950/40 border border-amber-500/50 rounded-lg p-3 mb-4">
          <h3 class="text-sm font-semibold text-amber-300 mb-1">Approval Required</h3>
          <p class="text-xs text-slate-300 mb-2">{approvalPrompt.summary}</p>
          <p class="text-xs text-amber-200/80 mb-3">{approvalPrompt.consequences}</p>
          <div class="flex gap-2">
            <button
              onClick={() => handleDecision(true)}
              class="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium py-1.5 rounded transition"
            >
              Approve & Continue
            </button>
            <button
              onClick={() => handleDecision(false)}
              class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-1.5 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div class="flex-1 flex flex-col min-h-0">
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Execution Log
        </label>
        <div class="flex-1 bg-slate-950 border border-slate-800 rounded p-3 overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
          {logs.length === 0 ? (
            <span class="text-slate-600">Waiting for task initiation...</span>
          ) : (
            logs.map((log, index) => (
              <div key={index} class="leading-relaxed">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
