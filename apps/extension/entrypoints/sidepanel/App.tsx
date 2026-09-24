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

  // Editing Task Modal & State
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
                    summary: "Task execution halted with error",
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
  }, [searchQuery, statusFilter, priorityFilter, sortBy]);

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
      executionStartTimeRef.current = Date.now();
      executionStepsCountRef.current = 0;

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

      const profileParts: string[] = [];
      if (billerCustomerName) profileParts.push(`User Name: ${billerCustomerName}`);
      if (billerPhone) profileParts.push(`Phone No: ${billerPhone}`);
      if (billerEmail) profileParts.push(`Email: ${billerEmail}`);

      let fullGoalPrompt = goalToRun;
      if (profileParts.length > 0 && !goalToRun.includes("User Name:") && !goalToRun.includes("User Details:")) {
        fullGoalPrompt = `${goalToRun} (User Profile for autofill: ${profileParts.join(", ")})`;
      }

      const res = await fetch("http://127.0.0.1:3001/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: fullGoalPrompt })
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
    } catch {
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

  const handleResumeAfterChallenge = async () => {
    if (!taskId) return;
    setSecurityChallenge(null);
    setTaskState("PLANNING");
    setLogs((prev) => [...prev, "Security challenge resolved. Resuming automated workflow..."]);

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
        return `${autoBadge} Monthly on the ${task.schedule.dayOfMonth || 1}th${timeStr}`;
      case "CUSTOM_DAYS":
        return `${autoBadge} Every ${task.schedule.intervalDays || 1} days${timeStr}`;
      case "ONCE":
      default:
        return `${autoBadge} Once${timeStr}`;
    }
  };

  return (
    <div class="p-3.5 flex flex-col h-screen max-w-md mx-auto">
      <header class="border-b border-slate-800/80 pb-2.5 mb-2.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <SparkleIcon size={18} class="text-indigo-400 shrink-0" />
          <div class="flex flex-col">
            <h1 class="text-sm font-bold text-indigo-400 leading-tight whitespace-nowrap">Do It For Me</h1>
            <span class="text-[10px] text-slate-500 font-mono leading-none">Autonomous Action & Scheduler</span>
          </div>
        </div>
      </header>

      {/* Segmented Tab Navigation */}
      <div class="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 mb-3 text-xs">
        <button
          onClick={() => setActiveTab("EXECUTE")}
          class={`py-1.5 px-2 rounded-md font-medium inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap ${
            activeTab === "EXECUTE"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <LightningIcon size={14} class="shrink-0" />
          <span>Action</span>
        </button>
        <button
          onClick={() => setActiveTab("PENDING")}
          class={`py-1.5 px-2 rounded-md font-medium inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap ${
            activeTab === "PENDING"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ListChecksIcon size={14} class="shrink-0" />
          <span>Task Hub</span>
          {pendingTasks.filter((t) => t.status !== "COMPLETED").length > 0 && (
            <span class="bg-indigo-950 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-indigo-700 leading-none">
              {pendingTasks.filter((t) => t.status !== "COMPLETED").length}
            </span>
          )}
        </button>
      </div>

      {/* Dynamic Notifications Banner */}
      {(remindersDue.length > 0 || (scheduledReady && scheduledReady.length > 0)) && (
        <div class="bg-amber-950/40 border border-amber-500/40 rounded-lg p-2.5 mb-3 space-y-1.5 animate-pulse">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <ClockIcon size={15} class="text-amber-400 shrink-0" />
            <span>Scheduled & Due Tasks Ready:</span>
          </div>
          <div class="text-[11px] text-slate-300 space-y-1">
            {[...remindersDue, ...(scheduledReady || [])].slice(0, 3).map((t) => (
              <div key={t.id} class="flex items-center justify-between bg-amber-950/30 p-1 rounded">
                <span class="truncate max-w-[200px]">• {t.title}</span>
                <button
                  onClick={() => handleExecutePendingTask(t)}
                  class="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 shrink-0"
                >
                  <PlayIcon size={10} />
                  <span>Execute Now</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "EXECUTE" && (
        <>
          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Outcome Goal
            </label>
            <div class="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. submit the form or Pay electricity bill"
                value={goal}
                onInput={(e) => setGoal((e.target as HTMLInputElement).value)}
                disabled={taskState !== null && taskState !== "COMPLETED" && taskState !== "CANCELLED"}
                class="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50 text-slate-100"
              />
              <button
                onClick={() => handleStartTask()}
                disabled={!goal.trim() || (taskState !== null && taskState !== "COMPLETED" && taskState !== "CANCELLED")}
                class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-medium px-4 py-2 rounded text-sm transition inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm"
              >
                <PlayIcon size={14} class="shrink-0" />
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
                      View Tasks & Schedules
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {securityChallenge && (
            <div class="bg-indigo-950/70 border border-indigo-500/60 rounded-lg p-3 mb-4 shadow-lg shadow-indigo-950/50">
              <div class="flex items-center gap-2 mb-1.5">
                <ShieldCheckIcon size={18} class="text-indigo-400 shrink-0" />
                <h3 class="text-xs font-bold text-indigo-300">Security Verification Required</h3>
              </div>
              <p class="text-xs text-slate-200 mb-1 leading-relaxed">{securityChallenge.description}</p>
              <p class="text-[11px] text-indigo-200/80 mb-3">
                Please complete verification on the active webpage. The agent is paused and ready to resume.
              </p>
              <button
                onClick={handleResumeAfterChallenge}
                class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded transition inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CheckCircleIcon size={14} class="shrink-0" />
                <span>I've Solved It — Resume Action</span>
              </button>
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
        <div class="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-3.5 pr-0.5">
          {/* Create Task & Scheduler Card */}
          <div class="bg-slate-800/80 border border-slate-700 rounded-lg p-3 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <PlusIcon size={14} class="shrink-0" />
                <span>New Task & Schedule</span>
              </div>
              <div class="flex items-center gap-1.5">
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority((e.target as HTMLSelectElement).value as TaskPriority)}
                  class="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                </select>
              </div>
            </div>

            <input
              type="text"
              placeholder="Task name (e.g. Pay CESC Bill, Submit Monthly Form)"
              value={newTaskTitle}
              onInput={(e) => setNewTaskTitle((e.target as HTMLInputElement).value)}
              class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />

            <div class="flex gap-2 items-center">
              <input
                type="date"
                title="Due Date"
                value={newTaskDueDate}
                onInput={(e) => setNewTaskDueDate((e.target as HTMLInputElement).value)}
                class="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowScheduleDetails(!showScheduleDetails)}
                class={`h-8 text-xs px-2.5 rounded border inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap transition ${
                  showScheduleDetails || scheduleEnabled
                    ? "bg-indigo-900/60 border-indigo-500 text-indigo-200"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                <RepeatIcon size={13} class="shrink-0" />
                <span>{scheduleEnabled ? "Scheduled" : "+ Schedule"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBillerDetails(!showBillerDetails)}
                class={`h-8 text-xs px-2.5 rounded border inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap transition ${
                  showBillerDetails
                    ? "bg-indigo-900/60 border-indigo-500 text-indigo-200"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                <UserIcon size={13} class="shrink-0" />
                <span>+ Details</span>
              </button>
            </div>

            {/* Recurring Schedule Builder Drawer */}
            {showScheduleDetails && (
              <div class="bg-slate-900/95 border border-indigo-900/70 rounded p-2.5 space-y-2.5 text-xs animate-in">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div class="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                    <CalendarIcon size={14} />
                    <span>Recurring Schedule & Auto-Execution</span>
                  </div>
                  <label class="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled((e.target as HTMLInputElement).checked)}
                      class="rounded bg-slate-950 border-slate-700 text-indigo-600"
                    />
                    <span>Enable Schedule</span>
                  </label>
                </div>

                {scheduleEnabled && (
                  <>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Frequency</label>
                        <select
                          value={scheduleFreq}
                          onChange={(e) => setScheduleFreq((e.target as HTMLSelectElement).value as ScheduleFrequency)}
                          class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none"
                        >
                          <option value="ONCE">One-Time Run</option>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="CUSTOM_DAYS">Custom Interval</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Trigger Time</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onInput={(e) => setScheduleTime((e.target as HTMLInputElement).value)}
                          class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    {scheduleFreq === "MONTHLY" && (
                      <div>
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Day of Month (1 - 31)</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={scheduleDayOfMonth}
                          onInput={(e) => setScheduleDayOfMonth(Number((e.target as HTMLInputElement).value))}
                          class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                    )}

                    {scheduleFreq === "WEEKLY" && (
                      <div>
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Day of Week</label>
                        <select
                          value={scheduleDayOfWeek}
                          onChange={(e) => setScheduleDayOfWeek(Number((e.target as HTMLSelectElement).value))}
                          class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none"
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
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Repeat Every N Days</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={scheduleIntervalDays}
                          onInput={(e) => setScheduleIntervalDays(Number((e.target as HTMLInputElement).value))}
                          class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                    )}

                    <div class="bg-indigo-950/40 p-2 rounded border border-indigo-900/50 flex items-center justify-between">
                      <div class="flex flex-col">
                        <span class="text-[11px] font-semibold text-indigo-300">Auto-Execute with Agent</span>
                        <span class="text-[10px] text-slate-400">Launch agent automatically at scheduled time</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={scheduleAutoExecute}
                        onChange={(e) => setScheduleAutoExecute((e.target as HTMLInputElement).checked)}
                        class="rounded bg-slate-950 border-slate-700 text-indigo-600"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Biller & Form Details Drawer */}
            {showBillerDetails && (
              <div class="bg-slate-900/95 border border-indigo-900/60 rounded p-2.5 space-y-2.5 text-xs">
                <div class="text-[11px] font-semibold text-indigo-300 flex items-center gap-2">
                  <UserIcon size={14} class="shrink-0" />
                  <span>User Profile & Form Details</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Action Category</label>
                    <select
                      value={billerType}
                      onChange={(e) => setBillerType((e.target as HTMLSelectElement).value as TaskCategory)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="GENERAL">General Web Action</option>
                      <option value="FORM_FILL">Form Autofill / Contact</option>
                      <option value="ELECTRICITY">Electricity Bill</option>
                      <option value="WATER">Water Bill</option>
                      <option value="GAS">Gas Bill</option>
                      <option value="INTERNET">Internet / Broadband</option>
                      <option value="MOBILE">Mobile / Recharge</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="SHOPPING">Shopping / Price Check</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Site / Service Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Google Demo, CESC"
                      value={billerProvider}
                      onInput={(e) => setBillerProvider((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Target Webpage / Form URL</label>
                  <input
                    type="url"
                    placeholder="https://... or portal URL"
                    value={billerPortalUrl}
                    onInput={(e) => setBillerPortalUrl((e.target as HTMLInputElement).value)}
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Account / ID No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 102938492"
                      value={billerConsumerNo}
                      onInput={(e) => setBillerConsumerNo((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Subdivision / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. North Zone"
                      value={billerSubdivision}
                      onInput={(e) => setBillerSubdivision((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">First Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={billerFirstName}
                      onInput={(e) => setBillerFirstName((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={billerLastName}
                      onInput={(e) => setBillerLastName((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 8888989261"
                      value={billerPhone}
                      onInput={(e) => setBillerPhone((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. demo56@gmail.com"
                      value={billerEmail}
                      onInput={(e) => setBillerEmail((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Action Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Fill form and submit"
                    value={billerInstructions}
                    onInput={(e) => setBillerInstructions((e.target as HTMLInputElement).value)}
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <textarea
              placeholder="Notes, reminders, order IDs, or general instructions..."
              value={newTaskNotes}
              onInput={(e) => setNewTaskNotes((e.target as HTMLTextAreaElement).value)}
              rows={2}
              class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
            />

            <button
              onClick={handleCreatePendingTask}
              disabled={!newTaskTitle.trim()}
              class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs font-semibold h-8 rounded transition inline-flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
            >
              <PlusIcon size={14} class="shrink-0" />
              <span>Save & Schedule Task</span>
            </button>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div class="space-y-2">
            <div class="relative">
              <input
                type="text"
                placeholder="Search tasks, notes, or URLs..."
                value={searchQuery}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                class="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <MagnifyingGlassIcon size={14} class="absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  class="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>

            <div class="flex items-center justify-between gap-1 text-[10px]">
              <div class="flex gap-1 overflow-x-auto py-0.5 scrollbar-none">
                {["ALL", "PENDING", "SCHEDULED", "DUE_SOON", "COMPLETED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    class={`px-2 py-0.5 rounded font-medium whitespace-nowrap transition ${
                      statusFilter === st
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.replace("_", " ")}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as any)}
                class="bg-slate-900 border border-slate-800 text-[10px] text-slate-400 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="created">Sort: Created</option>
                <option value="dueDate">Sort: Due Date</option>
                <option value="nextRun">Sort: Next Run</option>
                <option value="priority">Sort: Priority</option>
              </select>
            </div>
          </div>

          {/* Task List Section */}
          <div class="space-y-2.5">
            <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span class="flex items-center gap-1.5">
                <ListChecksIcon size={14} />
                Tasks & Schedules ({pendingTasks.length})
              </span>
            </div>

            {pendingTasks.length === 0 ? (
              <div class="text-xs text-slate-500 text-center py-8">
                {searchQuery ? "No matching tasks found." : "No tasks created yet. Add a task above to automate or schedule it."}
              </div>
            ) : (
              pendingTasks.map((t) => (
                <div
                  key={t.id}
                  class={`border rounded-lg p-3 transition ${
                    t.status === "COMPLETED"
                      ? "bg-slate-900/40 border-slate-800 opacity-60"
                      : t.status === "DUE_SOON"
                      ? "bg-amber-950/20 border-amber-600/40"
                      : t.schedule?.enabled
                      ? "bg-indigo-950/20 border-indigo-700/50"
                      : "bg-slate-800/40 border-slate-700"
                  }`}
                >
                  {/* Task Card Header */}
                  <div class="flex items-start justify-between gap-2 mb-1.5">
                    <div class="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.status === "COMPLETED"}
                        onChange={() => handleToggleTaskStatus(t)}
                        class="rounded bg-slate-900 border-slate-700 text-indigo-600"
                      />
                      <span
                        class={`text-xs font-medium truncate ${
                          t.status === "COMPLETED" ? "line-through text-slate-500" : "text-slate-200"
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                      {t.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleExecutePendingTask(t)}
                          class="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium px-2 py-0.5 rounded transition inline-flex items-center gap-1"
                          title="Execute now"
                        >
                          <PlayIcon size={10} />
                          Execute
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditTask(t)}
                        class="text-slate-400 hover:text-indigo-300 text-xs p-1"
                        title="Edit Task & Schedule"
                      >
                        <PencilSimpleIcon size={12} />
                      </button>
                      <button
                        onClick={() => handleCloneTask(t.id)}
                        class="text-slate-400 hover:text-indigo-300 text-xs p-1"
                        title="Duplicate Task"
                      >
                        <CopyIcon size={12} />
                      </button>
                      <button
                        onClick={() => handleDeletePendingTask(t.id)}
                        class="text-slate-500 hover:text-rose-400 text-xs p-1"
                        title="Delete Task"
                      >
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Badges & Meta Row */}
                  <div class="flex flex-wrap items-center gap-1.5 text-[10px] mb-2">
                    {/* Priority Badge */}
                    <span
                      class={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                        t.priority === "HIGH"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : t.priority === "LOW"
                          ? "bg-slate-800 text-slate-400 border border-slate-700"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {t.priority}
                    </span>

                    {/* Schedule Badge */}
                    {t.schedule && t.schedule.enabled && (
                      <span class="bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        {t.schedule.autoExecute ? (
                          <LightningIcon size={11} class="text-amber-400 shrink-0" />
                        ) : (
                          <ClockIcon size={11} class="text-indigo-400 shrink-0" />
                        )}
                        <span>{formatScheduleText(t)}</span>
                      </span>
                    )}

                    {/* Next Run Time */}
                    {t.schedule?.nextRunAt && (
                      <span class="text-indigo-300/90 text-[10px]">
                        Next: {new Date(t.schedule.nextRunAt).toLocaleString()}
                      </span>
                    )}

                    {/* Due Date */}
                    {t.dueDate && (
                      <span class="text-slate-400 inline-flex items-center gap-1">
                        <ClockIcon size={10} />
                        Due: <strong class={t.status === "DUE_SOON" ? "text-amber-400" : "text-slate-300"}>{new Date(t.dueDate).toLocaleDateString()}</strong>
                      </span>
                    )}
                  </div>

                  {/* Biller / Form Details Summary */}
                  {t.billerInfo && (
                    <div class="bg-indigo-950/40 border border-indigo-900/50 rounded p-2 mb-1.5 text-[11px] space-y-1.5">
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
                      {(t.billerInfo.customerName || t.billerInfo.firstName || t.billerInfo.lastName || t.billerInfo.phoneNumber || t.billerInfo.emailAddress) && (
                        <div class="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-slate-300 pt-1 border-t border-indigo-900/40">
                          {(t.billerInfo.firstName || t.billerInfo.lastName || t.billerInfo.customerName) && (
                            <span class="inline-flex items-center gap-1 text-slate-200">
                              <UserIcon size={11} class="text-indigo-400" />
                              {[t.billerInfo.firstName, t.billerInfo.lastName].filter(Boolean).join(" ") || t.billerInfo.customerName}
                            </span>
                          )}
                          {t.billerInfo.phoneNumber && (
                            <span class="inline-flex items-center gap-1 text-slate-300">
                              <PhoneIcon size={11} class="text-indigo-400" />
                              {t.billerInfo.phoneNumber}
                            </span>
                          )}
                          {t.billerInfo.emailAddress && (
                            <span class="inline-flex items-center gap-1 text-slate-300 truncate max-w-[140px]">
                              <EnvelopeSimpleIcon size={11} class="text-indigo-400" />
                              {t.billerInfo.emailAddress}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes / Context */}
                  <div class="bg-slate-900/60 border border-slate-800/80 rounded p-2 text-xs mb-1.5">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                        <TagIcon size={11} />
                        Notes & Context
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
                        {t.notes || "No notes attached."}
                      </p>
                    )}
                  </div>

                  {/* Execution Run History Accordion */}
                  {Array.isArray(t.executionHistory) && t.executionHistory.length > 0 && (
                    <div class="pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() =>
                          setExpandedHistoryTaskId(expandedHistoryTaskId === t.id ? null : t.id)
                        }
                        class="w-full text-left text-[10px] text-slate-400 hover:text-slate-200 flex items-center justify-between py-0.5"
                      >
                        <span class="inline-flex items-center gap-1 font-medium">
                          <ClockIcon size={11} />
                          Run History ({t.executionHistory.length} runs)
                        </span>
                        {expandedHistoryTaskId === t.id ? <CaretUpIcon size={11} /> : <CaretDownIcon size={11} />}
                      </button>

                      {expandedHistoryTaskId === t.id && (
                        <div class="mt-1.5 space-y-1 pl-1 border-l-2 border-slate-700">
                          {t.executionHistory.map((run) => (
                            <div key={run.id} class="text-[10px] bg-slate-950/60 p-1.5 rounded space-y-0.5">
                              <div class="flex items-center justify-between">
                                <span
                                  class={`font-bold ${
                                    run.status === "SUCCESS"
                                      ? "text-emerald-400"
                                      : run.status === "FAILED"
                                      ? "text-rose-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {run.status === "SUCCESS" ? "✓ Succeeded" : run.status === "FAILED" ? "✕ Failed" : "Cancelled"}
                                </span>
                                <span class="text-slate-500">{new Date(run.runAt).toLocaleTimeString()}</span>
                              </div>
                              <p class="text-slate-300 leading-tight">{run.summary || run.error}</p>
                              <div class="text-[9px] text-slate-500 flex gap-2">
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
        <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div class="bg-slate-900 border border-indigo-700/60 rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in">
            {/* Modal Header */}
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
              <div class="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
                <PencilSimpleIcon size={16} />
                <span>Edit Task, Profile & Schedule</span>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                class="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <XIcon size={15} />
              </button>
            </div>

            {/* Modal Body - Scrollable Form */}
            <div class="p-4 overflow-y-auto space-y-3.5 text-xs">
              {/* Task Title */}
              <div>
                <label class="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
                  Task Title <span class="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onInput={(e) => setEditTitle((e.target as HTMLInputElement).value)}
                  class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Priority, Category & Due Date */}
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority((e.target as HTMLSelectElement).value as TaskPriority)}
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory((e.target as HTMLSelectElement).value as TaskCategory)}
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
                  <label class="text-[10px] text-slate-400 block mb-1 font-medium truncate">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onInput={(e) => setEditDueDate((e.target as HTMLInputElement).value)}
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Target Webpage / Portal URL */}
              <div>
                <label class="text-[10px] text-slate-400 block mb-1 font-medium">Target URL / Portal Link</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editPortalUrl}
                  onInput={(e) => setEditPortalUrl((e.target as HTMLInputElement).value)}
                  class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* User Profile & Form Details Group */}
              <div class="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2.5">
                <div class="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
                  <UserIcon size={13} />
                  <span>User Profile & Biller Info</span>
                </div>

                {/* First Name & Last Name (Separate inputs) */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium">First Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={editFirstName}
                      onInput={(e) => setEditFirstName((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={editLastName}
                      onInput={(e) => setEditLastName((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Phone & Email */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 8888989261"
                      value={editPhone}
                      onInput={(e) => setEditPhone((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. demo56@gmail.com"
                      value={editEmail}
                      onInput={(e) => setEditEmail((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Site/Provider & Account No */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium">Site / Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. Google Demo, CESC"
                      value={editProvider}
                      onInput={(e) => setEditProvider((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium">Account / Consumer ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 102938492"
                      value={editConsumerNo}
                      onInput={(e) => setEditConsumerNo((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Subdivision & Custom Instructions */}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium">Subdivision / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. North Zone"
                      value={editSubdivision}
                      onInput={(e) => setEditSubdivision((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400 block mb-1 font-medium">Action Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Fill form and submit"
                      value={editInstructions}
                      onInput={(e) => setEditInstructions((e.target as HTMLInputElement).value)}
                      class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Configuration Group */}
              <div class="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div class="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                    <RepeatIcon size={13} />
                    <span>Scheduling & Auto-Execution</span>
                  </div>
                  <label class="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editScheduleEnabled}
                      onChange={(e) => setEditScheduleEnabled((e.target as HTMLInputElement).checked)}
                      class="rounded bg-slate-950 border-slate-700 text-indigo-600"
                    />
                    <span>Enable Schedule</span>
                  </label>
                </div>

                {editScheduleEnabled && (
                  <>
                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Frequency</label>
                        <select
                          value={editScheduleFreq}
                          onChange={(e) => setEditScheduleFreq((e.target as HTMLSelectElement).value as ScheduleFrequency)}
                          class="w-full bg-slate-900 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="ONCE">One-Time Run</option>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="CUSTOM_DAYS">Custom Interval</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Trigger Time</label>
                        <input
                          type="time"
                          value={editScheduleTime}
                          onInput={(e) => setEditScheduleTime((e.target as HTMLInputElement).value)}
                          class="w-full bg-slate-900 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {editScheduleFreq === "MONTHLY" && (
                      <div>
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Day of Month (1 - 31)</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={editScheduleDayOfMonth}
                          onInput={(e) => setEditScheduleDayOfMonth(Number((e.target as HTMLInputElement).value))}
                          class="w-full bg-slate-900 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    {editScheduleFreq === "WEEKLY" && (
                      <div>
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Day of Week</label>
                        <select
                          value={editScheduleDayOfWeek}
                          onChange={(e) => setEditScheduleDayOfWeek(Number((e.target as HTMLSelectElement).value))}
                          class="w-full bg-slate-900 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
                        <label class="text-[10px] text-slate-400 block mb-1 font-medium">Repeat Every N Days</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={editScheduleIntervalDays}
                          onInput={(e) => setEditScheduleIntervalDays(Number((e.target as HTMLInputElement).value))}
                          class="w-full bg-slate-900 border border-slate-700 rounded px-2 h-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    <div class="bg-indigo-950/40 p-2 rounded border border-indigo-900/50 flex items-center justify-between">
                      <div class="flex flex-col">
                        <span class="text-[11px] font-semibold text-indigo-300">Auto-Execute with Agent</span>
                        <span class="text-[10px] text-slate-400">Launch browser execution automatically</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editScheduleAutoExecute}
                        onChange={(e) => setEditScheduleAutoExecute((e.target as HTMLInputElement).checked)}
                        class="rounded bg-slate-950 border-slate-700 text-indigo-600"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              <div>
                <label class="text-[10px] text-slate-400 block mb-1 font-medium">Notes & Context</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onInput={(e) => setEditNotes((e.target as HTMLTextAreaElement).value)}
                  placeholder="Additional instructions or notes..."
                  class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/80">
              <button
                onClick={() => setEditingTask(null)}
                class="px-3 py-1.5 rounded text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditTask}
                disabled={!editTitle.trim()}
                class="px-4 py-1.5 rounded text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold transition inline-flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircleIcon size={13} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


