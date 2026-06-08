"use client";

import { useState, useSyncExternalStore, Fragment } from "react";
import { syllabus } from "../data/syllabus";

// --- Persistent study-progress store (localStorage-backed) -----------------
// We use useSyncExternalStore so reading persisted progress is SSR-safe (no
// hydration mismatch: server uses the empty snapshot, client switches after
// hydration) and lint-clean (no setState inside an effect). Bonus: the
// `storage` event keeps progress in sync across tabs.
type Progress = Record<string, boolean>;
const PROGRESS_KEY = "syllabus-progress-v1";
const EMPTY_PROGRESS: Progress = {};

const progressListeners = new Set<() => void>();
// Cache the parsed snapshot so getSnapshot returns a STABLE reference between
// reads (required by useSyncExternalStore — otherwise it re-renders forever).
let cachedRaw: string | null = null;
let cachedProgress: Progress = EMPTY_PROGRESS;

function getProgressSnapshot(): Progress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PROGRESS_KEY);
  } catch {
    return cachedProgress;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedProgress = raw ? (JSON.parse(raw) as Progress) : EMPTY_PROGRESS;
    } catch {
      cachedProgress = EMPTY_PROGRESS;
    }
  }
  return cachedProgress;
}

// Server render (and the first hydration pass) uses this stable empty value.
function getServerProgress(): Progress {
  return EMPTY_PROGRESS;
}

