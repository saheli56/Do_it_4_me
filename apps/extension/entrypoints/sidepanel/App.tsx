import { useState, useEffect, useRef } from "preact/hooks";
import type {
  TaskState,
  ServerMessage,
  ExtensionMessage,
  PendingTaskItem,
  PageObservation
} from "@difm/shared";
import {
  LightningIcon,
  DropIcon,
  FlameIcon,
  GlobeIcon,
  DeviceMobileIcon,
  CreditCardIcon,
  FileTextIcon,
  ClockIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  PlayIcon,
  PlusIcon,
  XIcon,
  PencilSimpleIcon,
  BuildingsIcon,
  LinkSimpleIcon,
  InfoIcon,
  ListChecksIcon,
  SparkleIcon,
  TrashIcon
} from "../../src/components/icons";

export function App() {
  const [activeTab, setActiveTab] = useState<"EXECUTE" | "PENDING">("EXECUTE");
  const [goal, setGoal] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [approvalPrompt, setApprovalPrompt] = useState<{
    summary: string;
    consequences: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    summary: string;
  } | null>(null);

  // Pending Tasks & Notes State
  const [pendingTasks, setPendingTasks] = useState<PendingTaskItem[]>([]);
  const [remindersDue, setRemindersDue] = useState<PendingTaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [showBillerDetails, setShowBillerDetails] = useState(false);
  const [billerProvider, setBillerProvider] = useState("");
  const [billerType, setBillerType] = useState<"ELECTRICITY" | "WATER" | "GAS" | "INTERNET" | "MOBILE" | "CREDIT_CARD" | "OTHER">("ELECTRICITY");
  const [billerConsumerNo, setBillerConsumerNo] = useState("");
  const [billerSubdivision, setBillerSubdivision] = useState("");
  const [billerPortalUrl, setBillerPortalUrl] = useState("");
  const [billerInstructions, setBillerInstructions] = useState("");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const executionTabIdRef = useRef<number | null>(null);
  const currentGoalRef = useRef<string>("");
  const executingPendingTaskIdRef = useRef<string | null>(null);

  const fetchPendingTasks = async () => {
    try {
      const res = await fetch("http://127.0.0.1:3001/pending-tasks");
      const data = (await res.json()) as { tasks: PendingTaskItem[]; remindersDue: PendingTaskItem[] };
      setPendingTasks(data.tasks);
      setRemindersDue(data.remindersDue);
    } catch {
      // Handled silently
    }
  };

  const openAndPrepareTab = async (targetUrl?: string): Promise<number> => {
    const urlToOpen = targetUrl && targetUrl.startsWith("http") ? targetUrl : "https://www.google.com";
    const newTab = await chrome.tabs.create({ url: urlToOpen, active: true });
    if (!newTab.id) throw new Error("Unable to create browser tab");

    await new Promise<void>((resolve) => {
      const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === newTab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }, 8000);
    });

    await new Promise((r) => setTimeout(r, 600));
    return newTab.id;
  };

  const setupSocket = () => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return socketRef.current;
    }

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
          chrome.runtime.sendMessage({
            type: "SENSITIVE_APPROVAL_REQUIRED",
            goal: currentGoalRef.current,
            actionType: msg.summary
          }).catch(() => {});
        } else if (msg.type === "EXECUTE_ACTION") {
          setApprovalPrompt(null);
          setTaskState("EXECUTING");
          setLogs((prev) => [...prev, `Executing: [${msg.action.type}]`]);

          if (msg.action.type === "COMPLETE") {
            setTaskState("COMPLETED");
            const summary = msg.action.summary || "Task finished and verified successfully!";
            setLogs((prev) => [...prev, `Task Completed: ${summary}`]);
            setSuccessMessage({
              title: "Task Executed Successfully!",
              summary
            });

            if (executingPendingTaskIdRef.current) {
              try {
                await fetch(`http://127.0.0.1:3001/pending-tasks/${executingPendingTaskIdRef.current}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "COMPLETED" })
                });
              } catch {}
            }
            fetchPendingTasks();
            return;
          }
          if (msg.action.type === "FAIL") {
            setTaskState("FAILED");
            setLogs((prev) => [...prev, `Task Failed: ${msg.action.error}`]);
            return;
          }

          let activeTabId = executionTabIdRef.current;
          if (!activeTabId) {
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            activeTabId = tab?.id || null;
          }
          if (!activeTabId) return;

          chrome.tabs.sendMessage(activeTabId, { type: "EXECUTE_ACTION", action: msg.action }, () => {
            const captureWithRetry = (tabId: number, retryCount = 0) => {
              chrome.tabs.sendMessage(tabId, { type: "CAPTURE_OBSERVATION" }, (obsRes) => {
                if (chrome.runtime.lastError || !obsRes?.observation) {
                  if (retryCount < 6) {
                    chrome.scripting.executeScript(
                      { target: { tabId }, files: ["content-scripts/content.js"] },
                      () => {
                        setTimeout(() => captureWithRetry(tabId, retryCount + 1), 600);
                      }
                    );
                  }
                  return;
                }

                if (msg.taskId) {
                  const nextObsMsg: ExtensionMessage = {
                    type: "OBSERVATION_CAPTURED",
                    taskId: msg.taskId,
                    observation: obsRes.observation
                  };
                  sendExtensionMessage(nextObsMsg);
                }
              });
            };

            setTimeout(() => {
              captureWithRetry(activeTabId!);
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

    ws.onclose = () => {
      // Reconnect after brief pause if sidepanel is open
      setTimeout(() => {
        setupSocket();
      }, 2000);
    };

    return ws;
  };

  const sendExtensionMessage = (msg: ExtensionMessage) => {
    try {
      const ws = setupSocket();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        ws.addEventListener(
          "open",
          () => {
            ws.send(JSON.stringify(msg));
          },
          { once: true }
        );
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchPendingTasks();
    const interval = setInterval(fetchPendingTasks, 15000);
    const ws = setupSocket();

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  const handleStartTask = async (customGoal?: string, targetUrl?: string, pendingTaskId?: string) => {
    const goalToRun = (customGoal || goal).trim();
    if (!goalToRun) return;

    try {
      setSuccessMessage(null);
      setLogs([`Opening new tab for task: "${goalToRun}"...`]);
      setTaskState("UNDERSTANDING");
      setActiveTab("EXECUTE");
      currentGoalRef.current = goalToRun;
      executingPendingTaskIdRef.current = pendingTaskId || null;

      let tabId: number;
      if (targetUrl && targetUrl.startsWith("http")) {
        setLogs((prev) => [...prev, `Navigating new tab to: ${targetUrl}`]);
        tabId = await openAndPrepareTab(targetUrl);
      } else {
        const [existingTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (existingTab?.id && existingTab.url && !existingTab.url.startsWith("chrome://")) {
          tabId = existingTab.id;
        } else {
          tabId = await openAndPrepareTab("https://www.google.com");
        }
      }
      executionTabIdRef.current = tabId;

      const res = await fetch("http://127.0.0.1:3001/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalToRun })
      });

      const data = (await res.json()) as { taskId: string; state: TaskState };
      setTaskId(data.taskId);

      const sendObservation = (obs: PageObservation) => {
        const observationMsg: ExtensionMessage = {
          type: "OBSERVATION_CAPTURED",
          taskId: data.taskId,
          observation: obs
        };
        sendExtensionMessage(observationMsg);
        setLogs((prev) => [
          ...prev,
          `Page observed (${obs.interactiveNodes.length} interactive elements). Planning next action...`
        ]);
      };

      chrome.tabs.sendMessage(tabId, { type: "CAPTURE_OBSERVATION" }, (response) => {
        if (chrome.runtime.lastError || !response?.observation) {
          chrome.scripting.executeScript(
            {
              target: { tabId },
              files: ["content-scripts/content.js"]
            },
            () => {
              if (chrome.runtime.lastError) {
                setLogs((prev) => [...prev, "Error: Unable to access page. Please refresh the page tab."]);
                return;
              }
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { type: "CAPTURE_OBSERVATION" }, (retryRes) => {
                  if (chrome.runtime.lastError || !retryRes?.observation) {
                    setLogs((prev) => [...prev, "Please refresh the target webpage tab and click Start again."]);
                    return;
                  }
                  sendObservation(retryRes.observation);
                });
              }, 300);
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
    if (!taskId) return;

    const approvalMsg: ExtensionMessage = {
      type: "USER_APPROVAL_RESPONSE",
      taskId,
      approved
    };
    sendExtensionMessage(approvalMsg);
    setApprovalPrompt(null);
    setLogs((prev) => [...prev, approved ? "Action approved." : "Action rejected."]);
  };

  const handleCreatePendingTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const billerInfo = showBillerDetails
        ? {
            providerName: billerProvider.trim() || undefined,
            billType: billerType,
            consumerNumber: billerConsumerNo.trim() || undefined,
            subdivision: billerSubdivision.trim() || undefined,
            portalUrl: billerPortalUrl.trim() || undefined,
            additionalInstructions: billerInstructions.trim() || undefined
          }
        : undefined;

      await fetch("http://127.0.0.1:3001/pending-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          dueDate: newTaskDueDate || undefined,
          notes: newTaskNotes.trim() || undefined,
          targetUrl: billerPortalUrl.trim() || tab?.url || undefined,
          billerInfo
        })
      });

      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskNotes("");
      setBillerProvider("");
      setBillerConsumerNo("");
      setBillerSubdivision("");
      setBillerPortalUrl("");
      setBillerInstructions("");
      setShowBillerDetails(false);
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const handleExecutePendingTask = async (task: PendingTaskItem) => {
    let formulatedGoal = task.title;
    const targetUrl = task.billerInfo?.portalUrl || task.targetUrl;

    if (task.billerInfo) {
      const parts: string[] = [];
      if (task.billerInfo.providerName) parts.push(`Provider: ${task.billerInfo.providerName}`);
      if (task.billerInfo.billType) parts.push(`Type: ${task.billerInfo.billType}`);
      if (task.billerInfo.consumerNumber) parts.push(`Consumer/Account No: ${task.billerInfo.consumerNumber}`);
      if (task.billerInfo.subdivision) parts.push(`Circle/Subdivision: ${task.billerInfo.subdivision}`);
      if (task.billerInfo.additionalInstructions) parts.push(`Instructions: ${task.billerInfo.additionalInstructions}`);
      if (task.notes) parts.push(`Notes: ${task.notes}`);

      formulatedGoal = `Pay ${task.billerInfo.billType.toLowerCase()} bill for ${
        task.billerInfo.providerName || task.title
      }. Details: ${parts.join(" | ")}. Stop and request user confirmation before final payment/card submission.`;
    }

    setGoal(formulatedGoal);
    handleStartTask(formulatedGoal, targetUrl, task.id);
  };

  const handleSaveNotes = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/pending-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: currentNoteText })
      });
      setEditingNotesId(null);
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const handleToggleTaskStatus = async (task: PendingTaskItem) => {
    const nextStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      await fetch(`http://127.0.0.1:3001/pending-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const handleDeletePendingTask = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/pending-tasks/${id}`, {
        method: "DELETE"
      });
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  return (
    <div class="p-4 flex flex-col h-screen max-w-md mx-auto">
      <header class="border-b border-slate-800 pb-3 mb-3 flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <SparkleIcon size={20} class="text-indigo-400" />
          <div>
            <h1 class="text-lg font-bold text-indigo-400 leading-none">Do It For Me</h1>
            <span class="text-[10px] text-slate-500 font-mono">Personal Action Agent</span>
          </div>
        </div>
        <div class="flex gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setActiveTab("EXECUTE")}
            class={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 transition ${
              activeTab === "EXECUTE" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <LightningIcon size={14} />
            <span>Action</span>
          </button>
          <button
            onClick={() => setActiveTab("PENDING")}
            class={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 transition ${
              activeTab === "PENDING" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <ListChecksIcon size={14} />
            <span>Tasks & Notes</span>
            {pendingTasks.filter((t) => t.status !== "COMPLETED").length > 0 && (
              <span class="bg-indigo-950 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-indigo-700">
                {pendingTasks.filter((t) => t.status !== "COMPLETED").length}
              </span>
            )}
          </button>
        </div>
      </header>

      {remindersDue.length > 0 && (
        <div class="bg-amber-950/40 border border-amber-500/40 rounded-lg p-2.5 mb-3 flex items-start gap-2 animate-pulse">
          <ClockIcon size={18} class="text-amber-400 mt-0.5 shrink-0" />
          <div class="flex-1">
            <span class="text-xs font-semibold text-amber-300">Upcoming Due Reminders:</span>
            <div class="text-[11px] text-slate-300 space-y-0.5 mt-0.5">
              {remindersDue.map((t) => (
                <div key={t.id} class="flex items-center justify-between">
                  <span>• {t.title}</span>
                  <button
                    onClick={() => handleExecutePendingTask(t)}
                    class="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded font-medium ml-2 inline-flex items-center gap-1.5"
                  >
                    <PlayIcon size={11} />
                    <span>Execute Now</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "EXECUTE" && (
        <>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Outcome Goal
            </label>
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Return these shoes or Pay electricity bill"
                value={goal}
                onInput={(e) => setGoal((e.target as HTMLInputElement).value)}
                disabled={taskState !== null && taskState !== "COMPLETED" && taskState !== "CANCELLED"}
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={() => handleStartTask()}
                disabled={!goal.trim() || (taskState !== null && taskState !== "COMPLETED" && taskState !== "CANCELLED")}
                class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-medium px-4 py-2 rounded text-sm transition inline-flex items-center gap-1.5"
              >
                <PlayIcon size={14} />
                <span>Start</span>
              </button>
            </div>
          </div>

          {successMessage && (
            <div class="bg-emerald-950/60 border border-emerald-500/60 rounded-lg p-3.5 mb-3 shadow-lg shadow-emerald-950/40">
              <div class="flex items-start gap-2.5">
                <CheckCircleIcon size={24} class="text-emerald-400 shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xs font-bold text-emerald-300">{successMessage.title}</h3>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      class="text-slate-400 hover:text-white text-xs p-0.5"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                  <p class="text-[11px] text-emerald-100/90 mt-1 leading-relaxed">{successMessage.summary}</p>
                  <div class="mt-2.5 flex gap-2">
                    <button
                      onClick={() => {
                        setSuccessMessage(null);
                        setGoal("");
                        setLogs([]);
                        setTaskState(null);
                      }}
                      class="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-1 rounded transition"
                    >
                      Start Another Task
                    </button>
                    <button
                      onClick={() => {
                        setSuccessMessage(null);
                        setActiveTab("PENDING");
                      }}
                      class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition"
                    >
                      View Pending Tasks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {approvalPrompt && (
            <div class="bg-amber-950/40 border border-amber-500/50 rounded-lg p-3 mb-4">
              <div class="flex items-center gap-1.5 mb-1">
                <WarningCircleIcon size={16} class="text-amber-400" />
                <h3 class="text-sm font-semibold text-amber-300">Sensitive Approval Required</h3>
              </div>
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
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Execution Log
              </label>
              {taskState && (
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-indigo-300">
                  {taskState}
                </span>
              )}
            </div>
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
        </>
      )}

      {activeTab === "PENDING" && (
        <div class="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4">
          <div class="bg-slate-800/80 border border-slate-700 rounded-lg p-3 space-y-2">
            <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <PlusIcon size={14} />
              <span>Add Pending Task</span>
            </div>
            <input
              type="text"
              placeholder="Task name (e.g. Pay Electricity Bill, Internet Subscription)"
              value={newTaskTitle}
              onInput={(e) => setNewTaskTitle((e.target as HTMLInputElement).value)}
              class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <div class="flex gap-2 items-center">
              <input
                type="date"
                value={newTaskDueDate}
                onInput={(e) => setNewTaskDueDate((e.target as HTMLInputElement).value)}
                class="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowBillerDetails(!showBillerDetails)}
                class={`text-xs px-2.5 py-1 rounded border inline-flex items-center gap-1 transition ${
                  showBillerDetails
                    ? "bg-indigo-900/60 border-indigo-500 text-indigo-200"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                <CreditCardIcon size={13} />
                {showBillerDetails ? "Hide Bill Site Info" : "+ Bill Site Info"}
              </button>
            </div>

            {showBillerDetails && (
              <div class="bg-slate-900/90 border border-indigo-900/60 rounded p-2.5 space-y-2 text-xs">
                <div class="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
                  <BuildingsIcon size={14} />
                  <span>Bill Payment Portal & Account Details</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-0.5">Bill Type</label>
                    <select
                      value={billerType}
                      onChange={(e) => setBillerType((e.target as HTMLSelectElement).value as any)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ELECTRICITY">Electricity</option>
                      <option value="WATER">Water</option>
                      <option value="GAS">Gas</option>
                      <option value="INTERNET">Internet</option>
                      <option value="MOBILE">Mobile</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-0.5">Provider / Biller</label>
                    <input
                      type="text"
                      placeholder="e.g. Tata Power, CESC, Airtel"
                      value={billerProvider}
                      onInput={(e) => setBillerProvider((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label class="text-[10px] text-slate-400 block mb-0.5">Payment Portal / Website URL</label>
                  <input
                    type="url"
                    placeholder="https://tatapower.com/quickpay or billing portal"
                    value={billerPortalUrl}
                    onInput={(e) => setBillerPortalUrl((e.target as HTMLInputElement).value)}
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-0.5">Consumer / Account No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 102938492"
                      value={billerConsumerNo}
                      onInput={(e) => setBillerConsumerNo((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-0.5">Subdivision / Circle</label>
                    <input
                      type="text"
                      placeholder="e.g. North Zone"
                      value={billerSubdivision}
                      onInput={(e) => setBillerSubdivision((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label class="text-[10px] text-slate-400 block mb-0.5">Payment Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Stop before OTP or CVV entry"
                    value={billerInstructions}
                    onInput={(e) => setBillerInstructions((e.target as HTMLInputElement).value)}
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <textarea
              placeholder="Notes, reminders, order IDs, or general instructions..."
              value={newTaskNotes}
              onInput={(e) => setNewTaskNotes((e.target as HTMLTextAreaElement).value)}
              rows={2}
              class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
            />

            <button
              onClick={handleCreatePendingTask}
              disabled={!newTaskTitle.trim()}
              class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs font-semibold py-1.5 rounded transition inline-flex items-center justify-center gap-1"
            >
              <PlusIcon size={14} />
              Save Pending Task
            </button>
          </div>

          <div class="space-y-2.5">
            <div class="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <ListChecksIcon size={14} />
              <span>Pending Tasks & Notes ({pendingTasks.length})</span>
            </div>
            {pendingTasks.length === 0 ? (
              <div class="text-xs text-slate-500 text-center py-6">No pending tasks saved yet.</div>
            ) : (
              pendingTasks.map((t) => (
                <div
                  key={t.id}
                  class={`border rounded-lg p-3 transition ${
                    t.status === "COMPLETED"
                      ? "bg-slate-900/40 border-slate-800 opacity-60"
                      : t.status === "DUE_SOON"
                      ? "bg-amber-950/20 border-amber-600/40"
                      : "bg-slate-800/40 border-slate-700"
                  }`}
                >
                  <div class="flex items-start justify-between gap-2 mb-1.5">
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={t.status === "COMPLETED"}
                        onChange={() => handleToggleTaskStatus(t)}
                        class="rounded bg-slate-900 border-slate-700 text-indigo-600"
                      />
                      <span
                        class={`text-xs font-medium ${
                          t.status === "COMPLETED" ? "line-through text-slate-500" : "text-slate-200"
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      {t.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleExecutePendingTask(t)}
                          class="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium px-2 py-0.5 rounded transition inline-flex items-center gap-1"
                        >
                          <PlayIcon size={11} />
                          Execute
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePendingTask(t.id)}
                        class="text-slate-500 hover:text-rose-400 text-xs p-1"
                      >
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {t.dueDate && (
                    <div class="text-[10px] text-slate-400 flex items-center gap-1 mb-1.5">
                      <ClockIcon size={11} />
                      <span>Due:</span>
                      <span class={t.status === "DUE_SOON" ? "text-amber-400 font-bold" : "text-slate-300"}>
                        {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {t.billerInfo && (
                    <div class="bg-indigo-950/40 border border-indigo-900/50 rounded p-2 mb-1.5 text-[11px] space-y-1">
                      <div class="flex items-center justify-between text-indigo-300 font-medium">
                        <span class="inline-flex items-center gap-1">
                          <BuildingsIcon size={12} />
                          {t.billerInfo.providerName || t.billerInfo.billType}
                        </span>
                        {t.billerInfo.consumerNumber && (
                          <span class="text-[10px] text-slate-400 font-mono">#{t.billerInfo.consumerNumber}</span>
                        )}
                      </div>
                      {t.billerInfo.portalUrl && (
                        <div class="truncate text-[10px] text-indigo-400 flex items-center gap-1">
                          <LinkSimpleIcon size={11} />
                          <a href={t.billerInfo.portalUrl} target="_blank" rel="noreferrer" class="underline truncate">
                            {t.billerInfo.portalUrl}
                          </a>
                        </div>
                      )}
                      {t.billerInfo.subdivision && (
                        <div class="text-[10px] text-slate-400">
                          Circle/Subdivision: {t.billerInfo.subdivision}
                        </div>
                      )}
                      {t.billerInfo.additionalInstructions && (
                        <div class="text-[10px] text-slate-400 italic flex items-center gap-1">
                          <InfoIcon size={11} />
                          <span>{t.billerInfo.additionalInstructions}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div class="bg-slate-900/60 border border-slate-800/80 rounded p-2 text-xs">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                        <FileTextIcon size={11} />
                        Notes / Context
                      </span>
                      {editingNotesId !== t.id && (
                        <button
                          onClick={() => {
                            setEditingNotesId(t.id);
                            setCurrentNoteText(t.notes || "");
                          }}
                          class="text-[10px] text-slate-400 hover:text-indigo-300 inline-flex items-center gap-0.5"
                        >
                          <PencilSimpleIcon size={11} />
                          Edit
                        </button>
                      )}
                    </div>

                    {editingNotesId === t.id ? (
                      <div class="space-y-1.5">
                        <textarea
                          value={currentNoteText}
                          onInput={(e) => setCurrentNoteText((e.target as HTMLTextAreaElement).value)}
                          rows={2}
                          class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                        <div class="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            class="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotes(t.id)}
                            class="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-medium"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p class="text-[11px] text-slate-400 italic">
                        {t.notes || "No notes attached. Click Edit to add return tracking, instructions, etc."}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

