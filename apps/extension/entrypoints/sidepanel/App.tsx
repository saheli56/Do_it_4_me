import { useState, useEffect, useRef } from "preact/hooks";
import type {
  TaskState,
  ServerMessage,
  ExtensionMessage,
  PendingTaskItem,
  TaskPriority,
  TaskCategory,
  ScheduleFrequency,
  PageObservation,
  SecurityChallenge
} from "@difm/shared";
import {
  LightningIcon,
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
  TrashIcon,
  ShieldCheckIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeSimpleIcon,
  CalendarIcon,
  RepeatIcon,
  TagIcon,
  FlagIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CopyIcon,
  CaretDownIcon,
  CaretUpIcon
} from "../../src/components/icons";

export function App() {
  const [activeTab, setActiveTab] = useState<"EXECUTE" | "PENDING">("EXECUTE");
  const [goal, setGoal] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [securityChallenge, setSecurityChallenge] = useState<SecurityChallenge | null>(null);
  const [approvalPrompt, setApprovalPrompt] = useState<{
    summary: string;
    consequences: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    summary: string;
  } | null>(null);

  // Pending Tasks & Scheduling State
  const [pendingTasks, setPendingTasks] = useState<PendingTaskItem[]>(() => {
    try {
      const cached = localStorage.getItem("difm_saved_pending_tasks");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [remindersDue, setRemindersDue] = useState<PendingTaskItem[]>([]);
  const [scheduledReady, setScheduledReady] = useState<PendingTaskItem[]>([]);

  // Task Creation Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [showBillerDetails, setShowBillerDetails] = useState(false);
  const [showScheduleDetails, setShowScheduleDetails] = useState(false);

  // Schedule Configuration State
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState<ScheduleFrequency>("MONTHLY");
  const [scheduleTime, setScheduleTime] = useState("09:30");
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState<number>(5);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<number>(1);
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState<number>(3);
  const [scheduleAutoExecute, setScheduleAutoExecute] = useState(true);

  // Biller & Profile Details
  const [billerProvider, setBillerProvider] = useState("");
  const [billerType, setBillerType] = useState<TaskCategory>("GENERAL");
  const [billerConsumerNo, setBillerConsumerNo] = useState("");
  const [billerSubdivision, setBillerSubdivision] = useState("");
  const [billerPortalUrl, setBillerPortalUrl] = useState("");
  const [billerFirstName, setBillerFirstName] = useState(() => {
    try {
      const fn = localStorage.getItem("difm_user_first_name");
      if (fn) return fn;
      const legacy = localStorage.getItem("difm_user_name") || "";
      return legacy.split(" ")[0] || "";
    } catch {
      return "";
    }
  });
  const [billerLastName, setBillerLastName] = useState(() => {
    try {
      const ln = localStorage.getItem("difm_user_last_name");
      if (ln) return ln;
      const legacy = localStorage.getItem("difm_user_name") || "";
      const parts = legacy.split(" ");
      return parts.length > 1 ? parts.slice(1).join(" ") : "";
    } catch {
      return "";
    }
  });
  const [billerPhone, setBillerPhone] = useState(() => {
    try {
      return localStorage.getItem("difm_user_phone") || "";
    } catch {
      return "";
    }
  });
  const [billerEmail, setBillerEmail] = useState(() => {
    try {
      return localStorage.getItem("difm_user_email") || "";
    } catch {
      return "";
    }
  });
  const [billerInstructions, setBillerInstructions] = useState("");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"created" | "dueDate" | "nextRun" | "priority">("created");

  // Editing Task Modal State
  const [editingTask, setEditingTask] = useState<PendingTaskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editCategory, setEditCategory] = useState<TaskCategory>("GENERAL");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editProvider, setEditProvider] = useState("");
  const [editConsumerNo, setEditConsumerNo] = useState("");
  const [editSubdivision, setEditSubdivision] = useState("");
  const [editPortalUrl, setEditPortalUrl] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editScheduleEnabled, setEditScheduleEnabled] = useState(false);
  const [editScheduleFreq, setEditScheduleFreq] = useState<ScheduleFrequency>("MONTHLY");
  const [editScheduleTime, setEditScheduleTime] = useState("09:30");
  const [editScheduleDayOfMonth, setEditScheduleDayOfMonth] = useState<number>(5);
  const [editScheduleDayOfWeek, setEditScheduleDayOfWeek] = useState<number>(1);
  const [editScheduleIntervalDays, setEditScheduleIntervalDays] = useState<number>(3);
  const [editScheduleAutoExecute, setEditScheduleAutoExecute] = useState(true);

  // History & Inline Notes
  const [expandedHistoryTaskId, setExpandedHistoryTaskId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const executionTabIdRef = useRef<number | null>(null);
  const currentGoalRef = useRef<string>("");
  const executingPendingTaskIdRef = useRef<string | null>(null);
  const executionStartTimeRef = useRef<number>(0);
  const executionStepsCountRef = useRef<number>(0);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchPendingTasks = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
      if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
      if (priorityFilter !== "ALL") queryParams.set("priority", priorityFilter);
      if (sortBy) queryParams.set("sortBy", sortBy);

      const res = await fetch(`http://127.0.0.1:3001/pending-tasks?${queryParams.toString()}`);
      const data = (await res.json()) as {
        tasks: PendingTaskItem[];
        remindersDue: PendingTaskItem[];
        scheduledReady?: PendingTaskItem[];
      };
      if (Array.isArray(data.tasks)) {
        setPendingTasks(data.tasks);
        setRemindersDue(data.remindersDue || []);
        setScheduledReady(data.scheduledReady || []);
        localStorage.setItem("difm_saved_pending_tasks", JSON.stringify(data.tasks));
      }
    } catch {
      // Retain cached tasks
    }
  };

  const captureTabObservationWithRetry = (tabId: number, currentTaskId: string) => {
    const attempt = () => {
      chrome.tabs.sendMessage(tabId, { type: "CAPTURE_OBSERVATION" }, (response) => {
        if (chrome.runtime.lastError || !response?.observation) {
          // Page may have reloaded/navigated: re-inject content script and retry
          chrome.scripting.executeScript(
            {
              target: { tabId },
              files: ["content-scripts/content.js"]
            },
            () => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { type: "CAPTURE_OBSERVATION" }, (retryRes) => {
                  if (retryRes?.observation) {
                    const nextObsMsg: ExtensionMessage = {
                      type: "OBSERVATION_CAPTURED",
                      taskId: currentTaskId,
                      observation: retryRes.observation
                    };
                    sendExtensionMessage(nextObsMsg);
                    setLogs((prev) => [
                      ...prev,
                      `Page observed (${retryRes.observation.interactiveNodes?.length || 0} interactive elements). Planning next step...`
                    ]);
                  }
                });
              }, 400);
            }
          );
        } else {
          const nextObsMsg: ExtensionMessage = {
            type: "OBSERVATION_CAPTURED",
            taskId: currentTaskId,
            observation: response.observation
          };
          sendExtensionMessage(nextObsMsg);
          setLogs((prev) => [
            ...prev,
            `Page observed (${response.observation.interactiveNodes?.length || 0} interactive elements). Planning next step...`
          ]);
        }
      });
    };

    setTimeout(attempt, 450);
  };

  const waitForTabComplete = async (tabId: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
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
    await new Promise((r) => setTimeout(r, 400));
  };

  const openAndPrepareTab = async (targetUrl?: string): Promise<number> => {
    // Check if the user is already on an active tab in the current window
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // If no targetUrl is provided, or user is executing a prompt directly:
    // ALWAYS reuse the current active tab without creating or navigating away!
    if (!targetUrl || !targetUrl.startsWith("http")) {
      if (currentTab?.id) {
        return currentTab.id;
      }
    }

    // If targetUrl IS provided:
    if (targetUrl && targetUrl.startsWith("http")) {
      // If current tab is already on this target portal, use it directly!
      if (currentTab?.id && currentTab.url && currentTab.url.startsWith(targetUrl)) {
        return currentTab.id;
      }

      // If current tab is a blank or new tab, navigate it instead of opening another tab
      if (
        currentTab?.id &&
        (!currentTab.url ||
          currentTab.url.startsWith("chrome://") ||
          currentTab.url.startsWith("about:") ||
          currentTab.url === "https://www.google.com/")
      ) {
        await chrome.tabs.update(currentTab.id, { url: targetUrl });
        await waitForTabComplete(currentTab.id);
        return currentTab.id;
      }

      // Otherwise create a new tab for the target URL
      const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
      if (!newTab.id) throw new Error("Unable to create browser tab");
      await waitForTabComplete(newTab.id);
      return newTab.id;
    }

    if (currentTab?.id) return currentTab.id;
    const fallbackTab = await chrome.tabs.create({ url: "https://www.google.com", active: true });
    return fallbackTab.id!;
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

        if (msg.type === "SECURITY_CHALLENGE_DETECTED") {
          setTaskState("HUMAN_TAKEOVER");
          setSecurityChallenge(msg.challenge);
          setLogs((prev) => [...prev, `[Verification Needed]: ${msg.challenge.description}`]);
        } else if (msg.type === "REQUEST_APPROVAL") {
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
          setSecurityChallenge(null);
          setTaskState("EXECUTING");
          executionStepsCountRef.current += 1;
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
              const durationMs = Date.now() - executionStartTimeRef.current;
              try {
                await fetch(`http://127.0.0.1:3001/pending-tasks/${executingPendingTaskIdRef.current}/record-run`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "SUCCESS",
                    durationMs,
                    summary,
                    stepsCount: executionStepsCountRef.current
                  })
                });
              } catch {}
            }
            fetchPendingTasks();
            return;
          }
          if (msg.action.type === "FAIL") {
            setTaskState("FAILED");
            const errorText = msg.action.error || "Action execution failed";
            setLogs((prev) => [...prev, `Task Failed: ${errorText}`]);

            if (executingPendingTaskIdRef.current) {
              const durationMs = Date.now() - executionStartTimeRef.current;
              try {
                await fetch(`http://127.0.0.1:3001/pending-tasks/${executingPendingTaskIdRef.current}/record-run`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "FAILED",
                    durationMs,
                    error: errorText,
                    stepsCount: executionStepsCountRef.current
                  })
                });
              } catch {}
            }
            fetchPendingTasks();
            return;
          }

          let activeTabId = executionTabIdRef.current;
          if (!activeTabId) {
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            activeTabId = tab?.id || null;
          }

          if (activeTabId) {
            chrome.tabs.sendMessage(
              activeTabId,
              {
                type: "EXECUTE_ACTION",
                action: msg.action
              },
              (res) => {
                if (chrome.runtime.lastError) {
                  // Navigation, form submission or page reload closed the message channel
                  setLogs((prev) => [...prev, `Page updated / submitted. Capturing next page state...`]);
                  if (msg.taskId && activeTabId) {
                    captureTabObservationWithRetry(activeTabId, msg.taskId);
                  }
                  return;
                }

                if (res?.observation && msg.taskId) {
                  const nextObsMsg: ExtensionMessage = {
                    type: "OBSERVATION_CAPTURED",
                    taskId: msg.taskId,
                    observation: res.observation
                  };
                  sendExtensionMessage(nextObsMsg);
                  setLogs((prev) => [
                    ...prev,
                    `Page observed (${res.observation.interactiveNodes?.length || 0} interactive elements). Planning next step...`
                  ]);
                } else if (msg.taskId && activeTabId) {
                  captureTabObservationWithRetry(activeTabId, msg.taskId);
                }
              }
            );
          }
        }
      } catch {
        setLogs((prev) => [...prev, "Error parsing server message"]);
      }
    };

    ws.onclose = () => {
      // Reconnect handled on-demand
    };

    return ws;
  };

  const sendExtensionMessage = (msg: ExtensionMessage) => {
    const ws = setupSocket();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      ws.onopen = () => {
        ws.send(JSON.stringify(msg));
      };
    }
  };

  useEffect(() => {
    setupSocket();
    fetchPendingTasks();

    const handleRuntimeMessage = (message: any) => {
      if (message.type === "TRIGGER_DUE_TASK" && message.task) {
        setActiveTab("EXECUTE");
        handleExecutePendingTask(message.task);
      }
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    fetchPendingTasks();
  }, [searchQuery, statusFilter, priorityFilter, sortBy]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartTask = async (customGoal?: string, customTargetUrl?: string, pendingTaskId?: string) => {
    const taskGoal = customGoal || goal;
    if (!taskGoal.trim()) return;

    setLogs([]);
    setTaskState("PLANNING");
    setSecurityChallenge(null);
    setApprovalPrompt(null);
    setSuccessMessage(null);
    currentGoalRef.current = taskGoal;
    executingPendingTaskIdRef.current = pendingTaskId || null;
    executionStartTimeRef.current = Date.now();
    executionStepsCountRef.current = 0;

    try {
      const tabId = await openAndPrepareTab(customTargetUrl);
      executionTabIdRef.current = tabId;

      setLogs((prev) => [...prev, `Navigated to target portal. Initializing autonomous agent...`]);

      const res = await fetch("http://127.0.0.1:3001/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: taskGoal })
      });

      if (!res.ok) {
        throw new Error("Failed to start task on server");
      }

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
          `Page analyzed (${obs.interactiveNodes.length} interactive elements). Planning action sequence...`
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
    } catch {
      setLogs((prev) => [...prev, "Error: Could not connect to backend server. Make sure `pnpm dev` is running."]);
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
    setLogs((prev) => [...prev, approved ? "Action approved by user." : "Action rejected by user."]);
  };

  const handleResumeAfterChallenge = async () => {
    if (!taskId) return;
    setSecurityChallenge(null);
    setTaskState("PLANNING");
    setLogs((prev) => [...prev, "Verification resolved. Resuming automated workflow..."]);

    const resumeMsg: ExtensionMessage = {
      type: "SECURITY_CHALLENGE_RESOLVED",
      taskId
    };
    sendExtensionMessage(resumeMsg);

    let activeTabId = executionTabIdRef.current;
    if (!activeTabId) {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      activeTabId = tab?.id || null;
    }

    if (activeTabId) {
      setTimeout(() => {
        chrome.tabs.sendMessage(activeTabId!, { type: "CAPTURE_OBSERVATION" }, (obsRes) => {
          if (obsRes?.observation) {
            const nextObsMsg: ExtensionMessage = {
              type: "OBSERVATION_CAPTURED",
              taskId,
              observation: obsRes.observation
            };
            sendExtensionMessage(nextObsMsg);
          }
        });
      }, 500);
    }
  };

  const handleOpenEditTask = (task: PendingTaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title || "");
    setEditPriority(task.priority || "MEDIUM");
    setEditCategory(task.category || "GENERAL");
    setEditDueDate(task.dueDate || "");
    setEditNotes(task.notes || "");
    setEditPortalUrl(task.billerInfo?.portalUrl || task.targetUrl || "");
    setEditProvider(task.billerInfo?.providerName || "");
    setEditConsumerNo(task.billerInfo?.consumerNumber || "");
    setEditSubdivision(task.billerInfo?.subdivision || "");
    setEditFirstName(
      task.billerInfo?.firstName ||
      (task.billerInfo?.customerName ? task.billerInfo.customerName.split(" ")[0] : "")
    );
    setEditLastName(
      task.billerInfo?.lastName ||
      (task.billerInfo?.customerName ? task.billerInfo.customerName.split(" ").slice(1).join(" ") : "")
    );
    setEditPhone(task.billerInfo?.phoneNumber || "");
    setEditEmail(task.billerInfo?.emailAddress || "");
    setEditInstructions(task.billerInfo?.additionalInstructions || "");

    if (task.schedule && task.schedule.enabled) {
      setEditScheduleEnabled(true);
      setEditScheduleFreq(task.schedule.frequency || "MONTHLY");
      setEditScheduleTime(task.schedule.time || "09:30");
      setEditScheduleDayOfMonth(task.schedule.dayOfMonth ?? 5);
      setEditScheduleDayOfWeek(task.schedule.dayOfWeek ?? 1);
      setEditScheduleIntervalDays(task.schedule.intervalDays ?? 3);
      setEditScheduleAutoExecute(task.schedule.autoExecute !== false);
    } else {
      setEditScheduleEnabled(false);
      setEditScheduleFreq("MONTHLY");
      setEditScheduleTime("09:30");
      setEditScheduleDayOfMonth(5);
      setEditScheduleDayOfWeek(1);
      setEditScheduleIntervalDays(3);
      setEditScheduleAutoExecute(true);
    }
  };

  const handleSaveEditTask = async () => {
    if (!editingTask || !editTitle.trim()) return;

    try {
      const updatedFullName = [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(" ");
      const billerInfo = {
        providerName: editProvider.trim() || undefined,
        billType: editCategory,
        consumerNumber: editConsumerNo.trim() || undefined,
        subdivision: editSubdivision.trim() || undefined,
        portalUrl: editPortalUrl.trim() || undefined,
        firstName: editFirstName.trim() || undefined,
        lastName: editLastName.trim() || undefined,
        customerName: updatedFullName || undefined,
        phoneNumber: editPhone.trim() || undefined,
        emailAddress: editEmail.trim() || undefined,
        additionalInstructions: editInstructions.trim() || undefined
      };

      const schedule = editScheduleEnabled
        ? {
            enabled: true,
            frequency: editScheduleFreq,
            time: editScheduleTime,
            dayOfMonth: editScheduleFreq === "MONTHLY" ? Number(editScheduleDayOfMonth) : undefined,
            dayOfWeek: editScheduleFreq === "WEEKLY" ? Number(editScheduleDayOfWeek) : undefined,
            intervalDays: editScheduleFreq === "CUSTOM_DAYS" ? Number(editScheduleIntervalDays) : undefined,
            autoExecute: editScheduleAutoExecute
          }
        : {
            enabled: false,
            frequency: "ONCE" as ScheduleFrequency,
            autoExecute: false
          };

      await fetch(`http://127.0.0.1:3001/pending-tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          priority: editPriority,
          category: editCategory,
          dueDate: editDueDate || null,
          notes: editNotes.trim() || null,
          targetUrl: editPortalUrl.trim() || null,
          billerInfo,
          schedule
        })
      });

      if (editFirstName.trim()) localStorage.setItem("difm_user_first_name", editFirstName.trim());
      if (editLastName.trim()) localStorage.setItem("difm_user_last_name", editLastName.trim());
      if (updatedFullName) localStorage.setItem("difm_user_name", updatedFullName);
      if (editPhone.trim()) localStorage.setItem("difm_user_phone", editPhone.trim());
      if (editEmail.trim()) localStorage.setItem("difm_user_email", editEmail.trim());

      setEditingTask(null);
      fetchPendingTasks();
    } catch {
      // Ignored
    }
  };

  const handleCreatePendingTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const customerFullName = [billerFirstName.trim(), billerLastName.trim()].filter(Boolean).join(" ");
      const billerInfo = showBillerDetails
        ? {
            providerName: billerProvider.trim() || undefined,
            billType: billerType,
            consumerNumber: billerConsumerNo.trim() || undefined,
            subdivision: billerSubdivision.trim() || undefined,
            portalUrl: billerPortalUrl.trim() || undefined,
            firstName: billerFirstName.trim() || undefined,
            lastName: billerLastName.trim() || undefined,
            customerName: customerFullName || undefined,
            phoneNumber: billerPhone.trim() || undefined,
            emailAddress: billerEmail.trim() || undefined,
            additionalInstructions: billerInstructions.trim() || undefined
          }
        : undefined;

      const schedule = scheduleEnabled
        ? {
            enabled: true,
            frequency: scheduleFreq,
            time: scheduleTime,
            dayOfMonth: scheduleFreq === "MONTHLY" ? Number(scheduleDayOfMonth) : undefined,
            dayOfWeek: scheduleFreq === "WEEKLY" ? Number(scheduleDayOfWeek) : undefined,
            intervalDays: scheduleFreq === "CUSTOM_DAYS" ? Number(scheduleIntervalDays) : undefined,
            autoExecute: scheduleAutoExecute
          }
        : undefined;

      await fetch("http://127.0.0.1:3001/pending-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          category: billerType,
          dueDate: newTaskDueDate || undefined,
          notes: newTaskNotes.trim() || undefined,
          targetUrl: billerPortalUrl.trim() || tab?.url || undefined,
          schedule,
          billerInfo
        })
      });

      if (billerFirstName) localStorage.setItem("difm_user_first_name", billerFirstName);
      if (billerLastName) localStorage.setItem("difm_user_last_name", billerLastName);
      if (customerFullName) localStorage.setItem("difm_user_name", customerFullName);
      if (billerPhone) localStorage.setItem("difm_user_phone", billerPhone);
      if (billerEmail) localStorage.setItem("difm_user_email", billerEmail);

      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskNotes("");
      setBillerProvider("");
      setBillerConsumerNo("");
      setBillerSubdivision("");
      setBillerPortalUrl("");
      setBillerInstructions("");
      setShowBillerDetails(false);
      setShowScheduleDetails(false);
      setScheduleEnabled(false);
      setIsCreateOpen(false);
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
      const firstName = task.billerInfo.firstName || (task.billerInfo.customerName ? task.billerInfo.customerName.split(" ")[0] : billerFirstName);
      const lastName = task.billerInfo.lastName || (task.billerInfo.customerName ? task.billerInfo.customerName.split(" ").slice(1).join(" ") : billerLastName);
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || task.billerInfo.customerName || [billerFirstName, billerLastName].filter(Boolean).join(" ");
      const phone = task.billerInfo.phoneNumber || billerPhone;
      const email = task.billerInfo.emailAddress || billerEmail;

      if (firstName) parts.push(`User First Name: ${firstName}`);
      if (lastName) parts.push(`User Last Name: ${lastName}`);
      if (fullName) parts.push(`User Full Name: ${fullName}`);
      if (phone) parts.push(`Phone No: ${phone}`);
      if (email) parts.push(`Email: ${email}`);
      if (task.billerInfo.providerName) parts.push(`Site/Provider: ${task.billerInfo.providerName}`);
      if (task.billerInfo.consumerNumber) parts.push(`Account/Consumer ID: ${task.billerInfo.consumerNumber}`);
      if (task.billerInfo.subdivision) parts.push(`Circle/Subdivision: ${task.billerInfo.subdivision}`);
      if (task.billerInfo.additionalInstructions) parts.push(`Instructions: ${task.billerInfo.additionalInstructions}`);
      if (task.notes) parts.push(`Notes: ${task.notes}`);

      if (task.billerInfo.billType === "GENERAL" || task.billerInfo.billType === "FORM_FILL" || task.billerInfo.billType === "OTHER") {
        formulatedGoal = `Perform form task: "${task.title}". Fill in form fields with User Details: [${parts.join(", ")}]. Clear and override any demo or sample values with these user values.`;
      } else {
        formulatedGoal = `Pay ${task.billerInfo.billType.toLowerCase()} bill for ${
          task.billerInfo.providerName || task.title
        }. Details: ${parts.join(" | ")}. Stop and request user confirmation before final payment/card submission.`;
      }
    }

    setGoal(formulatedGoal);
    handleStartTask(formulatedGoal, targetUrl, task.id);
  };

  const handleCloneTask = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/pending-tasks/${id}/clone`, {
        method: "POST"
      });
      fetchPendingTasks();
    } catch {
      // Ignored
    }
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
    const nextStatus = task.status === "COMPLETED" ? (task.schedule?.enabled ? "SCHEDULED" : "PENDING") : "COMPLETED";
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

  const formatScheduleText = (task: PendingTaskItem): string => {
    if (!task.schedule || !task.schedule.enabled) return "";
    const timeStr = task.schedule.time ? ` @ ${task.schedule.time}` : "";
    const autoBadge = task.schedule.autoExecute ? "Auto-runs" : "Reminds";
    switch (task.schedule.frequency) {
      case "DAILY":
        return `${autoBadge} Daily${timeStr}`;
      case "WEEKLY": {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const d = days[task.schedule.dayOfWeek ?? 1];
        return `${autoBadge} Weekly on ${d}${timeStr}`;
      }
      case "MONTHLY":
        return `${autoBadge} Monthly on ${task.schedule.dayOfMonth || 1}th${timeStr}`;
      case "CUSTOM_DAYS":
        return `${autoBadge} Every ${task.schedule.intervalDays || 1}d${timeStr}`;
      case "ONCE":
      default:
        return `${autoBadge} Once${timeStr}`;
    }
  };

  const activeScheduledCount = pendingTasks.filter((t) => t.schedule?.enabled && t.status !== "COMPLETED").length;
  const activePendingCount = pendingTasks.filter((t) => t.status !== "COMPLETED").length;
  const dueSoonCount = pendingTasks.filter((t) => t.status === "DUE_SOON").length;

  return (
    <div class="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-3 sm:p-4 max-w-full selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Aceternity ambient glow backdrop */}
      <div class="ambient-glow" />

      {/* Header Section */}
      <header class="relative z-10 flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-glow-sm shrink-0">
            <SparkleIcon size={15} class="text-white" />
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <h1 class="text-xs sm:text-sm font-bold bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent truncate tracking-tight">
                Do It For Me
              </h1>
              <span class="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest shrink-0">
                Agent v2
              </span>
            </div>
            <p class="text-[10px] text-zinc-400 font-medium truncate">
              Autonomous Web Actions & Schedules
            </p>
          </div>
        </div>

        {/* Live Indicator */}
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900/90 border border-white/[0.08] text-[10px] text-zinc-400 shrink-0">
          <span
            class={`w-1.5 h-1.5 rounded-full ${
              taskState === "EXECUTING" || taskState === "PLANNING"
                ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                : taskState === "COMPLETED"
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                : "bg-emerald-500"
            }`}
          />
          <span class="font-mono text-[9px] uppercase tracking-wider text-zinc-300">
            {taskState || "READY"}
          </span>
        </div>
      </header>

      {/* Modern Segmented Tab Navigation */}
      <nav class="relative z-10 grid grid-cols-2 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/[0.08] mb-3.5 backdrop-blur-md">
        <button
          onClick={() => setActiveTab("EXECUTE")}
          class={`relative py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-200 ${
            activeTab === "EXECUTE"
              ? "bg-gradient-to-r from-indigo-500/20 via-indigo-600/20 to-violet-500/20 border border-indigo-500/40 text-indigo-200 shadow-glow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <LightningIcon size={14} class={activeTab === "EXECUTE" ? "text-indigo-400" : "text-zinc-400"} />
          <span>Execute Action</span>
        </button>

        <button
          onClick={() => setActiveTab("PENDING")}
          class={`relative py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-200 ${
            activeTab === "PENDING"
              ? "bg-gradient-to-r from-indigo-500/20 via-indigo-600/20 to-violet-500/20 border border-indigo-500/40 text-indigo-200 shadow-glow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <ListChecksIcon size={14} class={activeTab === "PENDING" ? "text-indigo-400" : "text-zinc-400"} />
          <span>Tasks & Schedules</span>
          {activePendingCount > 0 && (
            <span class="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono">
              {activePendingCount}
            </span>
          )}
        </button>
      </nav>

      {/* EXECUTE TAB VIEW */}
      {activeTab === "EXECUTE" && (
        <div class="relative z-10 flex-1 flex flex-col space-y-3 min-h-0 animate-fade-in">
          {/* Goal Input Glass Card */}
          <div class="glass-panel rounded-xl p-3.5 space-y-2.5 shadow-glass">
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <SparkleIcon size={13} class="text-indigo-400" />
                <span>What should the agent do?</span>
              </label>
              <span class="text-[10px] text-zinc-500">Autonomous workflow</span>
            </div>

            <textarea
              rows={3}
              placeholder="e.g., Go to CESC bill portal, fill account 102938492, verify amount, and prepare payment..."
              value={goal}
              onInput={(e) => setGoal((e.target as HTMLTextAreaElement).value)}
              class="w-full glass-input rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500/20 resize-none leading-relaxed"
            />

            {/* Quick Suggestion Pills */}
            <div class="flex flex-wrap gap-1.5 pt-0.5">
              {[
                "Autofill contact & feedback form",
                "Pay electricity bill on CESC",
                "Verify shopping cart & coupon",
                "Check broadband statement"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setGoal(suggestion)}
                  class="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-300 border border-white/[0.05] transition truncate max-w-full"
                >
                  + {suggestion}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleStartTask()}
              disabled={!goal.trim() || (taskState !== null && taskState !== "COMPLETED" && taskState !== "FAILED" && taskState !== "CANCELLED")}
              class="w-full shimmer-btn h-9 rounded-lg text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-glow-sm active:scale-[0.98] transition-all"
            >
              {taskState === "EXECUTING" || taskState === "PLANNING" ? (
                <>
                  <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Agent is executing...</span>
                </>
              ) : (
                <>
                  <PlayIcon size={13} class="text-white fill-current" />
                  <span>Execute Goal in Tab</span>
                </>
              )}
            </button>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div class="glass-panel bg-emerald-950/40 border-emerald-500/40 rounded-xl p-3.5 shadow-glow-emerald animate-scale-in">
              <div class="flex items-start gap-2.5">
                <CheckCircleIcon size={20} class="text-emerald-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xs font-bold text-emerald-300">{successMessage.title}</h3>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      class="text-zinc-400 hover:text-white p-0.5 transition"
                    >
                      <XIcon size={13} />
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
                      class="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded-md transition"
                    >
                      New Goal
                    </button>
                    <button
                      onClick={() => {
                        setSuccessMessage(null);
                        setActiveTab("PENDING");
                      }}
                      class="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-md border border-white/[0.08] transition"
                    >
                      View Tasks & Schedules
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Challenge / Human Takeover Alert */}
          {securityChallenge && (
            <div class="glass-panel bg-amber-950/40 border-amber-500/50 rounded-xl p-3.5 shadow-lg shadow-amber-950/40 animate-scale-in">
              <div class="flex items-start gap-2.5">
                <WarningCircleIcon size={20} class="text-amber-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <h3 class="text-xs font-bold text-amber-300">Human Verification Required</h3>
                  <p class="text-[11px] text-amber-100/90 mt-1 leading-relaxed">
                    {securityChallenge.description || "Please solve the security challenge (CAPTCHA / 2FA) in the browser tab."}
                  </p>
                  <div class="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={handleResumeAfterChallenge}
                      class="text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1 rounded-md transition inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <CheckCircleIcon size={12} />
                      <span>I Solved It, Continue</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sensitive Action User Approval Card */}
          {approvalPrompt && (
            <div class="glass-panel bg-indigo-950/50 border-indigo-500/50 rounded-xl p-3.5 shadow-glow-indigo animate-scale-in">
              <div class="flex items-start gap-2.5">
                <ShieldCheckIcon size={20} class="text-indigo-400 shrink-0 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <h3 class="text-xs font-bold text-indigo-200">Confirmation Required</h3>
                  <p class="text-xs text-zinc-200 mt-1 font-medium leading-relaxed">{approvalPrompt.summary}</p>
                  <p class="text-[11px] text-zinc-400 mt-0.5">{approvalPrompt.consequences}</p>
                  <div class="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleDecision(true)}
                      class="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1 rounded-md transition shadow-sm active:scale-95"
                    >
                      Approve & Continue
                    </button>
                    <button
                      onClick={() => handleDecision(false)}
                      class="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded-md border border-white/[0.08] transition active:scale-95"
                    >
                      Cancel Action
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Terminal & Logs Card */}
          <div class="glass-panel rounded-xl flex-1 flex flex-col min-h-[180px] overflow-hidden shadow-glass">
            <div class="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-zinc-950/80">
              <div class="flex items-center gap-2 text-zinc-400 text-[11px] font-semibold">
                <div class="flex gap-1">
                  <div class="w-2 h-2 rounded-full bg-rose-500/60" />
                  <div class="w-2 h-2 rounded-full bg-amber-500/60" />
                  <div class="w-2 h-2 rounded-full bg-emerald-500/60" />
                </div>
                <span class="ml-1 text-zinc-300">Execution Logs</span>
              </div>
              <div class="flex items-center gap-2">
                {logs.length > 0 && (
                  <button
                    onClick={() => setLogs([])}
                    class="text-[10px] text-zinc-400 hover:text-zinc-200 transition"
                  >
                    Clear
                  </button>
                )}
                <span class="text-[10px] text-zinc-400 font-mono">
                  {logs.length} events
                </span>
              </div>
            </div>

            <div
              ref={logContainerRef}
              class="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-zinc-950/90 text-zinc-300 select-text leading-relaxed"
            >
              {logs.length === 0 ? (
                <div class="h-full flex flex-col items-center justify-center text-zinc-400 text-center py-6 space-y-1">
                  <SparkleIcon size={18} class="text-zinc-400" />
                  <p class="text-xs">Agent is idle and ready.</p>
                  <p class="text-[10px]">Enter a prompt above and click Execute Goal.</p>
                </div>
              ) : (
                logs.map((log, index) => {
                  const isError = log.toLowerCase().includes("error") || log.toLowerCase().includes("failed");
                  const isSuccess = log.toLowerCase().includes("completed") || log.toLowerCase().includes("success");
                  const isAction = log.toLowerCase().includes("executing:") || log.toLowerCase().includes("action");
                  const isVerification = log.toLowerCase().includes("verification") || log.toLowerCase().includes("challenge");

                  return (
                    <div
                      key={index}
                      class={`flex items-start gap-2 py-0.5 transition ${
                        isError
                          ? "text-rose-400 bg-rose-950/20 px-1.5 rounded border border-rose-900/30"
                          : isSuccess
                          ? "text-emerald-400 bg-emerald-950/20 px-1.5 rounded border border-emerald-900/30"
                          : isVerification
                          ? "text-amber-300 bg-amber-950/20 px-1.5 rounded border border-amber-900/30"
                          : isAction
                          ? "text-indigo-300"
                          : "text-zinc-300"
                      }`}
                    >
                      <span class="text-zinc-400 select-none text-[10px] shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span class="break-all whitespace-pre-wrap flex-1">{log}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PENDING TASKS & SCHEDULER TAB VIEW */}
      {activeTab === "PENDING" && (
        <div class="relative z-10 flex-1 flex flex-col space-y-3 min-h-0 animate-fade-in">
          {/* Smart Metrics Bar */}
          <div class="grid grid-cols-3 gap-2">
            <div class="glass-card rounded-xl p-2.5 flex flex-col justify-between shadow-subtle">
              <span class="text-[10px] text-zinc-400 font-medium">Active Tasks</span>
              <span class="text-base font-bold text-zinc-100 font-mono mt-0.5">{activePendingCount}</span>
            </div>
            <div class="glass-card rounded-xl p-2.5 flex flex-col justify-between shadow-subtle">
              <span class="text-[10px] text-indigo-400 font-medium">Scheduled</span>
              <span class="text-base font-bold text-indigo-300 font-mono mt-0.5">{activeScheduledCount}</span>
            </div>
            <div class="glass-card rounded-xl p-2.5 flex flex-col justify-between shadow-subtle">
              <span class="text-[10px] text-amber-400 font-medium">Due Soon</span>
              <span class="text-base font-bold text-amber-300 font-mono mt-0.5">{dueSoonCount}</span>
            </div>
          </div>

          {/* Creation Section Toggle Button */}
          <div class="glass-panel rounded-xl overflow-hidden shadow-glass">
            <button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              class="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/[0.03] transition"
            >
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <PlusIcon size={12} />
                </div>
                <span>Create New Task or Recurring Schedule</span>
              </div>
              {isCreateOpen ? <CaretUpIcon size={13} /> : <CaretDownIcon size={13} />}
            </button>

            {/* Creation Form Accordion Content */}
            {isCreateOpen && (
              <div class="p-3.5 pt-1 border-t border-white/[0.06] space-y-3 text-xs animate-slide-down">
                {/* Title & Priority Row */}
                <div class="space-y-1">
                  <label class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Task Title <span class="text-rose-400">*</span>
                  </label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Pay Monthly Electricity Bill, Submit Contact Form"
                      value={newTaskTitle}
                      onInput={(e) => setNewTaskTitle((e.target as HTMLInputElement).value)}
                      class="flex-1 glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-100 placeholder-zinc-500"
                    />
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority((e.target as HTMLSelectElement).value as TaskPriority)}
                      class="glass-input rounded-lg px-2 h-8 text-[11px] text-zinc-200 font-medium shrink-0"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>

                {/* Due Date & Action Buttons Drawer Controls */}
                <div class="grid grid-cols-3 gap-2 items-center">
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-zinc-400 block font-medium">Due Date</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onInput={(e) => setNewTaskDueDate((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-zinc-400 block font-medium">Recurrence</label>
                    <button
                      type="button"
                      onClick={() => setShowScheduleDetails(!showScheduleDetails)}
                      class={`w-full h-8 text-xs px-2 rounded-lg border inline-flex items-center justify-center gap-1.5 transition ${
                        showScheduleDetails || scheduleEnabled
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-glow-sm"
                          : "glass-input text-zinc-300 hover:text-white"
                      }`}
                    >
                      <RepeatIcon size={12} class="shrink-0" />
                      <span class="truncate">{scheduleEnabled ? "Configured" : "+ Schedule"}</span>
                    </button>
                  </div>
                  <div class="space-y-0.5">
                    <label class="text-[10px] text-zinc-400 block font-medium">Profile Info</label>
                    <button
                      type="button"
                      onClick={() => setShowBillerDetails(!showBillerDetails)}
                      class={`w-full h-8 text-xs px-2 rounded-lg border inline-flex items-center justify-center gap-1.5 transition ${
                        showBillerDetails
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-glow-sm"
                          : "glass-input text-zinc-300 hover:text-white"
                      }`}
                    >
                      <UserIcon size={12} class="shrink-0" />
                      <span class="truncate">+ Profile</span>
                    </button>
                  </div>
                </div>

                {/* Schedule Drawer */}
                {showScheduleDetails && (
                  <div class="glass-panel rounded-xl p-3 space-y-2.5 border-indigo-500/30 animate-fade-in">
                    <div class="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                      <div class="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                        <CalendarIcon size={13} />
                        <span>Recurring Automation & Alarms</span>
                      </div>
                      <label class="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scheduleEnabled}
                          onChange={(e) => setScheduleEnabled((e.target as HTMLInputElement).checked)}
                          class="rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Enable Schedule</span>
                      </label>
                    </div>

                    {scheduleEnabled && (
                      <>
                        <div class="grid grid-cols-2 gap-2">
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Frequency</label>
                            <select
                              value={scheduleFreq}
                              onChange={(e) => setScheduleFreq((e.target as HTMLSelectElement).value as ScheduleFrequency)}
                              class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                            >
                              <option value="ONCE">One-Time Run</option>
                              <option value="DAILY">Daily</option>
                              <option value="WEEKLY">Weekly</option>
                              <option value="MONTHLY">Monthly</option>
                              <option value="CUSTOM_DAYS">Custom Interval</option>
                            </select>
                          </div>
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Trigger Time</label>
                            <input
                              type="time"
                              value={scheduleTime}
                              onInput={(e) => setScheduleTime((e.target as HTMLInputElement).value)}
                              class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                            />
                          </div>
                        </div>

                        {scheduleFreq === "MONTHLY" && (
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Day of Month (1 - 31)</label>
                            <input
                              type="number"
                              min={1}
                              max={31}
                              value={scheduleDayOfMonth}
                              onInput={(e) => setScheduleDayOfMonth(Number((e.target as HTMLInputElement).value))}
                              class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                            />
                          </div>
                        )}

                        {scheduleFreq === "WEEKLY" && (
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Day of Week</label>
                            <select
                              value={scheduleDayOfWeek}
                              onChange={(e) => setScheduleDayOfWeek(Number((e.target as HTMLSelectElement).value))}
                              class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                            >
                              <option value={1}>Monday</option>
                              <option value={2}>Tuesday</option>
                              <option value={3}>Wednesday</option>
                              <option value={4}>Thursday</option>
                              <option value={5}>Friday</option>
                              <option value={6}>Saturday</option>
                              <option value={0}>Sunday</option>
                            </select>
                          </div>
                        )}

                        {scheduleFreq === "CUSTOM_DAYS" && (
                          <div>
                            <label class="text-[10px] text-zinc-400 block mb-1">Repeat Every N Days</label>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={scheduleIntervalDays}
                              onInput={(e) => setScheduleIntervalDays(Number((e.target as HTMLInputElement).value))}
                              class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                            />
                          </div>
                        )}

                        <div class="bg-indigo-950/30 p-2 rounded-lg border border-indigo-500/20 flex items-center justify-between">
                          <div class="flex flex-col">
                            <span class="text-[11px] font-semibold text-indigo-300">Auto-Execute with Agent</span>
                            <span class="text-[10px] text-zinc-400">Launch autonomous browser run at scheduled time</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={scheduleAutoExecute}
                            onChange={(e) => setScheduleAutoExecute((e.target as HTMLInputElement).checked)}
                            class="rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Profile Details Drawer */}
                {showBillerDetails && (
                  <div class="glass-panel rounded-xl p-3 space-y-2.5 border-indigo-500/30 animate-fade-in">
                    <div class="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5 pb-1 border-b border-white/[0.06]">
                      <UserIcon size={13} />
                      <span>User Profile & Autofill Credentials</span>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Category</label>
                        <select
                          value={billerType}
                          onChange={(e) => setBillerType((e.target as HTMLSelectElement).value as TaskCategory)}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        >
                          <option value="GENERAL">General Web</option>
                          <option value="FORM_FILL">Form Autofill</option>
                          <option value="ELECTRICITY">Electricity</option>
                          <option value="WATER">Water</option>
                          <option value="GAS">Gas</option>
                          <option value="INTERNET">Internet</option>
                          <option value="MOBILE">Mobile</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                          <option value="SHOPPING">Shopping</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Site / Provider</label>
                        <input
                          type="text"
                          placeholder="e.g. Google Demo, CESC"
                          value={billerProvider}
                          onInput={(e) => setBillerProvider((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="text-[10px] text-zinc-400 block mb-1">Target Webpage / Form URL</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={billerPortalUrl}
                        onInput={(e) => setBillerPortalUrl((e.target as HTMLInputElement).value)}
                        class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                      />
                    </div>

                    {/* Separate First Name & Last Name */}
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">First Name</label>
                        <input
                          type="text"
                          placeholder="e.g. John"
                          value={billerFirstName}
                          onInput={(e) => setBillerFirstName((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Last Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Doe"
                          value={billerLastName}
                          onInput={(e) => setBillerLastName((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="e.g. 8888989261"
                          value={billerPhone}
                          onInput={(e) => setBillerPhone((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="e.g. demo56@gmail.com"
                          value={billerEmail}
                          onInput={(e) => setBillerEmail((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Account / ID No</label>
                        <input
                          type="text"
                          placeholder="e.g. 102938492"
                          value={billerConsumerNo}
                          onInput={(e) => setBillerConsumerNo((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Subdivision / Area</label>
                        <input
                          type="text"
                          placeholder="e.g. North Zone"
                          value={billerSubdivision}
                          onInput={(e) => setBillerSubdivision((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="text-[10px] text-zinc-400 block mb-1">Action Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. Fill form and submit"
                        value={billerInstructions}
                        onInput={(e) => setBillerInstructions((e.target as HTMLInputElement).value)}
                        class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200 placeholder-zinc-500"
                      />
                    </div>
                  </div>
                )}

                {/* Notes Textarea */}
                <textarea
                  placeholder="Notes, reminders, order IDs, or general instructions..."
                  value={newTaskNotes}
                  onInput={(e) => setNewTaskNotes((e.target as HTMLTextAreaElement).value)}
                  rows={2}
                  class="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 resize-none leading-relaxed"
                />

                <button
                  onClick={handleCreatePendingTask}
                  disabled={!newTaskTitle.trim()}
                  class="w-full shimmer-btn h-8 rounded-lg text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 shadow-glow-sm active:scale-[0.98] transition"
                >
                  <PlusIcon size={13} />
                  <span>Save Task & Schedule</span>
                </button>
              </div>
            )}
          </div>

          {/* Search, Filter & Sort Controls */}
          <div class="space-y-2">
            <div class="relative">
              <input
                type="text"
                placeholder="Search tasks, notes, or target URLs..."
                value={searchQuery}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                class="w-full glass-input rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-100 placeholder-zinc-500"
              />
              <MagnifyingGlassIcon size={13} class="absolute left-2.5 top-2.5 text-zinc-500 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  class="absolute right-2.5 top-2 text-zinc-400 hover:text-white p-0.5"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>

            <div class="flex items-center justify-between gap-1.5 text-[10px]">
              <div class="flex gap-1 overflow-x-auto py-0.5 scrollbar-none">
                {["ALL", "PENDING", "SCHEDULED", "DUE_SOON", "COMPLETED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    class={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition ${
                      statusFilter === st
                        ? "bg-indigo-600 text-white shadow-sm border border-indigo-500/50"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.05]"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.replace("_", " ")}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as any)}
                class="bg-zinc-900 border border-white/[0.08] text-[10px] text-zinc-300 rounded-md px-1.5 py-0.5 shrink-0"
              >
                <option value="created">Created</option>
                <option value="dueDate">Due Date</option>
                <option value="nextRun">Next Run</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {/* Task List Section */}
          <div class="flex-1 space-y-2.5 overflow-y-auto pr-0.5 min-h-[160px]">
            {pendingTasks.length === 0 ? (
              <div class="glass-card rounded-xl p-8 text-center text-zinc-500 space-y-1">
                <ListChecksIcon size={24} class="mx-auto text-zinc-600 mb-1" />
                <p class="text-xs text-zinc-400">
                  {searchQuery ? "No matching tasks found." : "No tasks or schedules created yet."}
                </p>
                <p class="text-[11px] text-zinc-500">
                  Click "+ Create New Task" above to automate forms, recurring bills, or reminders.
                </p>
              </div>
            ) : (
              pendingTasks.map((t) => (
                <div
                  key={t.id}
                  class={`glass-card rounded-xl p-3 transition-all duration-200 relative group shadow-subtle ${
                    t.status === "COMPLETED"
                      ? "opacity-60 border-white/[0.04]"
                      : t.status === "DUE_SOON"
                      ? "border-amber-500/40 bg-amber-950/10 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]"
                      : t.schedule?.enabled
                      ? "border-indigo-500/30 bg-indigo-950/10"
                      : "border-white/[0.07]"
                  }`}
                >
                  {/* Card Header Row */}
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.status === "COMPLETED"}
                        onChange={() => handleToggleTaskStatus(t)}
                        class="rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span
                        class={`text-xs font-semibold truncate ${
                          t.status === "COMPLETED" ? "line-through text-zinc-500" : "text-zinc-100"
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>

                    {/* Action Toolbar */}
                    <div class="flex items-center gap-1 shrink-0">
                      {t.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleExecutePendingTask(t)}
                          class="shimmer-btn text-white text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-sm active:scale-95"
                          title="Execute action with Agent"
                        >
                          <PlayIcon size={9} class="fill-current" />
                          <span>Run</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditTask(t)}
                        class="text-zinc-400 hover:text-indigo-300 p-1 rounded hover:bg-white/[0.05] transition"
                        title="Edit Task & Schedule"
                      >
                        <PencilSimpleIcon size={12} />
                      </button>
                      <button
                        onClick={() => handleCloneTask(t.id)}
                        class="text-zinc-400 hover:text-indigo-300 p-1 rounded hover:bg-white/[0.05] transition"
                        title="Duplicate Task"
                      >
                        <CopyIcon size={12} />
                      </button>
                      <button
                        onClick={() => handleDeletePendingTask(t.id)}
                        class="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition"
                        title="Delete Task"
                      >
                        <TrashIcon size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div class="flex flex-wrap items-center gap-1.5 text-[10px] mb-2">
                    {/* Priority Badge */}
                    <span
                      class={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] border ${
                        t.priority === "HIGH"
                          ? "bg-rose-950/40 text-rose-300 border-rose-800/60"
                          : t.priority === "LOW"
                          ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                          : "bg-amber-950/40 text-amber-300 border-amber-800/60"
                      }`}
                    >
                      {t.priority}
                    </span>

                    {/* Schedule Badge */}
                    {t.schedule && t.schedule.enabled && (
                      <span class="bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded inline-flex items-center gap-1 font-medium">
                        {t.schedule.autoExecute ? (
                          <LightningIcon size={10} class="text-amber-400 shrink-0" />
                        ) : (
                          <ClockIcon size={10} class="text-indigo-400 shrink-0" />
                        )}
                        <span>{formatScheduleText(t)}</span>
                      </span>
                    )}

                    {/* Next Run Time */}
                    {t.schedule?.nextRunAt && (
                      <span class="text-indigo-300/80 text-[10px] font-mono">
                        Next: {new Date(t.schedule.nextRunAt).toLocaleDateString([], { month: "short", day: "numeric" })} {new Date(t.schedule.nextRunAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}

                    {/* Due Date */}
                    {t.dueDate && (
                      <span class="text-zinc-400 inline-flex items-center gap-1">
                        <ClockIcon size={10} />
                        Due: <strong class={t.status === "DUE_SOON" ? "text-amber-400" : "text-zinc-300"}>{new Date(t.dueDate).toLocaleDateString()}</strong>
                      </span>
                    )}
                  </div>

                  {/* Profile / Target Details Summary */}
                  {t.billerInfo && (
                    <div class="bg-zinc-950/60 border border-white/[0.05] rounded-lg p-2 mb-2 text-[11px] space-y-1">
                      <div class="flex items-center justify-between text-indigo-300 font-medium">
                        <span class="inline-flex items-center gap-1 truncate">
                          <BuildingsIcon size={11} class="text-indigo-400 shrink-0" />
                          {t.billerInfo.providerName || t.billerInfo.billType}
                        </span>
                        {t.billerInfo.consumerNumber && (
                          <span class="text-[10px] text-zinc-400 font-mono">#{t.billerInfo.consumerNumber}</span>
                        )}
                      </div>
                      {t.billerInfo.portalUrl && (
                        <div class="truncate text-[10px] text-indigo-400 flex items-center gap-1">
                          <LinkSimpleIcon size={10} class="shrink-0" />
                          <a href={t.billerInfo.portalUrl} target="_blank" rel="noreferrer" class="underline truncate">
                            {t.billerInfo.portalUrl}
                          </a>
                        </div>
                      )}
                      {(t.billerInfo.customerName || t.billerInfo.firstName || t.billerInfo.lastName || t.billerInfo.phoneNumber || t.billerInfo.emailAddress) && (
                        <div class="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-zinc-400 pt-1 border-t border-white/[0.04]">
                          {(t.billerInfo.firstName || t.billerInfo.lastName || t.billerInfo.customerName) && (
                            <span class="inline-flex items-center gap-1 text-zinc-200">
                              <UserIcon size={10} class="text-indigo-400" />
                              {[t.billerInfo.firstName, t.billerInfo.lastName].filter(Boolean).join(" ") || t.billerInfo.customerName}
                            </span>
                          )}
                          {t.billerInfo.phoneNumber && (
                            <span class="inline-flex items-center gap-1 text-zinc-300">
                              <PhoneIcon size={10} class="text-indigo-400" />
                              {t.billerInfo.phoneNumber}
                            </span>
                          )}
                          {t.billerInfo.emailAddress && (
                            <span class="inline-flex items-center gap-1 text-zinc-300 truncate max-w-[130px]">
                              <EnvelopeSimpleIcon size={10} class="text-indigo-400" />
                              {t.billerInfo.emailAddress}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes Block */}
                  <div class="bg-zinc-950/40 border border-white/[0.04] rounded-lg p-2 text-xs mb-1.5">
                    <div class="flex items-center justify-between mb-0.5">
                      <span class="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <TagIcon size={10} />
                        Notes & Context
                      </span>
                      {editingNotesId !== t.id && (
                        <button
                          onClick={() => {
                            setEditingNotesId(t.id);
                            setCurrentNoteText(t.notes || "");
                          }}
                          class="text-[9px] text-zinc-400 hover:text-indigo-300 inline-flex items-center gap-0.5 transition"
                        >
                          <PencilSimpleIcon size={10} />
                          Edit
                        </button>
                      )}
                    </div>

                    {editingNotesId === t.id ? (
                      <div class="space-y-1.5 mt-1">
                        <textarea
                          value={currentNoteText}
                          onInput={(e) => setCurrentNoteText((e.target as HTMLTextAreaElement).value)}
                          rows={2}
                          class="w-full glass-input rounded-md p-1.5 text-xs text-zinc-200 resize-none leading-relaxed"
                        />
                        <div class="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            class="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotes(t.id)}
                            class="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-medium"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p class="text-[11px] text-zinc-400 italic">
                        {t.notes || "No notes attached."}
                      </p>
                    )}
                  </div>

                  {/* Run History Accordion */}
                  {Array.isArray(t.executionHistory) && t.executionHistory.length > 0 && (
                    <div class="pt-1 border-t border-white/[0.04]">
                      <button
                        onClick={() =>
                          setExpandedHistoryTaskId(expandedHistoryTaskId === t.id ? null : t.id)
                        }
                        class="w-full text-left text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center justify-between py-0.5 transition"
                      >
                        <span class="inline-flex items-center gap-1 font-medium">
                          <ClockIcon size={10} />
                          Run History ({t.executionHistory.length} executions)
                        </span>
                        {expandedHistoryTaskId === t.id ? <CaretUpIcon size={10} /> : <CaretDownIcon size={10} />}
                      </button>

                      {expandedHistoryTaskId === t.id && (
                        <div class="mt-1.5 space-y-1 pl-1.5 border-l-2 border-indigo-500/40 animate-fade-in">
                          {t.executionHistory.map((run) => (
                            <div key={run.id} class="text-[10px] bg-zinc-950/80 p-2 rounded-md space-y-0.5 border border-white/[0.04]">
                              <div class="flex items-center justify-between">
                                <span
                                  class={`font-bold ${
                                    run.status === "SUCCESS"
                                      ? "text-emerald-400"
                                      : run.status === "FAILED"
                                      ? "text-rose-400"
                                      : "text-zinc-400"
                                  }`}
                                >
                                  {run.status === "SUCCESS" ? "Succeeded" : run.status === "FAILED" ? "Failed" : "Cancelled"}
                                </span>
                                <span class="text-zinc-500 font-mono">{new Date(run.runAt).toLocaleTimeString()}</span>
                              </div>
                              <p class="text-zinc-300 leading-tight">{run.summary || run.error}</p>
                              <div class="text-[9px] text-zinc-500 flex gap-2 pt-0.5">
                                <span>Duration: {(run.durationMs / 1000).toFixed(1)}s</span>
                                <span>Steps: {run.stepsCount}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Full Task & Schedule Edit Modal Dialog */}
      {editingTask && (
        <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
          <div class="glass-panel rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-indigo-500/30 animate-scale-in">
            {/* Modal Header */}
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-zinc-950/90">
              <div class="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <PencilSimpleIcon size={15} />
                <span>Edit Task, Profile & Schedule</span>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                class="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05] transition"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div class="p-4 overflow-y-auto space-y-3.5 text-xs bg-zinc-950/70">
              {/* Task Title */}
              <div>
                <label class="text-[10px] text-zinc-400 block mb-1 font-semibold uppercase tracking-wider">
                  Task Title <span class="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onInput={(e) => setEditTitle((e.target as HTMLInputElement).value)}
                  class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-100 font-medium"
                />
              </div>

              {/* Priority, Category & Due Date */}
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="text-[10px] text-zinc-400 block mb-1 font-medium truncate">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority((e.target as HTMLSelectElement).value as TaskPriority)}
                    class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label class="text-[10px] text-zinc-400 block mb-1 font-medium truncate">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory((e.target as HTMLSelectElement).value as TaskCategory)}
                    class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                  >
                    <option value="GENERAL">General Web</option>
                    <option value="FORM_FILL">Form Autofill</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="WATER">Water</option>
                    <option value="GAS">Gas</option>
                    <option value="INTERNET">Internet</option>
                    <option value="MOBILE">Mobile</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="SHOPPING">Shopping</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label class="text-[10px] text-zinc-400 block mb-1 font-medium truncate">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onInput={(e) => setEditDueDate((e.target as HTMLInputElement).value)}
                    class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                  />
                </div>
              </div>

              {/* Target Webpage / Portal URL */}
              <div>
                <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Target URL / Portal Link</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editPortalUrl}
                  onInput={(e) => setEditPortalUrl((e.target as HTMLInputElement).value)}
                  class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                />
              </div>

              {/* User Profile & Form Details Group */}
              <div class="glass-panel rounded-xl p-3 space-y-2.5 border-white/[0.08]">
                <div class="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5 pb-1 border-b border-white/[0.06]">
                  <UserIcon size={13} />
                  <span>User Profile & Biller Info</span>
                </div>

                {/* First Name & Last Name (Separate inputs) */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">First Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={editFirstName}
                      onInput={(e) => setEditFirstName((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={editLastName}
                      onInput={(e) => setEditLastName((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                {/* Phone & Email */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 8888989261"
                      value={editPhone}
                      onInput={(e) => setEditPhone((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. demo56@gmail.com"
                      value={editEmail}
                      onInput={(e) => setEditEmail((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                {/* Site/Provider & Account No */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Site / Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. Google Demo, CESC"
                      value={editProvider}
                      onInput={(e) => setEditProvider((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Account / Consumer ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 102938492"
                      value={editConsumerNo}
                      onInput={(e) => setEditConsumerNo((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                {/* Subdivision & Custom Instructions */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Subdivision / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. North Zone"
                      value={editSubdivision}
                      onInput={(e) => setEditSubdivision((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Action Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Fill form and submit"
                      value={editInstructions}
                      onInput={(e) => setEditInstructions((e.target as HTMLInputElement).value)}
                      class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Configuration Group */}
              <div class="glass-panel rounded-xl p-3 space-y-2.5 border-white/[0.08]">
                <div class="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                  <div class="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                    <RepeatIcon size={13} />
                    <span>Scheduling & Auto-Execution</span>
                  </div>
                  <label class="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editScheduleEnabled}
                      onChange={(e) => setEditScheduleEnabled((e.target as HTMLInputElement).checked)}
                      class="rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Enable Schedule</span>
                  </label>
                </div>

                {editScheduleEnabled && (
                  <>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Frequency</label>
                        <select
                          value={editScheduleFreq}
                          onChange={(e) => setEditScheduleFreq((e.target as HTMLSelectElement).value as ScheduleFrequency)}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        >
                          <option value="ONCE">One-Time Run</option>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="CUSTOM_DAYS">Custom Interval</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Trigger Time</label>
                        <input
                          type="time"
                          value={editScheduleTime}
                          onInput={(e) => setEditScheduleTime((e.target as HTMLInputElement).value)}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    </div>

                    {editScheduleFreq === "MONTHLY" && (
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Day of Month (1 - 31)</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={editScheduleDayOfMonth}
                          onInput={(e) => setEditScheduleDayOfMonth(Number((e.target as HTMLInputElement).value))}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    )}

                    {editScheduleFreq === "WEEKLY" && (
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Day of Week</label>
                        <select
                          value={editScheduleDayOfWeek}
                          onChange={(e) => setEditScheduleDayOfWeek(Number((e.target as HTMLSelectElement).value))}
                          class="w-full glass-input rounded-lg px-2 h-8 text-xs text-zinc-200"
                        >
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                          <option value={0}>Sunday</option>
                        </select>
                      </div>
                    )}

                    {editScheduleFreq === "CUSTOM_DAYS" && (
                      <div>
                        <label class="text-[10px] text-zinc-400 block mb-1">Repeat Every N Days</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={editScheduleIntervalDays}
                          onInput={(e) => setEditScheduleIntervalDays(Number((e.target as HTMLInputElement).value))}
                          class="w-full glass-input rounded-lg px-2.5 h-8 text-xs text-zinc-200"
                        />
                      </div>
                    )}

                    <div class="bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-500/20 flex items-center justify-between">
                      <div class="flex flex-col">
                        <span class="text-[11px] font-semibold text-indigo-300">Auto-Execute with Agent</span>
                        <span class="text-[10px] text-zinc-400">Launch browser execution automatically</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editScheduleAutoExecute}
                        onChange={(e) => setEditScheduleAutoExecute((e.target as HTMLInputElement).checked)}
                        class="rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              <div>
                <label class="text-[10px] text-zinc-400 block mb-1 font-medium">Notes & Context</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onInput={(e) => setEditNotes((e.target as HTMLTextAreaElement).value)}
                  placeholder="Additional instructions or notes..."
                  class="w-full glass-input rounded-lg p-2 text-xs text-zinc-200 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.08] bg-zinc-950/90">
              <button
                onClick={() => setEditingTask(null)}
                class="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditTask}
                disabled={!editTitle.trim()}
                class="shimmer-btn px-4 py-1.5 rounded-lg text-xs text-white font-semibold shadow-glow-sm active:scale-95 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