function subscribeProgress(callback: () => void): () => void {
  progressListeners.add(callback);
  // Sync across tabs: another tab writing PROGRESS_KEY fires `storage` here.
  window.addEventListener("storage", callback);
  return () => {
    progressListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function writeProgress(next: Progress): void {
  const serialized = JSON.stringify(next);
  try {
    window.localStorage.setItem(PROGRESS_KEY, serialized);
  } catch {
    // ignore quota/unavailable storage — UI still updates via the cache below
  }
  cachedRaw = serialized; // keep the cache in sync so getSnapshot returns `next`
  cachedProgress = next;
  progressListeners.forEach((l) => l()); // notify this tab's subscribers
}

// Renders an answer string that may contain ~~~fenced~~~ blocks (code or ASCII diagrams).
// Prose segments render as normal text; fenced segments render in a monospace <pre>.
// ~~~ is valid markdown AND safe inside JS template literals (no backtick escaping needed).
// Dependency-free — no markdown library, keeps the bundle lean.
function renderAnswer(answer: string) {
  const parts = answer.split("~~~");
  return parts.map((part, i) => {
    const isFence = i % 2 === 1;
    if (isFence) {
      // Strip an optional language hint on the first line (e.g. ```js).
      const firstNewline = part.indexOf("\n");
      const lang = firstNewline === -1 ? "" : part.slice(0, firstNewline).trim();
      const isLangHint = /^[a-zA-Z0-9_-]{1,12}$/.test(lang);
      const code = isLangHint ? part.slice(firstNewline + 1) : part;
      return (
        <pre
          key={i}
          style={{
            margin: "10px 0",
            padding: "12px 14px",
            background: "#08080F",
            border: "1px solid #23233A",
            borderRadius: 6,
            overflowX: "auto",
            fontSize: 12,
            lineHeight: 1.55,
            color: "#B8C6E0",
            fontFamily: "'Courier New', monospace",
            whiteSpace: "pre",
          }}
        >
          {code.replace(/\n$/, "")}
        </pre>
      );
    }
    // Prose: preserve intentional line breaks, render simple paragraphs.
    return (
      <div
        key={i}
        style={{
          fontSize: 13,
          color: "#C0C0D8",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}
      >
        {part}
      </div>
    );
  });
}

export default function InterviewSyllabus() {
  const [activeWeek, setActiveWeek] = useState(0);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  // Study progress is read from (and written to) localStorage via the store
  // above — persists across reloads and syncs across tabs.
  const checkedTopics = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getServerProgress
  );
  const [openAnswers, setOpenAnswers] = useState<Set<string>>(new Set());

  const toggleTopic = (idx: number) =>
    setExpandedTopic(expandedTopic === idx ? null : idx);

  const toggleCheck = (weekIdx: number, topicIdx: number) => {
    const key = `${weekIdx}-${topicIdx}`;
    writeProgress({ ...checkedTopics, [key]: !checkedTopics[key] });
  };

  const toggleAnswer = (key: string) => {
    setOpenAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalTopics = syllabus.reduce((a, w) => a + w.topics.length, 0);
  const doneTopics = Object.values(checkedTopics).filter(Boolean).length;
  const pct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;

  const week = syllabus[activeWeek];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0F",
        color: "#E8E8F0",
        fontFamily: "'Courier New', monospace",
        padding: "0",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #1E1E2E",
          padding: "24px 28px 20px",
          background: "#0D0D16",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                color: "#6B6B8A",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Senior Frontend Engineer
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "#F0F0FF",
                fontFamily: "Georgia, serif",
                letterSpacing: -0.5,
              }}
            >
              Interview Prep Syllabus
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: week.color,
                fontFamily: "Georgia, serif",
              }}
            >
              {pct}%
            </div>
            <div style={{ fontSize: 11, color: "#6B6B8A" }}>
              {doneTopics}/{totalTopics} topics done
            </div>
            <div
              style={{
                marginTop: 6,
                height: 4,
                width: 120,
                background: "#1E1E2E",
                borderRadius: 2,
                overflow: "hidden",
                marginLeft: "auto",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: week.color,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Week Nav */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          padding: "16px 28px 0",
          gap: 8,
          borderBottom: "1px solid #1E1E2E",
          scrollbarWidth: "none",
        }}
      >
        {syllabus.map((w, i) => {
          const weekDone = w.topics.filter(
            (_, ti) => checkedTopics[`${i}-${ti}`]
          ).length;
          const isActive = activeWeek === i;
          return (
            <button
              key={i}
              onClick={() => {
                setActiveWeek(i);
                setExpandedTopic(null);
              }}
              style={{
                padding: "10px 16px 12px",
                background: isActive ? week.color + "18" : "transparent",
                border: "none",
                borderBottom: isActive
                  ? `2px solid ${w.color}`
                  : "2px solid transparent",
                color: isActive ? w.color : "#5A5A78",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 12,
                fontFamily: "'Courier New', monospace",
                fontWeight: isActive ? 700 : 400,
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              W{w.week} · {w.theme.split(" ")[0]}
              {weekDone > 0 ? ` ✓${weekDone}` : ""}
            </button>
          );
        })}
      </div>

      {/* Week Content */}
      <div style={{ padding: "24px 28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 4,
              height: 32,
              background: week.color,
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 11,
                color: week.color,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Week {week.week}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#F0F0FF",
                fontFamily: "Georgia, serif",
              }}
            >
              {week.theme}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {week.topics.map((topic, ti) => {
            const key = `${activeWeek}-${ti}`;
            const isChecked = checkedTopics[key];
            const isExpanded = expandedTopic === ti;

            return (
              <div
                key={ti}
                style={{
                  border: `1px solid ${
                    isExpanded ? week.color + "60" : "#1E1E2E"
                  }`,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: isExpanded ? week.color + "08" : "#0D0D16",
                  transition: "all 0.2s",
                }}
              >
                {/* Topic Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleTopic(ti)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCheck(activeWeek, ti);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: `1.5px solid ${
                        isChecked ? week.color : "#3A3A50"
                      }`,
                      background: isChecked ? week.color : "transparent",
                      cursor: "pointer",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    {isChecked && (
                      <span
                        style={{ color: "#000", fontSize: 11, fontWeight: 900 }}
                      >
                        ✓
                      </span>
                    )}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isChecked ? "#5A5A78" : "#E8E8F0",
                        textDecoration: isChecked ? "line-through" : "none",
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      {topic.title}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#4A4A68", marginTop: 3 }}
                    >
                      {topic.subtopics.join(" · ")}
                    </div>
                  </div>

                  <span
                    style={{ color: "#3A3A50", fontSize: 12, flexShrink: 0 }}
                  >
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${week.color}30`,
                      padding: "16px",
                    }}
                  >
                    {/* Interview Questions + Answers */}
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: 2,
                          color: week.color,
                          textTransform: "uppercase",
                          marginBottom: 10,
                        }}
                      >
                        Expected Interview Questions · click to reveal answer
                      </div>
                      {topic.questions.map((qa, qi) => {
                        const aKey = `${activeWeek}-${ti}-${qi}`;
                        const isOpen = openAnswers.has(aKey);
                        const priorityColors = {
                          High: { bg: "#3F1D1D", fg: "#FCA5A5", border: "#7F1D1D" },
                          Medium: { bg: "#3A2A12", fg: "#FCD34D", border: "#92400E" },
                          Low: { bg: "#172534", fg: "#93C5FD", border: "#1D4ED8" },
                        } as const;
                        const priorityTone = qa.priority
                          ? priorityColors[qa.priority]
                          : null;
                        return (
                          <Fragment key={qi}>
                            <div
                              onClick={() => toggleAnswer(aKey)}
                              style={{
                                display: "flex",
                                gap: 10,
                                marginBottom: isOpen ? 0 : 8,
                                padding: "10px 12px",
                                background: "#13131E",
                                borderRadius: isOpen ? "6px 6px 0 0" : 6,
                                borderLeft: `3px solid ${week.color}${
                                  isOpen ? "" : "60"
                                }`,
                                cursor: "pointer",
                                alignItems: "flex-start",
                              }}
                            >
                              <span
                                style={{
                                  color: week.color,
                                  fontSize: 11,
                                  flexShrink: 0,
                                  marginTop: 1,
                                }}
                              >
                                Q{qi + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: "#C0C0D8",
                                  lineHeight: 1.5,
                                  flex: 1,
                                }}
                              >
                                {qa.q}
                              </span>
                              {priorityTone && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    lineHeight: 1,
                                    padding: "5px 7px",
                                    borderRadius: 999,
                                    background: priorityTone.bg,
                                    color: priorityTone.fg,
                                    border: `1px solid ${priorityTone.border}`,
                                    flexShrink: 0,
                                    marginTop: 1,
                                  }}
                                >
                                  {qa.priority}
                                </span>
                              )}
                              <span
                                style={{
                                  color: "#3A3A50",
                                  fontSize: 11,
                                  flexShrink: 0,
                                  marginTop: 2,
                                }}
                              >
                                {isOpen ? "−" : "+"}
                              </span>
                            </div>
                            {isOpen && (
                              <div
                                style={{
                                  marginBottom: 8,
                                  padding: "12px 14px",
                                  background: "#0F0F18",
                                  borderRadius: "0 0 6px 6px",
                                  borderLeft: `3px solid ${week.color}`,
                                }}
                              >
                                {renderAnswer(qa.answer)}
                              </div>
                            )}
                          </Fragment>
                        );
                      })}
                    </div>

                    {/* Tip */}
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#16161F",
                        borderRadius: 6,
                        border: "1px solid #2A2A3A",
                        marginBottom: topic.rajnishAngle ? 10 : 0,
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#8A8AAA",
                          lineHeight: 1.5,
                        }}
                      >
                        {topic.tip}
                      </span>
                    </div>

                    {/* Rajnish Angle */}
                    {topic.rajnishAngle && (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: week.color + "10",
                          borderRadius: 6,
                          border: `1px solid ${week.color}30`,
                          display: "flex",
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 14, flexShrink: 0 }}>🎯</span>
                        <span
                          style={{
                            fontSize: 12,
                            color: week.color + "CC",
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>Your angle:</strong> {topic.rajnishAngle}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 28px",
          borderTop: "1px solid #1E1E2E",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, color: "#3A3A50" }}>
          Check off topics as you study. 🎯 = your Times Internet war story to use.
        </div>
        <div style={{ fontSize: 11, color: "#3A3A50" }}>
          {syllabus.length - activeWeek - 1 > 0
            ? `${syllabus.length - activeWeek - 1} week${
                syllabus.length - activeWeek - 1 > 1 ? "s" : ""
              } remaining`
            : "Final week!"}
        </div>
      </div>
    </div>
  );
}
