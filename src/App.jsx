import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Mobile-specific imports - BACK TO ORIGINAL
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';

const LS_KEYS = {
  TODOS: "focus_todos_v2",
  HISTORY: "focus_history_v2",
  SETTINGS: "focus_settings_v2",
};

function formatTime(s) {
  if (s < 0) s = 0;
  const hours = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");

  // Show hours only if > 0 for cleaner display
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/* --- WebAudio chime (pleasant triangle + decay) --- */
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // first tone
    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = 880; // A5
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.35, now + 0.01);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    o1.connect(g1).connect(ctx.destination);
    o1.start(now);
    o1.stop(now + 1.25);

    // pleasant lower harmonic
    const o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = 440; // A4
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.18, now + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    o2.connect(g2).connect(ctx.destination);
    o2.start(now + 0.02);
    o2.stop(now + 1.4);
  } catch (e) {
    console.warn("AudioContext error", e);
  }
}

/* --- Main component --- */
export default function App() {
  /* persisted settings */
  const savedSettings = (() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS)) || null;
    } catch {
      return null;
    }
  })();

  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);

  // settings - add hours support
  const [hours, setHours] = useState(savedSettings?.hours ?? 0);
  const [minutes, setMinutes] = useState(savedSettings?.minutes ?? 25);
  const [seconds, setSeconds] = useState(savedSettings?.seconds ?? 0);
  const [sessionName, setSessionName] = useState(savedSettings?.sessionName ?? "");

  // timer runtime
  const [running, setRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState((savedSettings?.hours ?? 0) * 3600 + (savedSettings?.minutes ?? 25) * 60 + (savedSettings?.seconds ?? 0));
  const [remaining, setRemaining] = useState(totalSeconds);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // mode: 'configure' or 'run'
  const [mode, setMode] = useState("configure");

  // session-specific todos
  const [sessionTodos, setSessionTodos] = useState(savedSettings?.sessionTodos || []);
  const [newSessionTodo, setNewSessionTodo] = useState("");

  // general todos & history
  const [todos, setTodos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEYS.TODOS)) || [];
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEYS.HISTORY)) || [];
    } catch {
      return [];
    }
  });

  // selected history item for details view
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const todoRef = useRef(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const sessionNameRef = useRef(sessionName);
  const sessionTodosRef = useRef(sessionTodos);

  // stroke / circle geometry
  const R = 46;
  const CIRC = 2 * Math.PI * R;

  // Mobile setup effect - BACK TO ORIGINAL WITH SAFE WEB HANDLING
  useEffect(() => {
    try {
      setIsMobile(Capacitor.isNativePlatform());

      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({ style: 'dark' }); // Dark status bar content (black text)
        StatusBar.setBackgroundColor({ color: '#ffffff' }); // White background
        StatusBar.setOverlaysWebView({ overlay: false });
      }
    } catch (error) {
      // Running on web - set mobile to false
      setIsMobile(false);
    }
  }, []);

  // Haptic feedback function - SAFE FOR WEB
  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: 'medium' });
      }
    } catch (error) {
      // Silently fail on web
    }
  };

  // Update the refs when values change
  useEffect(() => {
    sessionNameRef.current = sessionName;
  }, [sessionName]);

  useEffect(() => {
    sessionTodosRef.current = sessionTodos;
  }, [sessionTodos]);

  /* sync totalSeconds when hours/minutes/seconds change in configure mode */
  useEffect(() => {
    const t = Math.max(0, Math.floor(hours) * 3600 + Math.floor(minutes) * 60 + Math.max(0, Math.floor(seconds)));
    setTotalSeconds(t);
    if (!running) {
      setRemaining(t);
      setSessionCompleted(false);
    }
  }, [hours, minutes, seconds, running]);

  /* persist todos & history */
  useEffect(() => {
    localStorage.setItem(LS_KEYS.TODOS, JSON.stringify(todos));
  }, [todos]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  /* persist settings including session todos and hours */
  useEffect(() => {
    const s = { hours, minutes, seconds, sessionName, sessionTodos };
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(s));
  }, [hours, minutes, seconds, sessionName, sessionTodos]);

  /* tick effect - FIXED FOR BOTH WEB AND MOBILE */
  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1 && !sessionCompleted) {
          // Session finished
          clearInterval(intervalRef.current);
          setRunning(false);

          // Save to history
          pushHistory(totalSeconds, sessionNameRef.current, sessionTodosRef.current);

          // Set completed state - works for both web and mobile
          setSessionCompleted(true);

          try {
            // vibrate + chime
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          } catch {}
          playChime();

          return 0;
        }
        return r > 0 ? r - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running, totalSeconds, sessionCompleted]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalRef.current);
    };
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    function onKey(e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleStartPause();
      } else if (e.key === "r" || e.key === "R") {
        handleReset();
      } else if (e.key === "c" || e.key === "C") {
        setMode((m) => (m === "configure" ? "run" : "configure"));
      } else if (e.key === "Escape") {
        setSelectedHistoryItem(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remaining]);

  // FIXED: Increased history limit to allow more sessions
  function pushHistory(seconds, name = "", sessionTodosList = []) {
    const completedTodos = sessionTodosList.filter(todo => todo.done).length;
    const totalTodos = sessionTodosList.length;
    const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

    const entry = {
      id: Date.now(),
      seconds,
      name: name.trim() || "Untitled Session",
      sessionTodos: sessionTodosList,
      completedTodos,
      totalTodos,
      completionRate,
      at: new Date().toISOString()
    };
    setHistory((h) => {
      const next = [entry, ...h].slice(0, 100); // INCREASED: Can store more sessions
      return next;
    });
  }

  // Helper function to start a completely new session
  function startNewSession() {
    triggerHaptic();
    setSessionCompleted(false);
    setRemaining(totalSeconds);
    setSessionTodos([]); // Clear session todos for new session
    setRunning(true);
  }

  // Helper function to repeat the same session
  function repeatSession() {
    triggerHaptic();
    setSessionCompleted(false);
    setRemaining(totalSeconds);
    // Keep session todos but reset their completion status
    setSessionTodos(prev => prev.map(todo => ({ ...todo, done: false })));
    setRunning(true);
  }

  /* controls with haptic feedback - IMPROVED */
  function handleStartPause() {
    triggerHaptic();

    if (remaining <= 0 && sessionCompleted) {
      // Reset timer if session was completed
      setRemaining(totalSeconds);
      setSessionCompleted(false);
      // Clear session todos when starting a new session
      setSessionTodos([]);
    }
    // if configure open, switch to run
    if (mode === "configure") setMode("run");
    setRunning((r) => !r);
  }

  function handleReset() {
    triggerHaptic();

    setRunning(false);
    setRemaining(totalSeconds);
    setSessionCompleted(false);
    // DON'T clear session todos on reset - let user decide
  }

  function quickAddFive() {
    triggerHaptic();

    setRemaining((r) => r + 5 * 60);
    setTotalSeconds((t) => t + 5 * 60);
  }

  /* session todos */
  function addSessionTodo() {
    const text = newSessionTodo.trim();
    if (!text) return;
    const item = { id: Date.now(), text, done: false };
    setSessionTodos((arr) => [...arr, item]);
    setNewSessionTodo("");
  }

  function toggleSessionTodo(id) {
    triggerHaptic();
    setSessionTodos((arr) => arr.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }

  function deleteSessionTodo(id) {
    setSessionTodos((arr) => arr.filter((it) => it.id !== id));
  }

  /* general todos */
  function addTodo(text) {
    const t = (text ?? todoRef.current?.value ?? "").trim();
    if (!t) return;
    const item = { id: Date.now(), text: t, done: false };
    setTodos((arr) => [item, ...arr]);
    if (todoRef.current) todoRef.current.value = "";
  }

  function toggleTodo(id) {
    triggerHaptic();
    setTodos((arr) => arr.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }

  function deleteTodo(id) {
    setTodos((arr) => arr.filter((it) => it.id !== id));
  }

  /* UI helpers */
  const progress = totalSeconds ? (1 - remaining / totalSeconds) * 100 : 0;
  const dashOffset = ((100 - progress) / 100) * CIRC;

  // Calculate combined todos for display (session todos first, then general todos)
  const allDisplayTodos = [
    ...sessionTodos.map(todo => ({ ...todo, isSessionTodo: true })),
    ...todos.map(todo => ({ ...todo, isSessionTodo: false }))
  ];

  // Helper function to format duration for display in history
  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /* fullscreen */
  function enterFullScreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  }

  /* Session History Detail Modal */
  const HistoryDetailModal = (
    <AnimatePresence>
      {selectedHistoryItem && (
        <motion.div
          key="history-detail-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
            onClick={() => setSelectedHistoryItem(null)}
          />
          {/* modal */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative w-full max-w-2xl mx-4 bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-2xl border border-gray-200/30 max-h-[80vh] overflow-y-auto"
            style={{
              marginTop: isMobile ? 'env(safe-area-inset-top)' : '0',
              marginBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{selectedHistoryItem.name}</h3>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="px-3 py-2 rounded-lg border text-md min-h-[44px]"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="text-sm opacity-70">Duration</div>
                  <div className="font-medium">{formatDuration(selectedHistoryItem.seconds)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">Completed</div>
                  <div className="font-medium">{new Date(selectedHistoryItem.at).toLocaleString()}</div>
                </div>
              </div>

              {selectedHistoryItem.sessionTodos && selectedHistoryItem.sessionTodos.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium">Session Tasks</h4>
                    <div className="text-sm opacity-70">
                      {selectedHistoryItem.completedTodos} of {selectedHistoryItem.totalTodos} completed
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm opacity-70 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(selectedHistoryItem.completionRate)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedHistoryItem.completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {selectedHistoryItem.sessionTodos.map((todo) => (
                      <li key={todo.id} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          todo.done
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {todo.done && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm ${todo.done ? 'line-through opacity-60' : ''}`}>
                          {todo.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-8 opacity-60">
                  <div className="text-sm">No tasks were set for this session</div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* Configure modal content */
  const ConfigureModal = (
    <AnimatePresence>
      {mode === "configure" && (
        <motion.div
          key="config-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center"
        >
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
            onClick={() => {
              // close on backdrop click
              setMode("run");
            }}
          />
          {/* modal */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative w-full max-w-4xl mx-4 bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-2xl border border-gray-200/30 max-h-[90vh] overflow-y-auto"
            style={{
              marginTop: isMobile ? 'env(safe-area-inset-top)' : '0',
              marginBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Configure Timer</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMode("run");
                  }}
                  className="px-4 py-2 rounded-lg border text-md min-h-[44px]"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    // reset to defaults
                    setHours(0);
                    setMinutes(25);
                    setSeconds(0);
                    setSessionName("");
                    setSessionTodos([]);
                  }}
                  className="px-4 py-2 rounded-lg border text-md min-h-[44px]"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium opacity-70 mb-2">Session Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Deep Work, Study Session..."
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full px-3 py-3 rounded-lg border bg-transparent text-md min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium opacity-70 mb-2">Duration</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={hours}
                        onChange={(e) => setHours(Number(e.target.value || 0))}
                        className="w-16 px-2 py-3 rounded-lg border bg-transparent text-md text-center min-h-[44px]"
                        placeholder="0"
                      />
                      <span className="text-sm opacity-70">hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={minutes}
                        onChange={(e) => setMinutes(Number(e.target.value || 0))}
                        className="w-16 px-2 py-3 rounded-lg border bg-transparent text-md text-center min-h-[44px]"
                        placeholder="25"
                      />
                      <span className="text-sm opacity-70">min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={seconds}
                        onChange={(e) => setSeconds(Number(e.target.value || 0))}
                        className="w-16 px-2 py-3 rounded-lg border bg-transparent text-md text-center min-h-[44px]"
                        placeholder="0"
                      />
                      <span className="text-sm opacity-70">sec</span>
                    </div>
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    Total: {formatDuration(hours * 3600 + minutes * 60 + seconds)}
                  </div>
                </div>

                <div className="text-xs opacity-70 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <strong>Shortcuts:</strong> Space (Start/Pause) • R (Reset) • C (Configure) • Esc (Close modals)
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium opacity-70 mb-2">Session Tasks</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Add a task for this session..."
                      value={newSessionTodo}
                      onChange={(e) => setNewSessionTodo(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addSessionTodo(); }}
                      className="flex-1 px-3 py-3 rounded-lg border bg-transparent text-sm min-h-[44px]"
                    />
                    <button
                      onClick={addSessionTodo}
                      className="px-4 py-3 rounded-lg border text-sm min-h-[44px]"
                    >
                      Add
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {sessionTodos.length === 0 ? (
                      <div className="text-sm opacity-60 text-center py-4">
                        No tasks for this session yet
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {sessionTodos.map((todo) => (
                          <li key={todo.id} className="flex items-center justify-between gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg min-h-[44px]">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={todo.done}
                                onChange={() => toggleSessionTodo(todo.id)}
                                className="rounded min-w-[20px] min-h-[20px]"
                              />
                              <span className={`text-sm ${todo.done ? "line-through opacity-60" : ""}`}>
                                {todo.text}
                              </span>
                            </div>
                            <button
                              onClick={() => deleteSessionTodo(todo.id)}
                              className="text-xs opacity-70 hover:opacity-100 px-2 py-1 min-h-[32px]"
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="text-xs opacity-70 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <strong>Tip:</strong> Session tasks will appear in the Todo section during your session so you can check them off. They'll be automatically archived when the timer ends.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* --- Main JSX - RESTORED TO ORIGINAL LAYOUT --- */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 flex flex-col">
      {/* Main Content - RESTORED */}
      <div className={`flex-1 p-2 sm:p-4 flex items-center justify-center ${
        isMobile ? 'pt-12 pb-35' : 'pb-35 sm:pb-20'
      }`}>
        <div className="w-full max-w-7xl grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Timer Card - RESTORED */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 dark:bg-black/40 backdrop-blur-sm rounded-2xl px-4 sm:px-6 py-4 sm:py-6 shadow-lg border border-gray-200/30 order-1 xl:order-1"
          >
            <div className="flex flex-col items-center justify-between">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center select-none">
                TIMORA
                <span className="text-xs tracking-tight bg-emerald-600/30 text-emerald-400 border border-emerald-400 px-1 rounded ml-2">
                  v2.1
                </span>
              </h2>
              <div className="flex justify-center gap-2 mt-3 sm:mt-4 flex-wrap">
                <button
                  onClick={() => setMode("configure")}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-md rounded-lg bg-transparent border border-gray-200/40 hover:scale-105 transition-transform min-h-[44px]"
                >
                  Configure
                </button>
                <button
                  onClick={() => enterFullScreen()}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-md rounded-lg bg-transparent border border-gray-200/40 hover:scale-105 transition-transform min-h-[44px]"
                >
                  Fullscreen
                </button>
              </div>
              {sessionName && (
                <div className="mt-2 text-sm opacity-70 text-center px-2">
                  {sessionName}
                </div>
              )}
              {sessionTodos.length > 0 && (
                <div className="mt-1 text-xs opacity-60 text-center">
                  {sessionTodos.filter(t => t.done).length} / {sessionTodos.length} session tasks completed
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-4 sm:gap-6 mt-4 sm:mt-8 mb-4 sm:mb-8">
              {/* circular timer - Responsive sizing */}
              <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 relative select-none">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <defs>
                    <linearGradient id="g1" x1="0%" x2="100%">
                      <stop offset="0%" stopColor="#111827" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#111827" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* background disc */}
                  <circle cx="60" cy="60" r="50" stroke="rgba(0,0,0,0.06)" strokeWidth="6" fill="url(#g1)" />

                  {/* progress ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r={R}
                    strokeWidth="6"
                    stroke="currentColor"
                    strokeDasharray={CIRC}
                    strokeDashoffset={dashOffset}
                    fill="none"
                    transform="rotate(-90 60 60)"
                    className="text-gray-800/70 dark:text-gray-50 transition-[stroke-dashoffset] duration-500"
                  />

                  {/* timer text - Responsive font size */}
                  <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fontSize="16" fill="currentColor" className="sm:text-lg select-none">
                    {formatTime(remaining)}
                  </text>
                </svg>
              </div>

              {/* controls - Better mobile layout */}
              <div className="flex-1 w-full">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
                  <button
                    onClick={handleStartPause}
                    className={`px-4 sm:px-6 py-3 sm:py-3 rounded-xl font-semibold shadow-md transition-transform active:scale-95 text-sm sm:text-md min-w-[100px] min-h-[50px] ${
                      running
                        ? "bg-gray-900 text-white border"
                        : sessionCompleted
                          ? "bg-green-600 text-white border border-green-600"
                          : "bg-white text-black border"
                    }`}
                  >
                    {running ? "Pause" : sessionCompleted ? "New Session" : "Start"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-sm sm:text-md px-4 sm:px-6 py-3 sm:py-3 rounded-xl border min-w-[80px] min-h-[50px]"
                  >
                    Reset
                  </button>
                  <button
                    onClick={quickAddFive}
                    className="text-sm sm:text-md px-4 sm:px-6 py-3 sm:py-3 rounded-xl border min-w-[60px] min-h-[50px]"
                    disabled={sessionCompleted}
                    style={{ opacity: sessionCompleted ? 0.5 : 1 }}
                  >
                    +5m
                  </button>
                </div>
              </div>
            </div>

            {/* FIXED: Session Complete Message - WORKS ON BOTH WEB AND MOBILE */}
            <AnimatePresence>
              {sessionCompleted && (
                <motion.div
                  key="session-complete"
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-800 dark:text-emerald-200 border-2 border-emerald-200 dark:border-emerald-700 shadow-xl"
                >
                  {/* Success Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                        🎉 Session Complete!
                      </h3>
                      <p className="text-emerald-600 dark:text-emerald-300 text-sm">
                        Time to take a well-deserved break
                      </p>
                    </div>
                  </div>

                  {/* Session Stats */}
                  <div className="mb-6 p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-emerald-200/50">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {formatDuration(totalSeconds)}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">Duration</div>
                      </div>
                      <div>
                        {sessionTodos.length > 0 ? (
                          <>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                              {Math.round((sessionTodos.filter(t => t.done).length / sessionTodos.length) * 100)}%
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">
                              Tasks Done ({sessionTodos.filter(t => t.done).length}/{sessionTodos.length})
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">✓</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400">Completed</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Break Suggestion */}
                  <div className="mb-6 text-center">
                    <div className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                      🌟 Great work! Time for a break
                    </div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-300">
                      Take 5-15 minutes to rest, hydrate, or stretch before your next session
                    </div>
                  </div>

                  {/* Action Buttons - FIXED: Configure New Session */}
                  <div className="flex gap-3 flex-wrap justify-center">
                    <button
                      onClick={() => {
                        triggerHaptic();
                        setSessionCompleted(false);
                        setRemaining(totalSeconds);
                        setSessionTodos([]);
                        setMode("configure"); // FIXED: Opens configure for new session
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 min-h-[50px] flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Configure New Session
                    </button>

                    <button
                      onClick={() => {
                        triggerHaptic();
                        setSessionCompleted(false);
                        setRemaining(totalSeconds);
                        setSessionTodos(prev => prev.map(todo => ({ ...todo, done: false })));
                        setRunning(true);
                      }}
                      className="px-6 py-3 bg-white hover:bg-gray-50 text-emerald-700 border-2 border-emerald-300 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 min-h-[50px] flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Repeat Session
                    </button>
                  </div>

                  {/* Motivational Footer */}
                  <div className="mt-6 text-center">
                    <div className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">
                      💪 Session saved to history • Keep up the great work!
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Todos + Stats - RESTORED WITH MINIMAL WEB SCROLLBARS */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/40 dark:bg-black/30 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200/30 flex flex-col order-2 xl:order-2"
          >
            <h3 className="text-2xl sm:text-3xl font-semibold">Todo & Track</h3>
            <div className="mt-3 flex-1">

              {/* ONLY ADD SCROLLBARS ON WEB FOR TODOS */}
              <div className={`mt-4 ${!isMobile ? 'max-h-64 overflow-y-auto' : ''}`} style={!isMobile ? { scrollbarWidth: 'thin' } : {}}>
                {allDisplayTodos.length === 0 ? (
                  <div className="text-sm opacity-60">No tasks yet — add session tasks in Configure or general tasks below.</div>
                ) : (
                  <ul className="space-y-2">
                    {allDisplayTodos.map((t) => (
                      <li key={`${t.isSessionTodo ? 'session' : 'general'}-${t.id}`} className={`flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-3 rounded-lg min-h-[50px] ${
                        t.isSessionTodo
                          ? 'bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50'
                          : 'bg-white/30 dark:bg-black/20'
                      }`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={t.done}
                            onChange={() => t.isSessionTodo ? toggleSessionTodo(t.id) : toggleTodo(t.id)}
                            className="flex-shrink-0 min-w-[20px] min-h-[20px]"
                          />
                          <div className={`text-sm ${t.done ? "line-through opacity-60" : ""} flex-1 truncate`}>
                            {t.text}
                          </div>
                          {t.isSessionTodo && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex-shrink-0">
                              Session
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => t.isSessionTodo ? deleteSessionTodo(t.id) : deleteTodo(t.id)}
                            className="text-xs sm:text-sm opacity-70 hover:opacity-100 px-2 py-1 min-h-[32px]"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4">
                <label className="text-sm opacity-80">Add General Task</label>
                <div className="flex gap-2 mt-2">
                  <input
                    ref={todoRef}
                    placeholder="Write a general task..."
                    className="flex-1 px-3 py-3 rounded-lg border bg-transparent text-sm min-h-[44px]"
                    onKeyDown={(e) => { if (e.key === "Enter") addTodo(); }}
                  />
                  <button
                    onClick={() => addTodo()}
                    className="px-4 py-3 rounded-lg border text-sm flex-shrink-0 min-h-[44px]"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Session History - FIXED: Shows ALL sessions */}
            <div className="mt-6">
            <h4 className="text-md opacity-80">Session History</h4>
            <div className="text-xs opacity-70">Click any session to see details • {history.length} total sessions</div>
            <div className={` mt-2 divide-y divide-gray-200/30 ${!isMobile ? 'h-48 overflow-y-auto ' : 'overflow-y-auto'}`} style={{ scrollbarWidth: 'none', scrollbarColor: 'transparent' }}>
                {history.length === 0 ? (
                <div className="text-sm opacity-60 p-3">No sessions completed yet.</div>
                ) : (
                history.map((h) => (
                    <div
                    key={h.id}
                    className="flex items-center justify-between p-3 sm:p-3 text-sm cursor-pointer hover:bg-white/20 dark:hover:bg-black/20 rounded-lg transition-colors min-h-[50px]"
                    onClick={() => setSelectedHistoryItem(h)}
                    >
                    <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{h.name}</div>
                        <div className="text-xs opacity-70 flex items-center gap-2 flex-wrap">
                        <span>{formatDuration(h.seconds)}</span>
                        {h.totalTodos > 0 && (
                            <>
                            <span>•</span>
                            <span className="hidden sm:inline">{h.completedTodos}/{h.totalTodos} tasks ({Math.round(h.completionRate)}%)</span>
                            <span className="sm:hidden">{h.completedTodos}/{h.totalTodos}</span>
                            </>
                        )}
                        <span>•</span>
                        <span>{new Date(h.at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="text-md opacity-70 flex-shrink-0 ml-2 text-amber-500">view &gt;</div>
                    </div>
                ))
                )}
            </div>
            </div>

              <div className="mt-6 flex gap-2 flex-wrap">
                <button
                  onClick={() => { setTodos([]); }}
                  className="px-3 py-2 rounded-lg border text-xs sm:text-sm flex-shrink-0 min-h-[40px]"
                >
                  Clear general
                </button>
                <button
                  onClick={() => { setHistory([]); }}
                  className="px-3 py-2 rounded-lg border text-xs sm:text-sm flex-shrink-0 min-h-[40px]"
                >
                  Clear history
                </button>
              </div>
            </div>

            <div className="mt-auto pt-4 text-xs sm:text-sm opacity-60">
              Session tasks (blue background) appear here during your session. Mark them complete as you work!
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Responsive Status Bar/Footer - RESTORED */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-lg border-t border-gray-200/60 dark:border-gray-700/60 shadow-xl">

          {/* Mobile Layout - Compact Multi-Row */}
          <div className="sm:hidden px-3 py-2.5">
            {/* Row 1: App Title + Version */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-800 dark:bg-gray-200 rounded-full"></div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  TIMORA
                  <span className="text-xs tracking-tight bg-emerald-600/30 text-emerald-400 border border-emerald-400 px-1 rounded ml-1">
                    v2.1
                  </span>
                </span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300">Session productivity</span>
            </div>

            {/* Row 2: Features - Scrollable horizontal */}
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2 overflow-x-auto pb-1 hide-scrollbar">
              <span className="flex items-center gap-1 flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                Auto-save
              </span>
              <span className="flex items-center gap-1 flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Hours timer
              </span>
              <span className="flex items-center gap-1 flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                </svg>
                Session tasks
              </span>
              <span className="flex items-center gap-1 flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                History
              </span>
              <span className="flex items-center gap-1 flex-shrink-0">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                </svg>
                Audio alerts
              </span>
            </div>

            {/* Row 3: Credits */}
            <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
              <span>Created by</span>
              <a
                href="https://github.com/ravixalgorithm"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium"
              >
                ravixalgorithm
              </a>
              <span className="mx-2">•</span>
              <a
                href="https://github.com/ravixalgorithm/timora"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                Contribute
              </a>
            </div>
          </div>

          {/* Desktop/Tablet Layout - Single Row */}
          <div className="hidden sm:block px-4 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              {/* Left: App Info */}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-800 dark:bg-gray-200 rounded-full"></div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    TIMORA
                    <span className="text-xs tracking-tight bg-emerald-600/30 text-emerald-400 border border-emerald-400 px-1 rounded ml-1">
                      v2.1
                    </span>
                  </span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-300 text-sm">Session-focused productivity</span>
              </div>

              {/* Center: Features */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                  Auto-save
                </span>
                <span className="hidden md:flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Hours timer
                </span>
                <span className="hidden lg:flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                  </svg>
                  Session tasks
                </span>
                <span className="hidden xl:flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  History archive
                </span>
              </div>

              {/* Right: Credits */}
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Created by</span>
                <a
                  href="https://github.com/ravixalgorithm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  ravixalgorithm
                </a>
                <span>•</span>
                <a
                  href="https://github.com/ravixalgorithm/timora"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Contribute
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile navigation button spacer */}
        {isMobile && (
          <div
            className="bg-transparent"
            style={{ height: 'env(safe-area-inset-bottom)' }}
          ></div>
        )}
      </div>

      {/* configure modal */}
      {ConfigureModal}

      {/* history detail modal */}
      {HistoryDetailModal}

      {/* CSS for hide scrollbar */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
