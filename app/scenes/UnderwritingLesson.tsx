import { observer } from "mobx-react";
import { AcademicCapIcon } from "outline-icons";
import { Link, useHistory, useLocation, useParams } from "react-router-dom";
import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Scene from "~/components/Scene";
import { client } from "~/utils/ApiClient";
import {
  underwritingLessonPath,
  underwritingQuizPath,
  underwritingTrainingPath,
} from "~/utils/routeHelpers";
import { learningCourses } from "./learningData";
import LearningHero from "./LearningHero";
import UnderwritingModuleNotes from "./UnderwritingModuleNotes";
import {
  underwritingLessonProductionData,
  type LessonCheckpoint,
  type LessonSection,
  type LessonVisualKind,
} from "./underwritingLessonProductionData";
import {
  underwritingGongEvidenceBySection,
  underwritingGongNarrationSkipsByLesson,
  type UnderwritingGongEvidence,
} from "./underwritingGongEvidenceData";

type Params = {
  moduleNumber: string;
  lessonNumber: string;
};

type SlideLayout = "copyLead" | "visualLead" | "metricLead";
type SlideTone = "dark" | "light" | "blue" | "lime" | "violet";

const brand = {
  paper: "#f7f5ef",
  surface: "#fffcf5",
  rule: "#dedad1",
  ink: "#20302d",
  muted: "#777a73",
  dark: "#1c2018",
  blue: "#354cef",
  lime: "#edff3d",
  mint: "#e9f8f1",
  lavender: "#ececff",
  purple: "#6f3df4",
  coral: "#ffe8db",
  mutedBlock: "#f2efe6",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

const GONG_TIME_EPSILON_SECONDS = 0.08;
const SEEK_LOCK_GRACE_SECONDS = 1.25;
const SKILL_CHECK_REPLAY_BUFFER_SECONDS = 5;
const SKILL_CHECK_MISS_PROMPT =
  "Not quite. This skill check is required to move forward. You can continue the lesson now, but you'll need to replay this section and answer it correctly before completing the lesson.";
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5] as const;

type PlaybackRate = (typeof PLAYBACK_RATES)[number];
type CaptionCue = {
  end: number;
  start: number;
  text: string;
};

type LessonGate = {
  locked: boolean;
  lockedReason: string | null;
  moduleNumber: number;
};

type LessonOverview = {
  assignment?: {
    lessonsCompleted?: number;
    progressPercent?: number;
    status?: string;
  };
  gates?: LessonGate[];
};

function clearUnderwritingLessonStorage() {
  const prefixes = [
    "dashfi.learning.underwriting.lesson-progress.",
    "dashfi.learning.underwriting.lesson-intro.",
    "dashfi.learning.underwriting.module-notes-draft.",
  ];

  Object.keys(window.localStorage).forEach((key) => {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      window.localStorage.removeItem(key);
    }
  });
}

function parseCaptionTimestamp(value: string) {
  const normalized = value.trim().replace(",", ".");
  const match = normalized.match(/(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function parseCaptionCues(source: string): CaptionCue[] {
  return source
    .replace(/\r/g, "")
    .replace(/^WEBVTT[^\n]*(?:\n\n|\n)?/, "")
    .split(/\n{2,}/)
    .flatMap((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const timingLineIndex = lines.findIndex((line) => line.includes("-->"));

      if (timingLineIndex === -1) {
        return [];
      }

      const [startValue, endValue] = lines[timingLineIndex]
        .split("-->")
        .map((part) => part.trim().split(/\s+/)[0]);
      const start = parseCaptionTimestamp(startValue ?? "");
      const end = parseCaptionTimestamp(endValue ?? "");
      const text = lines
        .slice(timingLineIndex + 1)
        .join("\n")
        .replace(/<[^>]*>/g, "")
        .trim();

      if (start === null || end === null || !text) {
        return [];
      }

      return [{ end, start, text }];
    });
}

function UnderwritingLesson() {
  const location = useLocation();
  const history = useHistory();
  const underwriting = learningCourses.find(
    (course) => course.id === "underwriting-training"
  );
  const { moduleNumber, lessonNumber } = useParams<Params>();
  const activeModule = Number(moduleNumber);
  const activeLesson = Number(lessonNumber);
  const progressStorageKey =
    activeModule && activeLesson
      ? `dashfi.learning.underwriting.lesson-progress.${activeModule}.${activeLesson}`
      : "dashfi.learning.underwriting.lesson-progress";
  const [currentTime, setCurrentTime] = useState(0);
  const [maxWatched, setMaxWatched] = useState(0);
  const [activeCheckpoint, setActiveCheckpoint] =
    useState<LessonCheckpoint | null>(null);
  const [completedCheckpointIds, setCompletedCheckpointIds] = useState<
    string[]
  >([]);
  const [failedCheckpointIds, setFailedCheckpointIds] = useState<string[]>([]);
  const [remediationCheckpointId, setRemediationCheckpointId] = useState("");
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [loadedProgressKey, setLoadedProgressKey] = useState("");
  const [checkpointFeedback, setCheckpointFeedback] = useState("");
  const [workflowVideoExpanded, setWorkflowVideoExpanded] = useState(false);
  const [lessonIntroDismissed, setLessonIntroDismissed] = useState(false);
  const [lockedReason, setLockedReason] = useState("");
  const [activeRailTab, setActiveRailTab] = useState<
    "objectives" | "path" | "checks"
  >("objectives");
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1.5);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionCues, setCaptionCues] = useState<CaptionCue[]>([]);
  const [captionsStatus, setCaptionsStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [serverProgressReconciled, setServerProgressReconciled] =
    useState(false);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const internalSeekRef = useRef(false);
  const completionRailAutoSelectedRef = useRef(false);
  const lastSyncedProgressRef = useRef("");
  const lastTriggeredGongClipRef = useRef("");
  const [autoGongClipSrc, setAutoGongClipSrc] = useState<string | null>(null);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const pauseGongPlayback = useCallback(() => {
    document
      .querySelectorAll<HTMLMediaElement>("[data-gong-media='true']")
      .forEach((mediaElement) => {
        mediaElement.pause();
      });
  }, []);
  const getActiveGongMediaElement = useCallback(() => {
    if (!autoGongClipSrc) {
      return null;
    }

    return (
      Array.from(
        document.querySelectorAll<HTMLMediaElement>("[data-gong-media='true']")
      ).find((mediaElement) => {
        const currentSrc =
          mediaElement.currentSrc || mediaElement.getAttribute("src") || "";
        return currentSrc.endsWith(autoGongClipSrc);
      }) ?? null
    );
  }, [autoGongClipSrc]);
  const searchParams = new URLSearchParams(location.search);
  const reviewMode = searchParams.get("review") === "1";
  const reviewSectionNumber = Number(searchParams.get("section") ?? "");

  const module = underwriting?.modules.find(
    (item) => item.number === activeModule
  );
  const lesson = module?.lessons.find((item) => item.number === activeLesson);
  const nextLesson = module?.lessons.find(
    (item) => item.number === activeLesson + 1
  );
  const finalModule = underwriting?.modules.at(-1);
  const isFinalCourseLesson =
    Boolean(finalModule) &&
    activeModule === finalModule?.number &&
    !nextLesson &&
    Boolean(lesson);
  const lessonKey = `${activeModule}-${activeLesson}`;
  const introStorageKey = `dashfi.learning.underwriting.lesson-intro.${lessonKey}`;
  const production = underwritingLessonProductionData[lessonKey];
  const sections = production?.sections ?? [];
  const media = production?.media;
  const hasWorkflowVideo = Boolean(media?.videoSrc);
  const captionsSrc = media?.captionsSrc;
  const reviewSection =
    reviewMode &&
    Number.isInteger(reviewSectionNumber) &&
    reviewSectionNumber >= 1 &&
    reviewSectionNumber <= sections.length
      ? sections[reviewSectionNumber - 1]
      : undefined;
  const displayedTime =
    reviewMode && reviewSection && currentTime === 0
      ? reviewSection.start + 0.15
      : currentTime;
  const activeSection = getActiveSection(sections, displayedTime);
  const activeSectionIndex = sections.findIndex(
    (section) => section.id === activeSection?.id
  );
  const activeVisual =
    activeSection?.kind ?? getFallbackVisualKind(lesson?.kind);
  const lessonGongEvidence = getLessonGongEvidence(lessonKey);
  const activeTimedGongEvidence = getActiveGongEvidence(
    lessonGongEvidence,
    displayedTime
  );
  const sectionGongEvidence = activeSection
    ? (underwritingGongEvidenceBySection[`${lessonKey}:${activeSection.id}`] ??
      [])
    : [];
  const activeGongEvidence = activeTimedGongEvidence.length
    ? activeTimedGongEvidence
    : getActiveGongEvidence(sectionGongEvidence, displayedTime);
  const activeGongClip = activeGongEvidence[0];
  const activeLayout = getSlideLayout(activeVisual, activeSectionIndex);
  const activeTone = getSlideTone(activeVisual, activeSectionIndex);
  const activeStageTitle =
    activeGongClip?.topic ??
    activeGongClip?.label ??
    activeSection?.stageTitle ??
    lesson?.title ??
    "";
  const compactStageTitle = activeStageTitle.length > 28;
  const totalDuration =
    sections.at(-1)?.end ?? parseDuration(lesson?.duration ?? "");
  const progressValue = totalDuration
    ? Math.min(100, Math.max(0, (displayedTime / totalDuration) * 100))
    : 0;
  const hasSkillCheckMiss = failedCheckpointIds.length > 0;
  const canAdvanceLesson = lessonCompleted && !hasSkillCheckMiss;
  const lessonCheckpoints = production?.checkpoints ?? [];
  const firstFailedCheckpoint = lessonCheckpoints.find((checkpoint) =>
    failedCheckpointIds.includes(checkpoint.id)
  );
  const firstFailedCheckpointIndex = firstFailedCheckpoint
    ? lessonCheckpoints.findIndex(
        (checkpoint) => checkpoint.id === firstFailedCheckpoint.id
      )
    : -1;
  const replayFromStart =
    firstFailedCheckpointIndex <= 0 || !firstFailedCheckpoint;
  const replayCheckpoint = replayFromStart
    ? null
    : lessonCheckpoints[firstFailedCheckpointIndex - 1];
  const skillCheckReplayStart = firstFailedCheckpoint
    ? replayFromStart
      ? 0
      : Math.max(
          0,
          (replayCheckpoint?.placement ?? 0) - SKILL_CHECK_REPLAY_BUFFER_SECONDS
        )
    : 0;
  const skillCheckReplayLabel = replayFromStart
    ? "Replay from beginning"
    : "Replay from last passed skill check";
  const startModalVisible = !reviewMode && !lessonIntroDismissed;
  const completionModalVisible = !reviewMode && lessonCompleted;
  const playerModalActive = startModalVisible || completionModalVisible;
  const activeCaption = useMemo(() => {
    if (!captionsEnabled || !captionCues.length) {
      return "";
    }

    return (
      captionCues.find(
        (cue) => displayedTime >= cue.start && displayedTime <= cue.end
      )?.text ?? ""
    );
  }, [captionCues, captionsEnabled, displayedTime]);
  const checkpointProgress =
    production?.checkpoints?.filter((checkpoint) =>
      completedCheckpointIds.includes(checkpoint.id)
    ).length ?? 0;
  const timelineMarkers = useMemo(() => {
    if (!totalDuration) {
      return [];
    }

    const skillMarkers =
      production?.checkpoints?.map((checkpoint) => ({
        id: `skill:${checkpoint.id}`,
        label: "Skill check",
        time: checkpoint.placement,
        type: "skill" as const,
      })) ?? [];
    const gongMarkers = lessonGongEvidence
      .filter(
        (clip) =>
          clip.lessonStart !== null &&
          clip.lessonStart !== undefined &&
          clip.lessonStart >= 0
      )
      .map((clip) => ({
        id: `gong:${clip.callId}:${clip.lessonStart}`,
        label: "Gong clip",
        time: clip.lessonStart ?? 0,
        type: "gong" as const,
      }));

    return [...skillMarkers, ...gongMarkers].filter(
      (marker) => marker.time >= 0 && marker.time <= totalDuration
    );
  }, [lessonGongEvidence, production?.checkpoints, totalDuration]);
  const watchedProgress = totalDuration
    ? Math.min(100, Math.max(0, (maxWatched / totalDuration) * 100))
    : 0;
  const nextAction =
    nextLesson?.kind === "quiz"
      ? {
          href: underwritingQuizPath(activeModule),
          label: "Take module quiz",
          meta: `${nextLesson.duration} · 100% required`,
          title: nextLesson.title,
        }
      : nextLesson
        ? {
            href: underwritingLessonPath(activeModule, nextLesson.number),
            label: "Next lesson",
            meta: `Lesson ${nextLesson.number} of ${module?.lessonCount ?? 0} · ${nextLesson.duration}`,
            title: nextLesson.title,
          }
        : {
            href: underwritingTrainingPath(),
            label: "Course overview",
            meta: "Return to the module map",
            title: "Course overview",
          };
  const completionModalCopy = hasSkillCheckMiss
    ? {
        body: "You missed one or more required skill checks. Replay from the last completed checkpoint, then answer the missed skill check correctly to unlock the next lesson.",
        kicker: "Skill check review required",
        title: "Replay the missed section",
      }
    : isFinalCourseLesson
      ? {
          body: "You have completed the required lessons and knowledge checks for certification. Head back to the course overview to confirm your completion status.",
          kicker: "Course complete",
          title: "Congratulations, you completed Underwriting Training.",
        }
      : nextLesson?.kind === "quiz"
        ? {
            body: "You need 100% to pass and unlock the next module. Use your notes, take your time, and answer carefully.",
            kicker: "Module complete",
            title: "Ready for the module quiz",
          }
        : {
            body: "Keep going while the examples are fresh. The next lesson builds on what you just covered.",
            kicker: "Lesson complete",
            title: `Next up: ${nextAction.title}`,
          };
  const openDueCheckpoint = useCallback(
    (time: number) => {
      if (reviewMode || activeCheckpoint || !production?.checkpoints?.length) {
        return false;
      }

      const checkpoint = production.checkpoints.find((item) => {
        const alreadyPassed = completedCheckpointIds.includes(item.id);
        const missedAndDismissed =
          failedCheckpointIds.includes(item.id) &&
          remediationCheckpointId !== item.id;

        return (
          time + GONG_TIME_EPSILON_SECONDS >= item.placement &&
          !alreadyPassed &&
          !missedAndDismissed
        );
      });

      if (!checkpoint) {
        return false;
      }

      pauseGongPlayback();
      setAutoGongClipSrc(null);
      setIsTimelinePlaying(false);
      if (mediaRef.current) {
        mediaRef.current.currentTime = checkpoint.placement;
        mediaRef.current.pause();
      }
      setCurrentTime(checkpoint.placement);
      setCheckpointFeedback("");
      setActiveCheckpoint(checkpoint);
      return true;
    },
    [
      activeCheckpoint,
      completedCheckpointIds,
      failedCheckpointIds,
      pauseGongPlayback,
      production?.checkpoints,
      remediationCheckpointId,
      reviewMode,
    ]
  );

  const setMainMediaRef = useCallback(
    (node: HTMLMediaElement | null) => {
      mediaRef.current = node;

      if (node) {
        node.playbackRate = playbackRate;
      }
    },
    [playbackRate]
  );

  const changePlaybackRate = useCallback((rate: PlaybackRate) => {
    setPlaybackRate(rate);

    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
  }, []);

  useEffect(() => {
    if (!serverProgressReconciled) {
      return;
    }

    setLessonIntroDismissed(
      window.localStorage.getItem(introStorageKey) === "dismissed"
    );
  }, [introStorageKey, serverProgressReconciled]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = playbackRate;
    }
  }, [lessonKey, media?.audioSrc, media?.videoSrc, playbackRate]);

  useEffect(() => {
    if (!captionsSrc) {
      setCaptionCues([]);
      setCaptionsEnabled(false);
      setCaptionsStatus("idle");
      return;
    }

    let mounted = true;
    setCaptionsStatus("loading");

    void fetch(captionsSrc)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load captions: ${response.status}`);
        }

        return response.text();
      })
      .then((text) => {
        if (!mounted) {
          return;
        }

        const cues = parseCaptionCues(text);
        setCaptionCues(cues);
        setCaptionsStatus(cues.length ? "ready" : "error");
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setCaptionCues([]);
        setCaptionsEnabled(false);
        setCaptionsStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [captionsSrc]);

  useEffect(() => {
    if (!serverProgressReconciled) {
      return;
    }

    setActiveRailTab("objectives");
    setActiveCheckpoint(null);
    setCheckpointFeedback("");
    setCurrentTime(0);
    setAutoGongClipSrc(null);
    lastTriggeredGongClipRef.current = "";
    completionRailAutoSelectedRef.current = false;
    setWorkflowVideoExpanded(false);

    const savedProgress = window.localStorage.getItem(progressStorageKey);
    if (!savedProgress) {
      setCompletedCheckpointIds([]);
      setFailedCheckpointIds([]);
      setRemediationCheckpointId("");
      setMaxWatched(0);
      setLessonCompleted(false);
      setLoadedProgressKey(progressStorageKey);
      return;
    }

    try {
      const parsed = JSON.parse(savedProgress) as {
        completedCheckpointIds?: string[];
        failedCheckpointIds?: string[];
        lessonCompleted?: boolean;
        maxWatched?: number;
        remediationCheckpointId?: string;
      };
      setCompletedCheckpointIds(parsed.completedCheckpointIds ?? []);
      setFailedCheckpointIds(parsed.failedCheckpointIds ?? []);
      setRemediationCheckpointId(parsed.remediationCheckpointId ?? "");
      setMaxWatched(parsed.maxWatched ?? 0);
      setLessonCompleted(Boolean(parsed.lessonCompleted));
    } catch {
      setCompletedCheckpointIds([]);
      setFailedCheckpointIds([]);
      setRemediationCheckpointId("");
      setMaxWatched(0);
      setLessonCompleted(false);
    }
    setLoadedProgressKey(progressStorageKey);
  }, [lessonKey, progressStorageKey, serverProgressReconciled]);

  useEffect(() => {
    if (
      reviewMode ||
      !lessonCompleted ||
      completionRailAutoSelectedRef.current
    ) {
      return;
    }

    completionRailAutoSelectedRef.current = true;
    setActiveRailTab("objectives");
  }, [lessonCompleted, reviewMode]);

  useEffect(() => {
    if (loadedProgressKey !== progressStorageKey) {
      return;
    }
    if (!serverProgressReconciled) {
      return;
    }

    window.localStorage.setItem(
      progressStorageKey,
      JSON.stringify({
        completedCheckpointIds,
        failedCheckpointIds,
        lessonCompleted,
        maxWatched,
        remediationCheckpointId,
        updatedAt: new Date().toISOString(),
      })
    );
  }, [
    completedCheckpointIds,
    failedCheckpointIds,
    lessonCompleted,
    loadedProgressKey,
    maxWatched,
    progressStorageKey,
    remediationCheckpointId,
    serverProgressReconciled,
  ]);

  useEffect(() => {
    setServerProgressReconciled(reviewMode);
  }, [lessonKey, reviewMode]);

  useEffect(() => {
    if (reviewMode || !activeModule) {
      return;
    }

    let mounted = true;

    void client
      .post<{ data: LessonOverview }>("/learning.overview", {
        courseId: "underwriting-training",
      })
      .then((response) => {
        if (!mounted) {
          return;
        }

        const overview = response.data;
        const assignment = overview.assignment;
        const resetOnServer =
          assignment?.status === "not_started" &&
          (assignment.progressPercent ?? 0) === 0 &&
          (assignment.lessonsCompleted ?? 0) === 0;

        if (resetOnServer) {
          clearUnderwritingLessonStorage();
          setCompletedCheckpointIds([]);
          setFailedCheckpointIds([]);
          setRemediationCheckpointId("");
          setMaxWatched(0);
          setLessonCompleted(false);
          setLessonIntroDismissed(false);
          setLoadedProgressKey("");
          lastSyncedProgressRef.current = "";
        }

        const gate = overview.gates?.find(
          (item) => item.moduleNumber === activeModule
        );
        if (gate?.locked) {
          setLockedReason(gate.lockedReason ?? "This module is locked.");
          history.replace(underwritingTrainingPath());
        } else {
          setLockedReason("");
        }
        setServerProgressReconciled(true);
      })
      .catch(() => {
        if (mounted) {
          setServerProgressReconciled(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeLesson, activeModule, history, reviewMode]);

  useEffect(() => {
    if (
      reviewMode ||
      !serverProgressReconciled ||
      loadedProgressKey !== progressStorageKey ||
      !activeModule ||
      !activeLesson
    ) {
      return;
    }

    const payload = {
      checkpointCount: production?.checkpoints?.length ?? 0,
      completedCheckpointIds,
      courseId: "underwriting-training",
      failedCheckpointIds,
      lessonCompleted: canAdvanceLesson,
      lessonNumber: activeLesson,
      maxWatched,
      moduleNumber: activeModule,
      totalDuration,
    };
    const payloadKey = JSON.stringify(payload);

    if (payloadKey === lastSyncedProgressRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      lastSyncedProgressRef.current = payloadKey;
      void client.post("/learning.progress", payload).catch(() => {
        lastSyncedProgressRef.current = "";
      });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [
    activeLesson,
    activeModule,
    canAdvanceLesson,
    completedCheckpointIds,
    failedCheckpointIds,
    lessonCompleted,
    loadedProgressKey,
    maxWatched,
    production?.checkpoints?.length,
    progressStorageKey,
    reviewMode,
    serverProgressReconciled,
    totalDuration,
  ]);

  useEffect(() => {
    openDueCheckpoint(currentTime);
  }, [currentTime, openDueCheckpoint]);

  const seekTo = useCallback(
    (time: number) => {
      const requestedTarget = Math.max(
        0,
        Math.min(time, totalDuration || time)
      );
      const learnerSeekLimit = Math.max(
        displayedTime,
        maxWatched + SEEK_LOCK_GRACE_SECONDS
      );
      const target = reviewMode
        ? requestedTarget
        : Math.min(requestedTarget, learnerSeekLimit);
      pauseGongPlayback();
      setIsTimelinePlaying(false);
      setCurrentTime(target);
      setAutoGongClipSrc(null);
      lastTriggeredGongClipRef.current = "";
      if (mediaRef.current) {
        try {
          internalSeekRef.current = true;
          mediaRef.current.currentTime = target;
          window.setTimeout(() => {
            internalSeekRef.current = false;
          }, 0);
        } catch {
          // Review mode should still move the slide even before media is seekable.
          internalSeekRef.current = false;
        }
      }
      if (reviewMode) {
        setMaxWatched((value) => Math.max(value, target));
      }
      setActiveCheckpoint(null);
      setCheckpointFeedback("");
    },
    [displayedTime, maxWatched, pauseGongPlayback, reviewMode, totalDuration]
  );

  const seekTimelineFromPointer = useCallback(
    (event: PointerEvent<HTMLInputElement>) => {
      if (!totalDuration) {
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (event.clientX - bounds.left) / bounds.width)
      );
      seekTo(ratio * totalDuration);
    },
    [seekTo, totalDuration]
  );

  const keepLearnersFromSeekingForward = useCallback(
    (mediaElement: HTMLMediaElement) => {
      if (reviewMode || internalSeekRef.current) {
        return;
      }

      const allowedTime = Math.max(
        currentTime,
        maxWatched + SEEK_LOCK_GRACE_SECONDS
      );
      if (mediaElement.currentTime <= allowedTime) {
        setCurrentTime(mediaElement.currentTime);
        return;
      }

      const target = Math.max(
        0,
        Math.min(maxWatched, totalDuration || maxWatched)
      );
      internalSeekRef.current = true;
      mediaElement.currentTime = target;
      setCurrentTime(target);
      window.setTimeout(() => {
        internalSeekRef.current = false;
      }, 0);
    },
    [currentTime, maxWatched, reviewMode, totalDuration]
  );

  const jumpToSection = useCallback(
    (section: LessonSection, sectionIndex: number) => {
      seekTo(section.start + 0.15);

      if (!reviewMode) {
        return;
      }

      const params = new URLSearchParams(location.search);
      params.set("review", "1");
      params.set("section", String(sectionIndex + 1));
      history.push(`${location.pathname}?${params.toString()}`);
    },
    [history, location.pathname, location.search, reviewMode, seekTo]
  );

  const updateMediaTime = useCallback(
    (mediaElement: HTMLMediaElement) => {
      const time = mediaElement.currentTime;
      const narrationSkip = getActiveNarrationSkipForTime(lessonKey, time);
      const narrationSkipKey = narrationSkip
        ? `skip:${lessonKey}:${narrationSkip.start}`
        : "";
      if (
        narrationSkip &&
        !mediaElement.paused &&
        lastTriggeredGongClipRef.current !== narrationSkipKey
      ) {
        pauseGongPlayback();
        const resumeAt = Math.min(
          totalDuration || narrationSkip.end,
          narrationSkip.end + 0.05
        );
        lastTriggeredGongClipRef.current = narrationSkipKey;
        mediaElement.currentTime = resumeAt;
        setCurrentTime(resumeAt);
        setMaxWatched((value) => Math.max(value, resumeAt));
        openDueCheckpoint(resumeAt);
        return;
      }

      const nextGongClip = getActiveGongClipForTime(lessonKey, time);
      const nextGongSegment = nextGongClip
        ? getPreferredGongMediaSegment(nextGongClip)
        : undefined;
      const nextGongKey =
        nextGongClip && nextGongSegment
          ? getGongClipKey(nextGongClip, nextGongSegment.mediaSrc)
          : "";

      if (
        nextGongClip?.lessonStart !== null &&
        nextGongClip?.lessonStart !== undefined &&
        nextGongClip.lessonEnd !== null &&
        nextGongClip.lessonEnd !== undefined &&
        nextGongSegment &&
        !mediaElement.paused &&
        lastTriggeredGongClipRef.current !== nextGongKey
      ) {
        lastTriggeredGongClipRef.current = nextGongKey;
        pauseGongPlayback();
        mediaElement.pause();
        if (
          Math.abs(mediaElement.currentTime - nextGongClip.lessonStart) > 0.75
        ) {
          mediaElement.currentTime = nextGongClip.lessonStart;
        }
        setCurrentTime(nextGongClip.lessonStart);
        setAutoGongClipSrc(nextGongSegment.mediaSrc);
        return;
      }

      setCurrentTime(time);
      setMaxWatched((value) => Math.max(value, time));
      if (totalDuration && time >= totalDuration - 2) {
        setLessonCompleted(true);
      }
    },
    [lessonKey, openDueCheckpoint, pauseGongPlayback, totalDuration]
  );

  const finishAutoGongClip = useCallback(
    (clip: UnderwritingGongEvidence, mediaSrc: string) => {
      setAutoGongClipSrc(null);

      if (
        clip.lessonEnd === null ||
        clip.lessonEnd === undefined ||
        !mediaRef.current
      ) {
        return;
      }

      const resumeAt = Math.min(
        totalDuration || clip.lessonEnd,
        clip.lessonEnd + 0.05
      );
      mediaRef.current.currentTime = resumeAt;
      setCurrentTime(resumeAt);
      setMaxWatched((value) => Math.max(value, resumeAt));
      if (openDueCheckpoint(resumeAt)) {
        return;
      }
      void mediaRef.current.play().catch(() => {
        lastTriggeredGongClipRef.current = getGongClipKey(clip, mediaSrc);
      });
    },
    [openDueCheckpoint, totalDuration]
  );

  const toggleTimelinePlayback = useCallback(() => {
    const activeGongMediaElement = getActiveGongMediaElement();

    if (activeGongMediaElement) {
      if (activeGongMediaElement.paused) {
        void activeGongMediaElement.play().then(() => {
          setIsTimelinePlaying(true);
        });
      } else {
        activeGongMediaElement.pause();
        setIsTimelinePlaying(false);
      }
      return;
    }

    const mediaElement = mediaRef.current;

    if (!mediaElement) {
      return;
    }

    if (mediaElement.paused) {
      void mediaElement.play().then(() => {
        setIsTimelinePlaying(true);
      });
    } else {
      mediaElement.pause();
      setIsTimelinePlaying(false);
    }
  }, [getActiveGongMediaElement]);

  const replayLessonForSkillChecks = useCallback(() => {
    if (!firstFailedCheckpoint) {
      return;
    }

    pauseGongPlayback();
    setActiveCheckpoint(null);
    setCheckpointFeedback("");
    setRemediationCheckpointId(firstFailedCheckpoint.id);
    setCompletedCheckpointIds((ids) =>
      ids.filter((id) => id !== firstFailedCheckpoint.id)
    );
    setLessonCompleted(false);
    setMaxWatched(skillCheckReplayStart);
    setCurrentTime(skillCheckReplayStart);
    setAutoGongClipSrc(null);
    setIsTimelinePlaying(false);
    lastTriggeredGongClipRef.current = "";

    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.currentTime = skillCheckReplayStart;
      window.setTimeout(() => void mediaRef.current?.play(), 50);
    }
  }, [firstFailedCheckpoint, pauseGongPlayback, skillCheckReplayStart]);

  useEffect(() => {
    if (!reviewMode) {
      return;
    }

    const reviewWindow = window as Window & {
      __uwReviewSeek?: (time: number) => void;
    };
    reviewWindow.__uwReviewSeek = seekTo;

    return () => {
      delete reviewWindow.__uwReviewSeek;
    };
  }, [reviewMode, seekTo]);

  useEffect(() => {
    if (!reviewMode || !reviewSection) {
      return;
    }

    seekTo(reviewSection.start + 0.15);
  }, [reviewMode, reviewSection?.id, seekTo]);

  if (
    !underwriting ||
    Number.isNaN(activeModule) ||
    Number.isNaN(activeLesson) ||
    !module ||
    !lesson
  ) {
    return (
      <Scene
        icon={<AcademicCapIcon />}
        title="Underwriting Lesson"
        transparentHeaderUntilScrolled
        wide
      >
        <NotFound>
          <LearningHero
            current="module-map"
            eyebrow="Underwriting training"
            title="Lesson not found"
          >
            Return to training and choose another lesson.
          </LearningHero>
        </NotFound>
      </Scene>
    );
  }

  return (
    <Scene
      icon={<AcademicCapIcon />}
      title={`${module.title}: Lesson ${lesson.number} of ${module.lessonCount}`}
      transparentHeaderUntilScrolled
      wide
    >
      <Page>
        <LearningHero
          current="module-map"
          eyebrow={`Module ${module.number} · ${underwriting.title}`}
          title={lesson.title}
        >
          Lesson {lesson.number} of {module.lessonCount} · {lesson.duration}
        </LearningHero>

        <LessonWorkspace data-testid="lesson-workspace">
          <MediaColumn>
            <PlayerShell data-testid="lesson-player">
              <PlayerFrame $modalActive={playerModalActive}>
                <StageHeader>
                  <StageKicker>{lesson.title}</StageKicker>
                  <StageTime>
                    {formatTime(displayedTime)} / {formatTime(totalDuration)}
                  </StageTime>
                </StageHeader>
                <StageBody
                  data-testid="lesson-stage-body"
                  $gongMode={Boolean(activeGongClip)}
                  $layout={activeLayout}
                  $tone={activeTone}
                  $videoExpanded={hasWorkflowVideo && workflowVideoExpanded}
                  $videoMode={hasWorkflowVideo}
                >
                  {hasWorkflowVideo && workflowVideoExpanded ? null : (
                    <StageCopyPanel
                      $gongMode={Boolean(activeGongClip)}
                      $layout={activeLayout}
                    >
                      <StageMarker>
                        {activeGongClip
                          ? "Gong call"
                          : visualLabel(activeVisual)}
                      </StageMarker>
                      <StageTitle
                        $compact={compactStageTitle}
                        $gongMode={Boolean(activeGongClip)}
                      >
                        {activeStageTitle}
                      </StageTitle>
                      <StageSubcopy $gongMode={Boolean(activeGongClip)}>
                        {activeGongClip?.prime ??
                          activeSection?.stageCopy ??
                          "Production blueprint ready. Media, captions, objectives, and checkpoints attach to this lesson package."}
                      </StageSubcopy>
                    </StageCopyPanel>
                  )}
                  <StageVisual
                    data-testid="lesson-stage-visual"
                    $gongMode={Boolean(activeGongClip)}
                    $layout={activeLayout}
                    $tone={activeTone}
                    $videoExpanded={hasWorkflowVideo && workflowVideoExpanded}
                    $videoMode={hasWorkflowVideo}
                  >
                    {media?.videoSrc ? (
                      <WorkflowVideoPlayer
                        ref={setMainMediaRef}
                        controls={reviewMode}
                        controlsList="nodownload noplaybackrate"
                        data-testid="lesson-video"
                        onLoadedMetadata={(event) =>
                          updateMediaTime(event.currentTarget)
                        }
                        onEnded={() => {
                          setLessonCompleted(true);
                          setIsTimelinePlaying(false);
                        }}
                        onPlay={() => setWorkflowVideoExpanded(true)}
                        onSeeked={(event) => {
                          keepLearnersFromSeekingForward(event.currentTarget);
                          updateMediaTime(event.currentTarget);
                        }}
                        onSeeking={(event) =>
                          keepLearnersFromSeekingForward(event.currentTarget)
                        }
                        onTimeUpdate={(event) =>
                          updateMediaTime(event.currentTarget)
                        }
                        preload="auto"
                        src={media.videoSrc}
                      >
                        {captionsSrc ? (
                          <track
                            default
                            kind="subtitles"
                            label="English"
                            src={captionsSrc}
                            srcLang="en"
                          />
                        ) : null}
                      </WorkflowVideoPlayer>
                    ) : (
                      renderLessonVisual(
                        activeVisual,
                        activeSection,
                        activeGongEvidence,
                        () => {
                          mediaRef.current?.pause();
                          setIsTimelinePlaying(true);
                        },
                        () => setIsTimelinePlaying(false),
                        autoGongClipSrc,
                        finishAutoGongClip
                      )
                    )}
                  </StageVisual>
                </StageBody>
                {media?.audioSrc || media?.videoSrc ? (
                  <TimelineDock>
                    <TimelinePlayButton
                      aria-label={
                        isTimelinePlaying ? "Pause lesson" : "Play lesson"
                      }
                      onClick={toggleTimelinePlayback}
                      type="button"
                    >
                      {isTimelinePlaying ? "Pause" : "Play"}
                    </TimelinePlayButton>
                    <TimelineTime>{formatTime(displayedTime)}</TimelineTime>
                    <TimelineTrack>
                      <TimelineRange
                        aria-label="Lesson timeline"
                        max={Math.max(totalDuration, 1)}
                        min={0}
                        onChange={(event) =>
                          seekTo(Number(event.currentTarget.value))
                        }
                        onInput={(event) =>
                          seekTo(Number(event.currentTarget.value))
                        }
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(
                            event.pointerId
                          );
                          seekTimelineFromPointer(event);
                        }}
                        onPointerMove={(event) => {
                          if (
                            event.currentTarget.hasPointerCapture(
                              event.pointerId
                            )
                          ) {
                            seekTimelineFromPointer(event);
                          }
                        }}
                        step={0.1}
                        type="range"
                        value={Math.min(displayedTime, totalDuration || 0)}
                      />
                      <TimelineMarkers aria-hidden="true">
                        {timelineMarkers.map((marker) => (
                          <TimelineMarker
                            key={marker.id}
                            style={
                              {
                                "--left": `${(marker.time / Math.max(totalDuration, 1)) * 100}%`,
                              } as CSSProperties
                            }
                            title={marker.label}
                            $type={marker.type}
                          />
                        ))}
                      </TimelineMarkers>
                    </TimelineTrack>
                    <TimelineTime>{formatTime(totalDuration)}</TimelineTime>
                    <PlaybackRateSelect
                      aria-label="Playback speed"
                      onChange={(event) =>
                        changePlaybackRate(
                          Number(event.currentTarget.value) as PlaybackRate
                        )
                      }
                      value={playbackRate}
                    >
                      {PLAYBACK_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}x
                        </option>
                      ))}
                    </PlaybackRateSelect>
                    {captionsSrc ? (
                      <CaptionToggleButton
                        aria-label={
                          captionsEnabled ? "Hide captions" : "Show captions"
                        }
                        disabled={captionsStatus !== "ready"}
                        onClick={() => setCaptionsEnabled((value) => !value)}
                        title={
                          captionsStatus === "error"
                            ? "Captions unavailable"
                            : captionsStatus === "loading"
                              ? "Captions loading"
                              : undefined
                        }
                        type="button"
                        $active={captionsEnabled}
                      >
                        CC
                      </CaptionToggleButton>
                    ) : null}
                  </TimelineDock>
                ) : null}
                {captionsEnabled && activeCaption ? (
                  <CaptionOverlay data-testid="lesson-captions">
                    {activeCaption}
                  </CaptionOverlay>
                ) : null}
                {reviewMode ? (
                  <ReviewModeBadge data-testid="lesson-review-mode">
                    Review mode
                  </ReviewModeBadge>
                ) : null}
                {media?.videoSrc ? null : (
                  <AudioDock>
                    {media?.audioSrc ? (
                      <AudioPlayer
                        ref={setMainMediaRef}
                        data-testid="lesson-audio"
                        onLoadedMetadata={(event) =>
                          updateMediaTime(event.currentTarget)
                        }
                        onPause={() => {
                          if (!autoGongClipSrc) {
                            setIsTimelinePlaying(false);
                          }
                        }}
                        onPlay={() => {
                          if (!autoGongClipSrc) {
                            setIsTimelinePlaying(true);
                          }
                        }}
                        onSeeked={(event) => {
                          keepLearnersFromSeekingForward(event.currentTarget);
                          updateMediaTime(event.currentTarget);
                        }}
                        onSeeking={(event) => {
                          pauseGongPlayback();
                          setIsTimelinePlaying(false);
                          keepLearnersFromSeekingForward(event.currentTarget);
                        }}
                        onTimeUpdate={(event) =>
                          updateMediaTime(event.currentTarget)
                        }
                        onEnded={() => {
                          setLessonCompleted(true);
                          setIsTimelinePlaying(false);
                        }}
                        preload="auto"
                        src={media.audioSrc}
                      >
                        {captionsSrc ? (
                          <track
                            default
                            kind="captions"
                            label="English"
                            src={captionsSrc}
                            srcLang="en"
                          />
                        ) : null}
                      </AudioPlayer>
                    ) : (
                      <MediaMissing>
                        Media is not loaded for this lesson yet.
                      </MediaMissing>
                    )}
                  </AudioDock>
                )}
                <StageProgress aria-hidden="true">
                  <StageProgressFill style={{ width: `${progressValue}%` }} />
                </StageProgress>
              </PlayerFrame>
              {startModalVisible ? (
                <LessonModalOverlay data-testid="lesson-start-modal">
                  <LessonModalPanel>
                    <LessonModalKicker>Before you start</LessonModalKicker>
                    <LessonModalTitle>Take notes as you go.</LessonModalTitle>
                    <LessonModalCopy>
                      Your Module {module.number} notes stay with you across
                      this module and will be available during the quiz. You
                      need 100% to pass, so capture the signals, examples, and
                      tactics as you go.
                    </LessonModalCopy>
                    <LessonModalButton
                      onClick={() => {
                        window.localStorage.setItem(
                          introStorageKey,
                          "dismissed"
                        );
                        setLessonIntroDismissed(true);
                        window.setTimeout(
                          () => void mediaRef.current?.play(),
                          50
                        );
                      }}
                      type="button"
                    >
                      Start lesson
                    </LessonModalButton>
                  </LessonModalPanel>
                </LessonModalOverlay>
              ) : null}
              {completionModalVisible ? (
                <LessonModalOverlay
                  aria-live="polite"
                  data-testid="lesson-complete-modal"
                >
                  <LessonModalPanel
                    $complete={isFinalCourseLesson && !hasSkillCheckMiss}
                  >
                    {isFinalCourseLesson && !hasSkillCheckMiss ? (
                      <CourseConfetti aria-hidden="true">
                        {Array.from({ length: 88 }).map((_, index) => (
                          <span
                            key={index}
                            style={
                              {
                                "--i": index,
                                "--delay": `${(index % 18) * -0.22}s`,
                                "--drift": `${((index % 9) - 4) * 18}px`,
                                "--duration": `${3.6 + (index % 8) * 0.32}s`,
                                "--left": `${(index * 37) % 100}%`,
                              } as CSSProperties
                            }
                          />
                        ))}
                      </CourseConfetti>
                    ) : null}
                    <LessonModalKicker>
                      {completionModalCopy.kicker}
                    </LessonModalKicker>
                    <LessonModalTitle>
                      {completionModalCopy.title}
                    </LessonModalTitle>
                    <LessonModalCopy>
                      {completionModalCopy.body}
                    </LessonModalCopy>
                    {hasSkillCheckMiss ? (
                      <LessonModalButton
                        onClick={replayLessonForSkillChecks}
                        type="button"
                      >
                        {skillCheckReplayLabel}
                      </LessonModalButton>
                    ) : (
                      <LessonModalButton as={Link} to={nextAction.href}>
                        {nextAction.label}
                      </LessonModalButton>
                    )}
                  </LessonModalPanel>
                </LessonModalOverlay>
              ) : null}
              {activeCheckpoint ? (
                <CheckpointOverlay
                  checkpoint={activeCheckpoint}
                  feedback={checkpointFeedback}
                  onAnswer={(option) => {
                    if (option.correct) {
                      setCheckpointFeedback(option.feedback);
                      setCompletedCheckpointIds((ids) =>
                        ids.includes(activeCheckpoint.id)
                          ? ids
                          : [...ids, activeCheckpoint.id]
                      );
                      if (remediationCheckpointId === activeCheckpoint.id) {
                        setFailedCheckpointIds((ids) =>
                          ids.filter((id) => id !== activeCheckpoint.id)
                        );
                        setRemediationCheckpointId("");
                      }
                    } else {
                      setCheckpointFeedback(SKILL_CHECK_MISS_PROMPT);
                      setFailedCheckpointIds((ids) =>
                        ids.includes(activeCheckpoint.id)
                          ? ids
                          : [...ids, activeCheckpoint.id]
                      );
                    }
                  }}
                  onContinue={() => {
                    if (!checkpointFeedback) {
                      return;
                    }

                    setActiveCheckpoint(null);
                    setCheckpointFeedback("");
                    window.setTimeout(() => void mediaRef.current?.play(), 50);
                  }}
                />
              ) : null}
            </PlayerShell>
          </MediaColumn>

          <AsideColumn>
            <LessonRail data-testid="lesson-rail">
              <RailTabs aria-label="Lesson navigation" role="tablist">
                <RailTabButton
                  aria-controls="lesson-objectives-panel"
                  aria-selected={activeRailTab === "objectives"}
                  id="lesson-objectives-tab"
                  onClick={() => setActiveRailTab("objectives")}
                  role="tab"
                  type="button"
                  $active={activeRailTab === "objectives"}
                >
                  <span>Objectives</span>
                  <RailCount>{production?.objectives.length ?? 0}</RailCount>
                </RailTabButton>
                <RailTabButton
                  aria-controls="lesson-sections-panel"
                  aria-selected={activeRailTab === "path"}
                  id="lesson-sections-tab"
                  onClick={() => setActiveRailTab("path")}
                  role="tab"
                  type="button"
                  $active={activeRailTab === "path"}
                >
                  <span>Lesson Path</span>
                  <RailCount>{sections.length}</RailCount>
                </RailTabButton>
                {production?.checkpoints?.length ? (
                  <RailTabButton
                    aria-controls="lesson-checkpoints-panel"
                    aria-selected={activeRailTab === "checks"}
                    id="lesson-checkpoints-tab"
                    onClick={() => setActiveRailTab("checks")}
                    role="tab"
                    type="button"
                    $active={activeRailTab === "checks"}
                  >
                    <span>Skill Checks</span>
                    <RailCount>
                      {checkpointProgress}/{production.checkpoints.length}
                    </RailCount>
                  </RailTabButton>
                ) : null}
              </RailTabs>

              <RailPanel
                aria-labelledby="lesson-objectives-tab"
                data-testid="lesson-objectives"
                hidden={activeRailTab !== "objectives"}
                id="lesson-objectives-panel"
                role="tabpanel"
              >
                <RailPanelHeader>
                  <LessonCardTitle>Lesson Objectives</LessonCardTitle>
                  <RailPanelMeta>Start here</RailPanelMeta>
                </RailPanelHeader>
                {production?.objectives.length ? (
                  <ObjectiveList>
                    {production.objectives.map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ObjectiveList>
                ) : (
                  <EmptyState>
                    Objectives will be drafted from the approved lesson source.
                  </EmptyState>
                )}
                <RailNextUp data-testid="lesson-next-up">
                  <NextLessonLabel>
                    {nextLesson ? "Coming up next" : "Module complete"}
                  </NextLessonLabel>
                  <NextLessonTitle>{nextAction.title}</NextLessonTitle>
                  <NextLessonMeta>{nextAction.meta}</NextLessonMeta>
                  {canAdvanceLesson ? (
                    <NextLessonButton as={Link} to={nextAction.href}>
                      {nextAction.label}
                    </NextLessonButton>
                  ) : (
                    <NextLessonButton as="span" $disabled>
                      {nextAction.label}
                    </NextLessonButton>
                  )}
                </RailNextUp>
                {production?.jobAid ? (
                  <JobAidBlock data-testid="lesson-job-aid">
                    <JobAidEyebrow>Required job aid</JobAidEyebrow>
                    <JobAidTitle>{production.jobAid.title}</JobAidTitle>
                    <JobAidCopy>{production.jobAid.requirement}</JobAidCopy>
                    <JobAidLink
                      href={production.jobAid.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open job aid
                    </JobAidLink>
                  </JobAidBlock>
                ) : null}
              </RailPanel>

              <RailPanel
                aria-labelledby="lesson-sections-tab"
                data-testid="lesson-sections"
                hidden={activeRailTab !== "path"}
                id="lesson-sections-panel"
                role="tabpanel"
              >
                <RailPanelHeader>
                  <LessonCardTitle>Lesson Path</LessonCardTitle>
                  <RailPanelMeta>
                    {reviewMode
                      ? "Click a row to jump"
                      : `${Math.round(watchedProgress)}% watched`}
                  </RailPanelMeta>
                </RailPanelHeader>
                {sections.length ? (
                  <SectionList>
                    {sections.map((section, index) => (
                      <SectionItem
                        key={section.id}
                        data-testid="lesson-section-row"
                        disabled={!reviewMode && section.start > maxWatched}
                        onClick={() => jumpToSection(section, index)}
                        type="button"
                        $active={activeSection?.id === section.id}
                        $complete={maxWatched >= section.end || lessonCompleted}
                        $reviewMode={reviewMode}
                      >
                        <SectionNumber>{index + 1}</SectionNumber>
                        <SectionCopy>
                          <SectionTitle>{section.title}</SectionTitle>
                          <SectionMeta>
                            {formatTime(section.start)} -{" "}
                            {formatTime(section.end)}
                          </SectionMeta>
                        </SectionCopy>
                      </SectionItem>
                    ))}
                  </SectionList>
                ) : (
                  <EmptyState>
                    Sections will appear here once this lesson's timeline is
                    loaded.
                  </EmptyState>
                )}
              </RailPanel>

              {production?.checkpoints?.length ? (
                <RailPanel
                  aria-labelledby="lesson-checkpoints-tab"
                  data-testid="lesson-checkpoints"
                  hidden={activeRailTab !== "checks"}
                  id="lesson-checkpoints-panel"
                  role="tabpanel"
                >
                  <RailPanelHeader>
                    <LessonCardTitle>Lesson Skill Checks</LessonCardTitle>
                    <RailPanelMeta>
                      {checkpointProgress} / {production.checkpoints.length}{" "}
                      complete
                    </RailPanelMeta>
                  </RailPanelHeader>
                  <ProgressMini>
                    <ProgressMiniTrack>
                      <ProgressMiniFill
                        style={{ width: `${watchedProgress}%` }}
                      />
                    </ProgressMiniTrack>
                    <span>
                      {lessonCompleted
                        ? canAdvanceLesson
                          ? "Lesson complete"
                          : "Review required"
                        : `${Math.round(watchedProgress)}% watched`}
                    </span>
                  </ProgressMini>
                  <CheckpointList>
                    {production.checkpoints.map((checkpoint) => (
                      <CheckpointItem
                        key={checkpoint.id}
                        disabled={!reviewMode}
                        onClick={
                          reviewMode
                            ? () =>
                                seekTo(Math.max(0, checkpoint.placement - 0.5))
                            : undefined
                        }
                        type="button"
                        $complete={completedCheckpointIds.includes(
                          checkpoint.id
                        )}
                        $missed={failedCheckpointIds.includes(checkpoint.id)}
                        $reviewMode={reviewMode}
                      >
                        <CheckpointTopline>
                          <span>{checkpoint.label}</span>
                          <span>{formatTime(checkpoint.placement)}</span>
                        </CheckpointTopline>
                        <CheckpointQuestion>
                          {checkpoint.question}
                        </CheckpointQuestion>
                        <CheckpointReview>
                          Review: {checkpoint.reviewTarget}
                        </CheckpointReview>
                      </CheckpointItem>
                    ))}
                  </CheckpointList>
                </RailPanel>
              ) : null}
            </LessonRail>
            <UnderwritingModuleNotes
              courseId="underwriting-training"
              lessonNumber={activeLesson}
              lessonTitle={lesson.title}
              moduleNumber={activeModule}
            />
          </AsideColumn>
        </LessonWorkspace>
        {lockedReason ? <LockNotice>{lockedReason}</LockNotice> : null}
      </Page>
    </Scene>
  );
}

function CheckpointOverlay({
  checkpoint,
  feedback,
  onAnswer,
  onContinue,
}: {
  checkpoint: LessonCheckpoint;
  feedback: string;
  onAnswer: (option: LessonCheckpoint["options"][number]) => void;
  onContinue: () => void;
}) {
  const passed = checkpoint.options.some(
    (option) => option.correct && feedback === option.feedback
  );
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [shuffleSeed] = useState(() => Math.random().toString(36).slice(2));
  const displayOptions = useMemo(
    () => orderCheckpointOptions(checkpoint, shuffleSeed),
    [checkpoint, shuffleSeed]
  );

  return (
    <CheckpointModal
      aria-modal="true"
      data-testid="lesson-checkpoint-overlay"
      role="dialog"
    >
      <CheckpointModalCard>
        <StageMarker>Skill check</StageMarker>
        <CheckpointModalTitle>{checkpoint.question}</CheckpointModalTitle>
        <CheckpointOptions>
          {displayOptions.map((option, index) => (
            <CheckpointAnswer
              key={option.id}
              $correct={Boolean(option.correct)}
              $selected={selectedOptionId === option.id}
              disabled={Boolean(selectedOptionId)}
              onClick={() => {
                setSelectedOptionId(option.id);
                onAnswer(option);
              }}
              type="button"
            >
              <span>{displayOptionLabel(index)}</span>
              {option.text}
            </CheckpointAnswer>
          ))}
        </CheckpointOptions>
        <CheckpointFeedback $passed={passed} $visible={Boolean(feedback)}>
          {feedback || "Select the best answer to continue."}
        </CheckpointFeedback>
        <CheckpointContinue
          disabled={!feedback}
          onClick={onContinue}
          type="button"
        >
          Continue lesson
        </CheckpointContinue>
      </CheckpointModalCard>
    </CheckpointModal>
  );
}

function getActiveSection(sections: LessonSection[], time: number) {
  if (!sections.length) {
    return undefined;
  }

  return (
    sections.find((section) => time >= section.start && time < section.end) ??
    sections[sections.length - 1]
  );
}

function getFallbackVisualKind(kind?: string): LessonVisualKind {
  return kind === "video" ? "workflowVideo" : "opener";
}

function visualLabel(kind: LessonVisualKind) {
  const labels: Record<LessonVisualKind, string> = {
    opener: "context",
    profiles: "profile board",
    exposure: "exposure",
    businessLens: "business lens",
    performanceFrame: "performance frame",
    noPersonalCredit: "no pg / no fico / no ucc",
    terms: "terms",
    takeaway: "takeaway",
    tacticPreview: "three tactics",
    financialLanguage: "financial language",
    balanceSheet: "balance sheet",
    netAssets: "net assets",
    currentRatio: "current ratio",
    runway: "runway",
    statements: "statements",
    underwritingPaths: "path decision",
    documentPacket: "document packet",
    evaluationMatrix: "evaluation factors",
    underwritingCall: "underwriting call",
    lossPattern: "loss pattern",
    ownershipControl: "control risk",
    marginCushion: "margin cushion",
    redFlags: "red flags",
    workflowVideo: "workflow video",
    applicationProcess: "application process",
    signalBoard: "signal read",
  };

  return labels[kind];
}

function getSlideLayout(kind: LessonVisualKind, index: number): SlideLayout {
  if (
    kind === "lossPattern" ||
    kind === "netAssets" ||
    kind === "runway" ||
    kind === "financialLanguage" ||
    kind === "signalBoard"
  ) {
    return "metricLead";
  }

  if (
    index % 3 === 1 ||
    kind === "documentPacket" ||
    kind === "underwritingCall" ||
    kind === "applicationProcess"
  ) {
    return "visualLead";
  }

  return "copyLead";
}

function getSlideTone(kind: LessonVisualKind, index: number): SlideTone {
  if (
    kind === "balanceSheet" ||
    kind === "statements" ||
    kind === "documentPacket" ||
    kind === "profiles"
  ) {
    return "light";
  }

  if (
    kind === "underwritingPaths" ||
    kind === "performanceFrame" ||
    kind === "noPersonalCredit" ||
    kind === "tacticPreview" ||
    kind === "terms" ||
    kind === "evaluationMatrix" ||
    kind === "applicationProcess" ||
    kind === "signalBoard"
  ) {
    return "blue";
  }

  if (kind === "runway" || kind === "marginCushion" || kind === "takeaway") {
    return "lime";
  }

  if (kind === "underwritingCall" || kind === "ownershipControl") {
    return "violet";
  }

  return index % 2 === 0 ? "dark" : "blue";
}

function hasSectionText(section: LessonSection | undefined, pattern: RegExp) {
  return pattern.test(`${section?.title ?? ""} ${section?.stageTitle ?? ""}`);
}

function renderLessonVisual(
  kind: LessonVisualKind,
  section?: LessonSection,
  gongEvidence: UnderwritingGongEvidence[] = [],
  onGongClipPlay?: () => void,
  onGongClipPause?: () => void,
  autoGongClipSrc?: string | null,
  onAutoGongClipEnded?: (
    clip: UnderwritingGongEvidence,
    mediaSrc: string
  ) => void
) {
  if (gongEvidence.length) {
    return (
      <GongEvidenceBoard
        autoClipSrc={autoGongClipSrc}
        clips={gongEvidence}
        onAutoClipEnded={onAutoGongClipEnded}
        onClipPause={onGongClipPause}
        onClipPlay={onGongClipPlay}
      />
    );
  }

  if (kind === "financialLanguage") {
    return (
      <FinancialLanguageBoard>
        <VisualMeta>Financials 101</VisualMeta>
        <FinancialNumber>- $11M</FinancialNumber>
        <FinancialStack>
          <FinancialStackItem>Revenue present</FinancialStackItem>
          <FinancialStackItem>Customers present</FinancialStackItem>
          <FinancialStackItem $alert>
            Balance sheet changed the picture
          </FinancialStackItem>
        </FinancialStack>
      </FinancialLanguageBoard>
    );
  }

  if (kind === "applicationProcess") {
    const title = `${section?.title ?? ""} ${section?.stageTitle ?? ""}`;
    const isIntro = /application is not underwriting/i.test(title);
    const isQualification = /qualification/i.test(title);
    const isBusinessDetails = /business details/i.test(title);
    const isIdentity = /identity verification/i.test(title);
    const isTerms = /terms and conditions/i.test(title);
    const isFinalize = /finalize/i.test(title);
    const isPlaid = /plaid connect/i.test(title);
    const isManual = /manual path|micro deposit/i.test(title);
    const isStatement = /bank statement|statement upload/i.test(title);
    const isDocuments = /documents/i.test(title) && !isStatement;
    const isUnderwriting = /transition to underwriting|after submit/i.test(
      title
    );

    if (isIntro) {
      return (
        <ProcessBoard>
          <ApplicationHandoff>
            <ProcessCard $active>
              <VisualMeta>Application approval</VisualMeta>
              <strong>KYB + KYC verified</strong>
              <span>Business and identity details are cleared first.</span>
            </ProcessCard>
            <ProcessArrow>then</ProcessArrow>
            <ProcessCard>
              <VisualMeta>Underwriting review</VisualMeta>
              <strong>Terms + limits decided later</strong>
              <span>Separate review determines the supportable card path.</span>
            </ProcessCard>
          </ApplicationHandoff>
        </ProcessBoard>
      );
    }

    if (isQualification) {
      return (
        <ProcessBoard>
          <EntityCard>
            <EntityFlag>US entity</EntityFlag>
            <ProcessChecklist>
              <ProcessCheck>U.S. company</ProcessCheck>
              <ProcessCheck>Registration number</ProcessCheck>
              <ProcessCheck>Legal operating entity</ProcessCheck>
            </ProcessChecklist>
          </EntityCard>
        </ProcessBoard>
      );
    }

    if (isBusinessDetails) {
      return (
        <ProcessBoard>
          <ProcessChecklist>
            {[
              "Company details",
              "Monthly spend",
              "Operating address",
              "Website",
              "EIN",
              "Incorporation",
            ].map((item) => (
              <ProcessCheck key={item}>{item}</ProcessCheck>
            ))}
          </ProcessChecklist>
        </ProcessBoard>
      );
    }

    if (isIdentity) {
      return (
        <ProcessBoard>
          <IdentityGrid>
            <IdentityCard $primary>
              <VisualMeta>KYC</VisualMeta>
              <strong>Identity verification</strong>
              <span>Government ID plus selfie verification.</span>
            </IdentityCard>
            <IdentityCard>
              <VisualMeta>Who completes it</VisualMeta>
              <strong>Owners or controller</strong>
              <span>Beneficial owners over 25% or controlling officer.</span>
            </IdentityCard>
          </IdentityGrid>
        </ProcessBoard>
      );
    }

    if (isTerms) {
      return (
        <ProcessBoard>
          <TermsAcceptCard>
            <VisualMeta>Legal acceptance</VisualMeta>
            <strong>Terms and conditions</strong>
            <ProcessChecklist>
              <ProcessCheck>Accept standard application terms</ProcessCheck>
              <ProcessCheck>
                Does not set Net-1, Net-7, Net-15, or Net-30
              </ProcessCheck>
              <ProcessCheck>Does not finalize limits</ProcessCheck>
            </ProcessChecklist>
          </TermsAcceptCard>
        </ProcessBoard>
      );
    }

    if (isFinalize) {
      return (
        <ProcessBoard>
          <ProcessChecklist>
            <ProcessCheck>Step 1: Qualification</ProcessCheck>
            <ProcessCheck>Step 2: Business details</ProcessCheck>
            <ProcessCheck>Step 3: Identity verification</ProcessCheck>
            <ProcessCheck>Step 4: Terms and conditions</ProcessCheck>
          </ProcessChecklist>
          <FinalizeBar>Review and submit</FinalizeBar>
        </ProcessBoard>
      );
    }

    if (isPlaid) {
      return (
        <ProcessBoard>
          <PlaidCard>
            <PlaidMark>Plaid</PlaidMark>
            <strong>Connect bank securely</strong>
            <span>Fastest path: authenticate and verify instantly.</span>
          </PlaidCard>
        </ProcessBoard>
      );
    }

    if (isManual) {
      return (
        <ProcessBoard>
          <ManualBankForm>
            <VisualMeta>Manual bank path</VisualMeta>
            <BankInput>Routing number</BankInput>
            <BankInput>Account number</BankInput>
            <MicroDeposit>Micro-deposit verification</MicroDeposit>
          </ManualBankForm>
        </ProcessBoard>
      );
    }

    if (isStatement) {
      return (
        <ProcessBoard>
          <UploadCard>
            <VisualMeta>Fallback upload</VisualMeta>
            <strong>Recent bank statement</strong>
            <span>
              Upload the actual statement directly in the application.
            </span>
            <UploadRule>Not a screenshot</UploadRule>
          </UploadCard>
        </ProcessBoard>
      );
    }

    if (isDocuments) {
      return (
        <ProcessBoard>
          <DocumentGrid>
            <DocumentRequirement>
              <VisualMeta>Net-1</VisualMeta>
              <strong>Bank statement</strong>
            </DocumentRequirement>
            <DocumentRequirement $heavy>
              <VisualMeta>Float review</VisualMeta>
              <strong>24 months monthly P&L</strong>
              <span>Balance sheets attached with the packet.</span>
            </DocumentRequirement>
          </DocumentGrid>
        </ProcessBoard>
      );
    }

    if (isUnderwriting) {
      return (
        <ProcessBoard>
          <UnderwritingHandoff>
            <ProcessChecklist>
              <ProcessCheck>KYB approved</ProcessCheck>
              <ProcessCheck>KYC approved</ProcessCheck>
            </ProcessChecklist>
            <ProcessArrow>to</ProcessArrow>
            <ProcessCard $active>
              <VisualMeta>Next queue</VisualMeta>
              <strong>Underwriting request</strong>
              <span>Terms and limits are now reviewed separately.</span>
            </ProcessCard>
          </UnderwritingHandoff>
        </ProcessBoard>
      );
    }

    return (
      <ProcessBoard>
        <ProcessChecklist>
          <ProcessCheck>Business verified</ProcessCheck>
          <ProcessCheck>Application complete</ProcessCheck>
          <ProcessCheck>Ready for underwriting</ProcessCheck>
        </ProcessChecklist>
      </ProcessBoard>
    );
  }

  if (kind === "signalBoard") {
    const title = `${section?.title ?? ""} ${section?.stageTitle ?? ""}`;
    const isPersonalCards = /personal credit cards/i.test(title);
    const isBurn = /burn|runway/i.test(title);
    const isFloatOffTable = /float off the table/i.test(title);
    const isIndustry = /industry signals/i.test(title);
    const isReseller = /resellers/i.test(title);
    const isDistributor = /distributors/i.test(title);
    const isDropshipper = /dropshippers/i.test(title);
    const isManufacturer = /manufacturers/i.test(title);
    const isService = /service providers/i.test(title);
    const isPreRevenue = /pre-revenue/i.test(title);
    const isFinal = /automatic qualifications|just flag/i.test(title);

    const signalCards = isPersonalCards
      ? [
          ["Founder card", "Personal cards are funding ads"],
          ["Signal", "Business may need its own spend infrastructure"],
        ]
      : isBurn
        ? [
            ["Revenue", "Growing"],
            ["Burn", "Exceeds revenue"],
            ["Runway", "Short"],
          ]
        : isFloatOffTable
          ? [
              ["Read", "Float may not fit today"],
              ["Next", "Net-1 can still be a clean path"],
            ]
          : isIndustry
            ? [
                ["Resellers", "Inventory ownership risk"],
                ["Distributors", "Long cash cycle"],
                ["Dropshippers", "Thin asset support"],
              ]
            : isReseller
              ? [
                  [
                    "Resellers",
                    "Product may move before asset support is clear",
                  ],
                ]
              : isDistributor
                ? [
                    [
                      "Distributors",
                      "Supplier cash out before customer cash in",
                    ],
                  ]
                : isDropshipper
                  ? [
                      [
                        "Dropshippers",
                        "Little owned inventory to support float",
                      ],
                    ]
                  : isManufacturer
                    ? [
                        [
                          "Manufacturers",
                          "R&D, tooling, production, shipping delays",
                        ],
                      ]
                    : isService
                      ? [
                          [
                            "Service providers",
                            "Payroll runs before client payment",
                          ],
                        ]
                      : isPreRevenue
                        ? [
                            [
                              "Pre-revenue DTC",
                              "Ad spend ahead of profitability",
                            ],
                          ]
                        : isFinal
                          ? [
                              ["Do not disqualify", "These are signals"],
                              ["Rep action", "Just flag them early"],
                            ]
                          : [
                              ["Fit", "Float may be supportable"],
                              ["Net-1", "Cleaner starting path"],
                              ["Stop", "Not ready for underwriting"],
                            ];

    return (
      <SignalBoard>
        <SignalGrid>
          {signalCards.map(([label, body]) => (
            <SignalCard key={label}>
              <VisualMeta>{label}</VisualMeta>
              <strong>{body}</strong>
            </SignalCard>
          ))}
        </SignalGrid>
      </SignalBoard>
    );
  }

  if (kind === "tacticPreview") {
    const gettingAheadTactics = hasSectionText(
      section,
      /minimize the ask|separate easy from hard|say it before they ask/i
    );
    const concernResponseTactics = hasSectionText(
      section,
      /validate, align, answer|direct answer, then pivot|redirect when you hit a wall/i
    );
    const activeTactic = hasSectionText(section, /tactic 2/i)
      ? 2
      : hasSectionText(section, /tactic 3/i)
        ? 3
        : 1;
    const tacticItems = concernResponseTactics
      ? [
          "Validate, align, answer",
          "Direct answer, then pivot to simplicity",
          "Redirect when you hit a wall",
        ]
      : gettingAheadTactics
        ? [
            "Minimize the ask",
            "Separate easy from hard",
            "Say it before they ask",
          ]
        : [
            "Frame underwriting as performance-based",
            "Differentiate the approach",
            "Position the path without over-committing",
          ];

    return (
      <TacticPreviewBoard>
        <TacticPreviewHeader>
          <VisualMeta>
            {concernResponseTactics || gettingAheadTactics
              ? "Concern path"
              : "Lesson path"}
          </VisualMeta>
        </TacticPreviewHeader>
        <TacticPreviewList>
          {tacticItems.map((item, index) => (
            <TacticPreviewItem
              $active={
                concernResponseTactics || gettingAheadTactics
                  ? index + 1 === activeTactic
                  : index === 0
              }
              key={item}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </TacticPreviewItem>
          ))}
        </TacticPreviewList>
      </TacticPreviewBoard>
    );
  }

  if (kind === "balanceSheet") {
    return (
      <ConceptGrid>
        <ConceptTile>
          <VisualMeta>Balance sheet</VisualMeta>
          <strong>Owns</strong>
          <span>Cash, inventory, equipment, receivables</span>
        </ConceptTile>
        <ConceptTile>
          <VisualMeta>Liabilities</VisualMeta>
          <strong>Owes</strong>
          <span>Loans, payables, credit lines</span>
        </ConceptTile>
        <ConceptEquation>Owns - Owes = Position</ConceptEquation>
      </ConceptGrid>
    );
  }

  if (kind === "netAssets") {
    return (
      <NetAssetBoard>
        <NetAssetRow>
          <span>Total assets</span>
          <strong>$3.0M</strong>
        </NetAssetRow>
        <NetAssetRow $negative>
          <span>Total liabilities</span>
          <strong>-$4.5M</strong>
        </NetAssetRow>
        <NetAssetResult>
          <span>Net asset position</span>
          <strong>-$1.5M</strong>
        </NetAssetResult>
      </NetAssetBoard>
    );
  }

  if (kind === "currentRatio") {
    return (
      <RatioBoard>
        <RatioFormula>
          <strong>Current assets</strong>
          <span>divided by</span>
          <strong>Current liabilities</strong>
        </RatioFormula>
        <RatioExamples>
          <RatioCard $good>
            <VisualMeta>Example A</VisualMeta>
            <strong>1.25</strong>
            <span>$100K / $80K</span>
          </RatioCard>
          <RatioCard>
            <VisualMeta>Example B</VisualMeta>
            <strong>0.67</strong>
            <span>$100K / $150K</span>
          </RatioCard>
        </RatioExamples>
      </RatioBoard>
    );
  }

  if (kind === "runway") {
    return (
      <RunwayBoard>
        <RunwayFormula>
          <span>Bank balance</span>
          <strong>$600K</strong>
          <span>Monthly burn</span>
          <strong>$50K</strong>
        </RunwayFormula>
        <RunwayMonths>
          {Array.from({ length: 12 }, (_, index) => (
            <RunwayMonth key={index}>M{index + 1}</RunwayMonth>
          ))}
        </RunwayMonths>
        <RunwayRule>12 months supports extended-term confidence</RunwayRule>
      </RunwayBoard>
    );
  }

  if (kind === "statements") {
    return (
      <StatementBoard>
        <StatementCard>
          <VisualMeta>P&L</VisualMeta>
          <strong>Movie</strong>
          <span>Revenue minus expenses over time.</span>
        </StatementCard>
        <StatementCard>
          <VisualMeta>Balance sheet</VisualMeta>
          <strong>Photograph</strong>
          <span>What the business owns and owes today.</span>
        </StatementCard>
        <StatementCard $accent>
          <VisualMeta>Gross margin</VisualMeta>
          <strong>Cushion</strong>
          <span>Room to absorb a bad month.</span>
        </StatementCard>
      </StatementBoard>
    );
  }

  if (kind === "underwritingPaths") {
    const applicationPath = hasSectionText(section, /application|proposal/i);
    const positionPath = hasSectionText(
      section,
      /position the path|net-1|extended terms|float|terms/i
    );
    const netOnePath = hasSectionText(
      section,
      /net-1|no financials|reassurance/i
    );

    return (
      <PathBoard>
        <PathCard $active>
          <VisualMeta>{applicationPath ? "Step 01" : "Start here"}</VisualMeta>
          <strong>{applicationPath ? "Application" : "Net-1"}</strong>
          <span>
            {applicationPath
              ? "Starts the review, but does not lock final terms."
              : positionPath
                ? "Lead with the lighter path while terms are still unknown."
                : netOnePath
                  ? "Lighter review path without the extended-term statements packet."
                  : "Application, KYC, bank proof, address, EIN."}
          </span>
        </PathCard>
        <PathArrow>then</PathArrow>
        <PathCard>
          <VisualMeta>
            {applicationPath
              ? "Step 02"
              : positionPath
                ? "Underwriting review"
                : "Evaluate later"}
          </VisualMeta>
          <strong>
            {applicationPath
              ? "Underwriting"
              : positionPath
                ? "Extended terms"
                : "Uncover extended terms"}
          </strong>
          <span>
            {applicationPath
              ? "Reads profile, packet, timing, and supportable limits."
              : positionPath
                ? "Underwriting determines whether float is supportable from the profile and packet."
                : "Discuss only when the prospect needs it and underwriting has the packet to evaluate it."}
          </span>
        </PathCard>
      </PathBoard>
    );
  }

  if (kind === "documentPacket") {
    const handoff = hasSectionText(section, /handoff|bank|fallback/i);
    const confidentiality = hasSectionText(
      section,
      /confidential|float|financial documents/i
    );

    return (
      <PacketBoard>
        <PacketStack>
          <PacketItem $complete>
            {handoff ? "Bank connection" : "Application"}
          </PacketItem>
          <PacketItem $complete>
            {handoff ? "Statement fallback" : "KYC / KYB"}
          </PacketItem>
          <PacketItem $complete>
            {handoff ? "Clean upload" : "Bank proof"}
          </PacketItem>
          <PacketItem $complete>
            {handoff ? "UW-ready handoff" : "EIN + address"}
          </PacketItem>
        </PacketStack>
        <PacketPlus>+</PacketPlus>
        <PacketStack>
          <PacketItem $accent>
            {confidentiality
              ? "Requested terms packet"
              : "24 months monthly financials"}
          </PacketItem>
          <PacketItem>Balance sheet</PacketItem>
          <PacketItem>Income statement / P&L</PacketItem>
        </PacketStack>
      </PacketBoard>
    );
  }

  if (kind === "underwritingCall") {
    const validatePattern = hasSectionText(
      section,
      /validate|align|answer|andy doesn't just say no|three-step/i
    );
    const directAnswer = hasSectionText(
      section,
      /direct answer|simplicity|credit-check/i
    );
    const redirectWall = hasSectionText(
      section,
      /redirect|wall|identity|shop lc|personal concern/i
    );
    const reasonAsk = hasSectionText(section, /reason|ask/i);
    const timing = hasSectionText(section, /timing|simple|next/i);
    const labels = directAnswer
      ? ["Direct no", "Simple process", "Next step"]
      : redirectWall
        ? ["Name the wall", "Redirect owner", "Keep momentum"]
        : validatePattern
          ? ["Validate concern", "Align on values", "Answer directly"]
          : reasonAsk
            ? ["Reason", "Question", "Outcome"]
            : timing
              ? ["Rep sets context", "Focused follow-up", "UW can decide"]
              : ["AE context", "UW team + customer call", "Terms calibrated"];

    return (
      <CallBoard>
        <CallStep>{labels[0]}</CallStep>
        <CallConnector />
        <CallStep $accent>{labels[1]}</CallStep>
        <CallConnector />
        <CallStep>{labels[2]}</CallStep>
      </CallBoard>
    );
  }

  if (kind === "evaluationMatrix") {
    const proposal = hasSectionText(section, /proposal|application/i);
    const discovery = hasSectionText(section, /revenue|spend|signals/i);
    const labels = proposal
      ? ["Application", "Packet quality", "Profile read", "Timing", "Proposal"]
      : discovery
        ? ["Revenue", "Spend pattern", "Cash", "Debt", "Margins"]
        : [
            "Cash runway",
            "Revenue trajectory",
            "Profitability path",
            "Debt context",
            "Company structure",
          ];

    return (
      <MatrixBoard>
        {labels.map((label, index) => (
          <MatrixCell key={label} $value={[82, 68, 58, 44, 72][index]}>
            {label}
          </MatrixCell>
        ))}
      </MatrixBoard>
    );
  }

  if (kind === "lossPattern") {
    return (
      <LossBoard>
        <LossNumber>$6.7M</LossNumber>
        <DealGrid>
          {Array.from({ length: 9 }, (_, index) => (
            <DealCell key={index}>Deal {index + 1}</DealCell>
          ))}
        </DealGrid>
        <LossRule>Pattern missed before underwriting</LossRule>
      </LossBoard>
    );
  }

  if (kind === "ownershipControl") {
    return (
      <ControlBoard>
        <ControlNode $parent>Parent company</ControlNode>
        <ControlLine />
        <ControlNode>Operating entity</ControlNode>
        <ControlCaption>
          Revenue shown here. Cash control may sit above.
        </ControlCaption>
      </ControlBoard>
    );
  }

  if (kind === "marginCushion") {
    return (
      <MarginBoard>
        <MarginStack>
          <MarginSlice $height={46}>Revenue</MarginSlice>
          <MarginSlice $height={24}>Cost of goods</MarginSlice>
          <MarginSlice $height={14}>Operating expense</MarginSlice>
          <MarginSlice $height={8} $risk>
            Repayment cushion
          </MarginSlice>
        </MarginStack>
        <MarginRule>Thin margin leaves little room for timing risk</MarginRule>
      </MarginBoard>
    );
  }

  if (kind === "redFlags") {
    const questionRisk = hasSectionText(
      section,
      /questions feel risky|objection/i
    );
    const personalConcerns = hasSectionText(
      section,
      /personal concerns|not every concern|discomfort with documents|hesitation about personal guarantees/i
    );
    const concern = hasSectionText(section, /concern/i);
    const flags = questionRisk
      ? [
          "No reason given",
          "Exact numbers too early",
          "Defensive answer",
          "No softer follow-up",
        ]
      : personalConcerns
        ? [
            "Discomfort with documents",
            "Worry about credit checks",
            "Hesitation about personal guarantees",
          ]
        : concern
          ? [
              "PG concern",
              "Credit check concern",
              "UCC concern",
              "Financials concern",
            ]
          : [
              "Recent bankruptcy",
              "Thin gross margin",
              "Parent controls cash",
              "Revenue hides distress",
            ];

    return (
      <FlagBoard>
        {flags.map((flag) => (
          <FlagItem key={flag}>{flag}</FlagItem>
        ))}
      </FlagBoard>
    );
  }

  if (kind === "profiles") {
    return (
      <ProfileBoard>
        <ProfileCard>
          <VisualMeta>Profile 01</VisualMeta>
          <strong>Ad spend</strong>
          <span>High daily limits for paid media volume.</span>
        </ProfileCard>
        <ProfileCard>
          <VisualMeta>Profile 02</VisualMeta>
          <strong>Shipping</strong>
          <span>Carrier spend already happening every day.</span>
        </ProfileCard>
        <ProfileCard>
          <VisualMeta>Profile 03</VisualMeta>
          <strong>Supplier payments</strong>
          <span>Inventory, raw materials, suppliers.</span>
        </ProfileCard>
      </ProfileBoard>
    );
  }

  if (kind === "exposure") {
    return (
      <ExposureBoard>
        <ExposureHeader>
          <strong>$500K</strong>
          <span>Net-15</span>
        </ExposureHeader>
        <ExposureDays>
          <ExposureDay $active>Day 1 spend</ExposureDay>
          <ExposureDay>Day 5</ExposureDay>
          <ExposureDay>Day 10</ExposureDay>
          <ExposureDay $paid>Day 15 auto repay</ExposureDay>
        </ExposureDays>
        <ExposureRule>We carry exposure until repayment</ExposureRule>
      </ExposureBoard>
    );
  }

  if (kind === "businessLens") {
    const personalStructural = hasSectionText(
      section,
      /personal concern|structural blocker|company policy/i
    );
    if (personalStructural) {
      return (
        <CompareBoard>
          <ComparePanel>
            <VisualMeta>Personal concern</VisualMeta>
            <strong>Redirect</strong>
            <span>
              Find the stakeholder who can complete the required step.
            </span>
          </ComparePanel>
          <ComparePanel $dark>
            <VisualMeta>Structural blocker</VisualMeta>
            <strong>Reroute</strong>
            <span>
              Policy or governance may require Net-1 or a different process.
            </span>
          </ComparePanel>
        </CompareBoard>
      );
    }

    return (
      <CompareBoard>
        <ComparePanel>
          <VisualMeta>Traditional lens</VisualMeta>
          <strong>Founder profile</strong>
          <span>FICO, PG, personal signals.</span>
        </ComparePanel>
        <ComparePanel $dark>
          <VisualMeta>Dash.fi lens</VisualMeta>
          <strong>Business performance</strong>
          <span>Revenue, cash, trajectory.</span>
        </ComparePanel>
      </CompareBoard>
    );
  }

  if (kind === "performanceFrame") {
    return (
      <PerformanceFrameBoard>
        <PerformanceFrameCard $active>
          <PerformanceFrameTitleRow>
            <VisualMeta>01</VisualMeta>
            <strong>Name the model</strong>
          </PerformanceFrameTitleRow>
          <span>Performance-based underwriting.</span>
        </PerformanceFrameCard>
        <PerformanceFrameCard>
          <PerformanceFrameTitleRow>
            <VisualMeta>02</VisualMeta>
            <strong>Connect it to growth</strong>
          </PerformanceFrameTitleRow>
          <span>We can scale with busy seasons or growth.</span>
        </PerformanceFrameCard>
        <PerformanceFrameCard>
          <PerformanceFrameTitleRow>
            <VisualMeta>03</VisualMeta>
            <strong>Give a concrete anchor</strong>
          </PerformanceFrameTitleRow>
          <span>A quarter of daily bank balance.</span>
        </PerformanceFrameCard>
      </PerformanceFrameBoard>
    );
  }

  if (kind === "noPersonalCredit") {
    return (
      <NoPersonalCreditBoard>
        <NoPersonalCreditItem>
          <span>No PG</span>
          <strong>No founder guarantee</strong>
        </NoPersonalCreditItem>
        <NoPersonalCreditItem>
          <span>No FICO</span>
          <strong>No personal credit pull</strong>
        </NoPersonalCreditItem>
        <NoPersonalCreditItem>
          <span>No UCC</span>
          <strong>No lien on the business</strong>
        </NoPersonalCreditItem>
      </NoPersonalCreditBoard>
    );
  }

  if (kind === "terms") {
    return (
      <TermsBoard>
        <TermOptions>
          <Term $active>Net-1</Term>
          <Term>Net-7</Term>
          <Term>Net-15</Term>
          <Term>Net-30</Term>
        </TermOptions>
        <SignalRows>
          <SignalRow $value={62}>Cash position</SignalRow>
          <SignalRow $value={52}>Revenue trajectory</SignalRow>
          <SignalRow $value={36}>Net asset position</SignalRow>
          <SignalRow $value={48}>Profitability</SignalRow>
        </SignalRows>
      </TermsBoard>
    );
  }

  if (kind === "takeaway") {
    const concernHandling = hasSectionText(
      section,
      /address the concern before it becomes one|minimize the ask|separate easy from hard|say the things prospects worry/i
    );
    const contentiousQuestions = hasSectionText(
      section,
      /make it normal|reason phrase|contentious|here's what we covered/i
    );
    const takeawayItems = concernHandling
      ? [
          "Minimize the ask before concern builds.",
          "Separate Net-1 from extended-term review.",
          "Say PG, credit check, and UCC concerns early.",
        ]
      : contentiousQuestions
        ? [
            "Give the reason before the hard question.",
            "Lower the commitment when the answer is vague.",
            "Make the question serve product fit.",
          ]
        : [
            "We carry repayment exposure.",
            "Underwriting reads the business.",
            "Terms match the financial profile.",
          ];

    return (
      <TakeawayBoard>
        <TakeawayChip>Lesson takeaways</TakeawayChip>
        {takeawayItems.map((item) => (
          <TakeawayItem key={item}>{item}</TakeawayItem>
        ))}
      </TakeawayBoard>
    );
  }

  if (kind === "workflowVideo") {
    return (
      <WorkflowBoard>
        <VisualMeta>Screen recording package</VisualMeta>
        <strong>Workflow walkthrough</strong>
        <span>Video, captions, sparse callouts, and checks attach here.</span>
      </WorkflowBoard>
    );
  }

  return (
    <OpenerBoard>
      <DashLogo>dash.fi</DashLogo>
      <OpenerRail>
        <span>High-limit corporate cards</span>
        <span>No personal guarantee</span>
        <span>Cashback</span>
        <span>Float options available</span>
      </OpenerRail>
    </OpenerBoard>
  );
}

function GongEvidenceBoard({
  autoClipSrc,
  clips,
  onAutoClipEnded,
  onClipPause,
  onClipPlay,
}: {
  autoClipSrc?: string | null;
  clips: UnderwritingGongEvidence[];
  onAutoClipEnded?: (clip: UnderwritingGongEvidence, mediaSrc: string) => void;
  onClipPause?: () => void;
  onClipPlay?: () => void;
}) {
  const clip = clips[0];

  if (!clip) {
    return null;
  }

  return (
    <GongBoard data-testid="gong-evidence-board">
      <GongClipCard key={`${clip.callId}-${clip.label}`}>
        <GongClipTopline>
          <GongSpeaker>{clip.speaker}</GongSpeaker>
          <GongTimestamp>{formatGongTimestamp(clip)}</GongTimestamp>
        </GongClipTopline>
        {clip.topic ? <GongTopic>{clip.topic}</GongTopic> : null}
        <GongPrime>{clip.prime}</GongPrime>
        <GongMediaStack>
          {getVisibleGongMediaSegments(clip, autoClipSrc).map(
            (segment, index) => (
              <GongMediaPlayer
                autoClipSrc={autoClipSrc}
                clip={clip}
                key={`${segment.mediaSrc}-${index}`}
                onAutoClipEnded={onAutoClipEnded}
                onClipPause={onClipPause}
                onClipPlay={onClipPlay}
                segment={segment}
              />
            )
          )}
        </GongMediaStack>
      </GongClipCard>
    </GongBoard>
  );
}

type GongMediaSegmentData = {
  label?: string;
  startTimestamp: string;
  endTimestamp: string;
  mediaSrc: string;
  posterSrc: string;
  approvedText: string;
};

function GongMediaPlayer({
  autoClipSrc,
  clip,
  onAutoClipEnded,
  segment,
  onClipPause,
  onClipPlay,
}: {
  autoClipSrc?: string | null;
  clip: UnderwritingGongEvidence;
  onAutoClipEnded?: (clip: UnderwritingGongEvidence, mediaSrc: string) => void;
  segment: GongMediaSegmentData;
  onClipPause?: () => void;
  onClipPlay?: () => void;
}) {
  const mediaElementRef = useRef<HTMLMediaElement | null>(null);
  const lastAutoClipSrcRef = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const displayMode = clip.displayMode ?? "video";

  const startAutoPlayback = (mediaElement: HTMLMediaElement) => {
    if (!autoClipSrc || autoClipSrc !== segment.mediaSrc) {
      return;
    }

    if (lastAutoClipSrcRef.current === autoClipSrc) {
      return;
    }

    lastAutoClipSrcRef.current = autoClipSrc;
    mediaElement.currentTime = 0;
    setErrorMessage(null);
    void mediaElement.play().catch(() => {
      setErrorMessage("Use the lesson play button to hear this call.");
    });
  };

  useEffect(() => {
    if (autoClipSrc !== segment.mediaSrc) {
      if (!autoClipSrc) {
        lastAutoClipSrcRef.current = null;
      }
      return;
    }

    if (lastAutoClipSrcRef.current === autoClipSrc) {
      return;
    }

    const mediaElement = mediaElementRef.current;

    if (mediaElement) {
      startAutoPlayback(mediaElement);
    }
  }, [autoClipSrc, segment.mediaSrc]);

  return (
    <GongMediaSegment $displayMode={displayMode}>
      {displayMode === "talkTrack" ? (
        <GongAudio
          data-gong-media="true"
          onEnded={() => {
            if (autoClipSrc === segment.mediaSrc) {
              onAutoClipEnded?.(clip, segment.mediaSrc);
            }
          }}
          onError={() => setErrorMessage("Clip failed to load.")}
          onPause={onClipPause}
          onPlay={() => {
            onClipPlay?.();
            setErrorMessage(null);
          }}
          preload="metadata"
          ref={(node) => {
            mediaElementRef.current = node;
            if (node) {
              startAutoPlayback(node);
            }
          }}
          src={segment.mediaSrc}
        />
      ) : (
        <GongVideo
          $displayMode={displayMode}
          data-gong-media="true"
          onEnded={() => {
            if (autoClipSrc === segment.mediaSrc) {
              onAutoClipEnded?.(clip, segment.mediaSrc);
            }
          }}
          onError={() => setErrorMessage("Clip failed to load.")}
          onPause={onClipPause}
          onPlay={() => {
            onClipPlay?.();
            setErrorMessage(null);
          }}
          playsInline
          poster={segment.posterSrc}
          preload="metadata"
          ref={(node) => {
            mediaElementRef.current = node;
            if (node) {
              startAutoPlayback(node);
            }
          }}
          src={segment.mediaSrc}
        />
      )}
      <GongMediaTopline>
        <strong>{displayMode === "video" ? "Gong clip" : "Talk track"}</strong>
        <span>
          {segment.startTimestamp} - {segment.endTimestamp}
        </span>
      </GongMediaTopline>
      <GongTalkTrack $displayMode={displayMode}>
        {segment.approvedText}
      </GongTalkTrack>
      <GongWaveform $displayMode={displayMode} aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} />
        ))}
      </GongWaveform>
      {errorMessage ? <GongMediaError>{errorMessage}</GongMediaError> : null}
    </GongMediaSegment>
  );
}

function getVisibleGongMediaSegments(
  clip: UnderwritingGongEvidence,
  autoClipSrc?: string | null
) {
  const segments = getGongMediaSegments(clip);
  const activeAutoClipSrc = segments.some(
    (segment) => segment.mediaSrc === autoClipSrc
  )
    ? autoClipSrc
    : null;
  const preferredMediaSrc = activeAutoClipSrc ?? clip.autoMediaSrc;

  if (!preferredMediaSrc) {
    return segments.slice(0, 1);
  }

  const preferred = segments
    .filter((segment) => segment.mediaSrc === preferredMediaSrc)
    .slice(0, 1);

  return preferred.length ? preferred : segments.slice(0, 1);
}

function getPreferredGongMediaSegment(clip: UnderwritingGongEvidence) {
  const segments = getGongMediaSegments(clip);

  return (
    segments.find((segment) => segment.mediaSrc === clip.autoMediaSrc) ??
    segments[0]
  );
}

function getGongMediaSegments(clip: UnderwritingGongEvidence) {
  if (clip.ranges?.some((range) => range.mediaSrc)) {
    return clip.ranges
      .filter(
        (
          range
        ): range is NonNullable<UnderwritingGongEvidence["ranges"]>[number] & {
          mediaSrc: string;
        } => Boolean(range.mediaSrc)
      )
      .map((range, index) => ({
        label: `Part ${index + 1}`,
        startTimestamp: range.startTimestamp,
        endTimestamp: range.endTimestamp,
        mediaSrc: range.mediaSrc,
        posterSrc: getGongPosterSrc(range.mediaSrc),
        approvedText: range.approvedText,
      })) satisfies GongMediaSegmentData[];
  }

  if (clip.mediaSrc && clip.startTimestamp && clip.endTimestamp) {
    return [
      {
        label: "Approved clip",
        startTimestamp: clip.startTimestamp,
        endTimestamp: clip.endTimestamp,
        mediaSrc: clip.mediaSrc,
        posterSrc: getGongPosterSrc(clip.mediaSrc),
        approvedText: clip.approvedText,
      },
    ] satisfies GongMediaSegmentData[];
  }

  return [];
}

function getGongPosterSrc(mediaSrc: string) {
  return mediaSrc.replace(/\.mp4$/, ".jpg");
}

function getActiveGongEvidence(
  clips: UnderwritingGongEvidence[],
  currentTime: number
) {
  if (!clips.length) {
    return [];
  }

  const hasTimedClips = clips.some(
    (clip) =>
      clip.lessonStart !== null &&
      clip.lessonStart !== undefined &&
      clip.lessonEnd !== null &&
      clip.lessonEnd !== undefined
  );

  if (!hasTimedClips) {
    return clips.slice(0, 1);
  }

  const timedClips = clips.filter(
    (
      clip
    ): clip is UnderwritingGongEvidence & {
      lessonEnd: number;
      lessonStart: number;
    } =>
      clip.lessonStart !== null &&
      clip.lessonStart !== undefined &&
      clip.lessonEnd !== null &&
      clip.lessonEnd !== undefined
  );
  const exactMatches = timedClips
    .filter(
      (clip) => currentTime >= clip.lessonStart && currentTime <= clip.lessonEnd
    )
    .sort((a, b) => b.lessonStart - a.lessonStart);

  if (exactMatches.length) {
    return exactMatches.slice(0, 1);
  }

  return timedClips
    .filter(
      (clip) =>
        currentTime >= clip.lessonStart - GONG_TIME_EPSILON_SECONDS &&
        currentTime < clip.lessonStart
    )
    .sort((a, b) => b.lessonStart - a.lessonStart)
    .slice(0, 1);
}

function getActiveGongClipForTime(lessonKey: string, currentTime: number) {
  return getActiveGongEvidence(
    getLessonGongEvidence(lessonKey),
    currentTime
  )[0];
}

function getLessonGongEvidence(lessonKey: string) {
  return Object.entries(underwritingGongEvidenceBySection)
    .filter(([key]) => key.startsWith(`${lessonKey}:`))
    .flatMap(([, clips]) => clips);
}

function getGongClipKey(clip: UnderwritingGongEvidence, mediaSrc: string) {
  return `${clip.callId}:${clip.lessonStart ?? "section"}:${mediaSrc}`;
}

function getActiveNarrationSkipForTime(lessonKey: string, currentTime: number) {
  return (underwritingGongNarrationSkipsByLesson[lessonKey] ?? []).find(
    (skip) => currentTime >= skip.start && currentTime <= skip.end
  );
}

function formatGongTimestamp(clip: UnderwritingGongEvidence) {
  if (clip.startTimestamp && clip.endTimestamp) {
    return `${clip.startTimestamp} - ${clip.endTimestamp}`;
  }

  if (clip.ranges?.length) {
    return clip.ranges
      .map((range) => `${range.startTimestamp}-${range.endTimestamp}`)
      .join(" / ");
  }

  return clip.status;
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function displayOptionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function seededRandom(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;

    return ((hash >>> 0) % 1000000) / 1000000;
  };
}

function shuffleBySeed<T>(items: T[], seed: string) {
  const random = seededRandom(seed);
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

function orderCheckpointOptions(checkpoint: LessonCheckpoint, seed: string) {
  const options = shuffleBySeed(
    checkpoint.options,
    `${checkpoint.id}:${checkpoint.placement}:${seed}:shuffle`
  );
  const correctIndex = options.findIndex((option) => option.correct);

  if (correctIndex < 0 || options.length < 2) {
    return options;
  }

  const targetIndex = Math.floor(
    seededRandom(
      `${checkpoint.id}:${checkpoint.placement}:${seed}:position`
    )() * options.length
  );

  if (targetIndex === correctIndex) {
    return options;
  }

  [options[correctIndex], options[targetIndex]] = [
    options[targetIndex],
    options[correctIndex],
  ];

  return options;
}

function parseDuration(duration: string) {
  const [minutes = "0", seconds = "0"] = duration.split(":");
  return Number(minutes) * 60 + Number(seconds);
}

const Page = styled.div`
  background: ${brand.paper};
  border-radius: 8px;
  display: grid;
  gap: 12px;
  margin: 0;
  min-width: 0;
  padding: 14px 16px 56px;

  ${breakpoint("tablet")`
    margin: -40px -32px 0;
    padding: 18px 32px 64px;
  `};
`;

const LessonWorkspace = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 1440px) {
    grid-template-columns: minmax(0, 1.18fr) 430px;
    align-items: start;
  }

  @media (min-width: 1800px) {
    grid-template-columns: minmax(0, 1.28fr) 470px;
  }
`;

const MediaColumn = styled.div`
  display: grid;
  gap: 12px;
  min-width: 0;
`;

const AsideColumn = styled.aside`
  display: grid;
  gap: 12px;
  min-width: 0;

  @media (min-width: 1440px) {
    grid-template-rows: minmax(0, 1fr) auto;
    height: 660px;
  }

  @media (min-width: 1800px) {
    height: 700px;
  }
`;

const PlayerShell = styled.section`
  background:
    linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    ${brand.dark};
  background-size: 96px 96px;
  border: 1px solid rgba(37, 38, 29, 0.28);
  border-radius: 8px;
  color: #fff;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 560px;
  overflow: hidden;
  position: relative;

  ${breakpoint("tablet")`
    height: 660px;
    min-height: 660px;
  `};

  @media (min-width: 1800px) {
    height: 700px;
    min-height: 700px;
  }
`;

const PlayerFrame = styled.div<{ $modalActive?: boolean }>`
  display: grid;
  grid-row: 1 / -1;
  filter: ${(props) => (props.$modalActive ? "blur(8px)" : "none")};
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 100%;
  pointer-events: ${(props) => (props.$modalActive ? "none" : "auto")};
  position: relative;
  transform: translateZ(0);
  transition:
    filter 180ms ease,
    opacity 180ms ease;

  &::after {
    background: rgba(12, 14, 10, 0.18);
    bottom: 0;
    content: "";
    left: 0;
    opacity: ${(props) => (props.$modalActive ? 1 : 0)};
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    transition: opacity 180ms ease;
    z-index: 3;
  }
`;

const StageHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 22px 24px 0;
`;

const StageKicker = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const StageTime = styled.div`
  color: rgba(255, 255, 255, 0.68);
  font-family: ${brand.mono};
  font-size: 12px;
`;

const StageBody = styled.div<{
  $gongMode?: boolean;
  $layout: SlideLayout;
  $tone: SlideTone;
  $videoExpanded?: boolean;
  $videoMode?: boolean;
}>`
  align-content: stretch;
  background: ${(props) =>
    props.$videoMode
      ? "transparent"
      : props.$tone === "light"
        ? "linear-gradient(135deg, rgba(255,252,245,.11), rgba(255,255,255,.02))"
        : props.$tone === "blue"
          ? "linear-gradient(135deg, rgba(53,76,239,.24), rgba(255,255,255,.02))"
          : props.$tone === "lime"
            ? "linear-gradient(135deg, rgba(237,255,61,.16), rgba(255,255,255,.02))"
            : props.$tone === "violet"
              ? "linear-gradient(135deg, rgba(124,77,255,.22), rgba(255,255,255,.02))"
              : "transparent"};
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr);
  min-height: 0;
  padding: ${(props) =>
    props.$videoMode ? "16px 18px 22px" : "24px 28px 104px"};

  ${breakpoint("tablet")`
    grid-template-columns: ${(props: {
      $gongMode?: boolean;
      $layout: SlideLayout;
      $videoExpanded?: boolean;
      $videoMode?: boolean;
    }) =>
      props.$videoExpanded
        ? "minmax(0, 1fr)"
        : props.$videoMode
          ? "minmax(0, 0.55fr) minmax(420px, 1.45fr)"
          : props.$gongMode
            ? "minmax(0, 1fr)"
            : props.$layout === "visualLead"
              ? "minmax(0, 1.08fr) minmax(0, 0.92fr)"
              : props.$layout === "metricLead"
                ? "minmax(0, 0.66fr) minmax(0, 1.34fr)"
                : "minmax(0, 0.82fr) minmax(0, 1fr)"};
  `};
`;

const StageCopyPanel = styled.div<{
  $gongMode?: boolean;
  $layout: SlideLayout;
}>`
  align-content: center;
  display: ${(props) => (props.$gongMode ? "none" : "grid")};
  min-width: 0;
  order: ${(props) => (props.$layout === "visualLead" ? 2 : 1)};
`;

const StageVisual = styled.div<{
  $gongMode?: boolean;
  $layout: SlideLayout;
  $tone: SlideTone;
  $videoExpanded?: boolean;
  $videoMode?: boolean;
}>`
  align-self: stretch;
  background: ${(props) =>
    props.$videoMode
      ? "rgba(255, 255, 255, 0.055)"
      : props.$tone === "light"
        ? brand.surface
        : props.$tone === "blue"
          ? "rgba(53, 76, 239, 0.26)"
          : props.$tone === "lime"
            ? "rgba(237, 255, 61, 0.12)"
            : props.$tone === "violet"
              ? "rgba(124, 77, 255, 0.22)"
              : "rgba(255, 255, 255, 0.055)"};
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 8px;
  display: grid;
  min-height: ${(props) => (props.$videoMode ? "0" : "260px")};
  min-width: 0;
  order: ${(props) => (props.$layout === "visualLead" ? 1 : 2)};
  overflow: hidden;
  padding: ${(props) =>
    props.$videoMode
      ? "0"
      : props.$gongMode
        ? "14px"
        : props.$layout === "metricLead"
          ? "24px 24px 86px"
          : "20px 20px 86px"};
  position: relative;

  &::after {
    background: linear-gradient(to top, rgba(28, 32, 24, 0.76), transparent);
    bottom: 0;
    content: "";
    height: 78px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    display: ${(props) =>
      props.$videoMode || props.$gongMode ? "none" : "block"};
  }
`;

const StageMarker = styled.div`
  background: ${brand.lime};
  border-radius: 4px;
  color: #123b39;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 7px 9px;
  text-transform: uppercase;
  width: fit-content;
`;

const StageTitle = styled.h2<{ $compact?: boolean; $gongMode?: boolean }>`
  color: #fff;
  font-family: ${brand.mono};
  font-size: ${(props) =>
    props.$compact
      ? "28px"
      : props.$gongMode
        ? "clamp(25px, 2.2vw, 34px)"
        : "clamp(30px, 3.1vw, 42px)"};
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.05;
  margin: 18px 0 0;
  max-width: 100%;
  overflow-wrap: normal;
  word-break: normal;
`;

const StageSubcopy = styled.p<{ $gongMode?: boolean }>`
  color: rgba(255, 255, 255, 0.72);
  font-size: ${(props) => (props.$gongMode ? "15px" : "17px")};
  line-height: ${(props) => (props.$gongMode ? "1.36" : "1.45")};
  margin: 16px 0 0;
  max-width: 620px;
`;

const VisualMeta = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const ProcessBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 16px;
  min-height: 100%;
`;

const ProcessCard = styled.div<{ $active?: boolean }>`
  background: ${(props) => (props.$active ? brand.lavender : "#fff")};
  border: 1px solid
    ${(props) => (props.$active ? "rgba(53, 76, 239, 0.28)" : brand.rule)};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 16px;

  strong {
    font-size: 18px;
    line-height: 1.14;
  }

  span {
    color: ${brand.muted};
    font-size: 13px;
    line-height: 1.35;
  }
`;

const ApplicationHandoff = styled.div`
  align-items: stretch;
  display: grid;
  gap: 10px;
  max-width: 520px;
  width: 100%;

  ${ProcessCard} {
    padding: 14px;
  }

  ${ProcessCard} strong {
    font-size: 16px;
  }

  ${ProcessCard} span {
    font-size: 12px;
  }
`;

const ProcessArrow = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
`;

const EntityCard = styled.div`
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  display: grid;
  gap: 14px;
  padding: 18px;
`;

const EntityFlag = styled.div`
  background: ${brand.mint};
  border: 1px solid rgba(47, 157, 101, 0.22);
  border-radius: 8px;
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 22px;
  font-weight: 900;
  padding: 18px;
  text-align: center;
`;

const ProcessChecklist = styled.div`
  display: grid;
  gap: 8px;
`;

const ProcessCheck = styled.div`
  align-items: center;
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  font-size: 13px;
  font-weight: 800;
  gap: 8px;
  grid-template-columns: 24px minmax(0, 1fr);
  line-height: 1.25;
  padding: 10px 12px;

  &::before {
    align-items: center;
    background: ${brand.mint};
    border: 1px solid rgba(47, 157, 101, 0.24);
    border-radius: 999px;
    color: #12643c;
    content: "✓";
    display: inline-flex;
    font-size: 13px;
    font-weight: 900;
    height: 22px;
    justify-content: center;
    width: 22px;
  }
`;

const IdentityGrid = styled.div`
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `};
`;

const IdentityCard = styled.div<{ $primary?: boolean }>`
  background: ${(props) => (props.$primary ? brand.lavender : "#fff")};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 9px;
  min-width: 0;
  padding: 16px;

  strong {
    font-size: 18px;
    line-height: 1.12;
  }

  span {
    color: ${brand.muted};
    font-size: 13px;
    line-height: 1.34;
  }
`;

const TermsAcceptCard = styled.div`
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 12px;
  padding: 18px;

  strong {
    font-size: 20px;
  }
`;

const FinalizeBar = styled.div`
  background: ${brand.lime};
  border-radius: 8px;
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 900;
  padding: 14px;
  text-align: center;
  text-transform: uppercase;
`;

const PlaidCard = styled.div`
  align-items: center;
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 10px;
  justify-items: center;
  min-height: 230px;
  padding: 20px;
  text-align: center;

  strong {
    font-size: 22px;
  }

  span {
    color: ${brand.muted};
    font-size: 14px;
  }
`;

const PlaidMark = styled.div`
  background: #111;
  border-radius: 8px;
  color: #fff;
  font-family: ${brand.mono};
  font-size: 28px;
  font-weight: 900;
  padding: 14px 20px;
`;

const ManualBankForm = styled.div`
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 10px;
  padding: 18px;
`;

const BankInput = styled.div`
  background: ${brand.paper};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 900;
  padding: 14px;
`;

const MicroDeposit = styled.div`
  background: ${brand.lavender};
  border: 1px solid rgba(53, 76, 239, 0.22);
  border-radius: 8px;
  color: ${brand.blue};
  font-size: 13px;
  font-weight: 900;
  padding: 13px;
`;

const UploadCard = styled.div`
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 10px;
  padding: 18px;

  strong {
    font-size: 22px;
  }

  span {
    color: ${brand.muted};
    font-size: 14px;
    line-height: 1.35;
  }
`;

const UploadRule = styled.div`
  background: ${brand.coral};
  border-radius: 8px;
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  padding: 12px;
  text-transform: uppercase;
`;

const DocumentGrid = styled.div`
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  `};
`;

const DocumentRequirement = styled.div<{ $heavy?: boolean }>`
  background: ${(props) => (props.$heavy ? brand.lavender : "#fff")};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 8px;
  padding: 16px;

  strong {
    font-size: 18px;
    line-height: 1.14;
  }

  span {
    color: ${brand.muted};
    font-size: 13px;
    line-height: 1.34;
  }
`;

const UnderwritingHandoff = styled.div`
  align-items: center;
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  `};
`;

const SignalBoard = styled.div`
  align-content: center;
  display: grid;
  min-height: 100%;
`;

const SignalGrid = styled.div`
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  `};
`;

const SignalCard = styled.div`
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 8px;
  min-height: 112px;
  padding: 16px;

  strong {
    font-size: 17px;
    line-height: 1.16;
  }
`;

const GongBoard = styled.div`
  align-content: start;
  background:
    linear-gradient(135deg, rgba(237, 255, 61, 0.16), transparent 44%),
    linear-gradient(160deg, rgba(53, 76, 239, 0.22), transparent 58%),
    rgba(10, 13, 12, 0.82);
  display: grid;
  min-height: 100%;
  overflow: hidden;
  padding: 10px;
`;

const GongClipCard = styled.article`
  background: transparent;
  border: 0;
  border-radius: 0;
  color: #fff;
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 4px;
`;

const GongClipTopline = styled.div`
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  min-width: 0;
`;

const GongSpeaker = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1.2;
  min-width: 0;
  overflow-wrap: anywhere;
  text-transform: uppercase;
`;

const GongTimestamp = styled.div`
  color: rgba(255, 255, 255, 0.58);
  flex: 0 0 auto;
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 800;
`;

const GongTopic = styled.h3`
  color: #fff;
  font-size: 17px;
  line-height: 1.12;
  margin: 0;
`;

const GongPrime = styled.p`
  color: ${brand.muted};
  font-size: 12px;
  line-height: 1.22;
  margin: 0;
`;

const GongMediaStack = styled.div`
  display: grid;
  gap: 8px;
  min-width: 0;
`;

const GongMediaSegment = styled.div<{ $displayMode?: "talkTrack" | "video" }>`
  background: ${(props) =>
    props.$displayMode === "video"
      ? "transparent"
      : "rgba(255, 252, 245, 0.96)"};
  border: 0;
  border-radius: 8px;
  box-shadow: ${(props) =>
    props.$displayMode === "video"
      ? "none"
      : "0 16px 34px rgba(10, 13, 12, 0.24)"};
  display: grid;
  gap: ${(props) => (props.$displayMode === "video" ? "8px" : "10px")};
  min-width: 0;
  padding: ${(props) => (props.$displayMode === "video" ? "0" : "12px")};
  position: relative;
`;

const GongMediaTopline = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;

  strong,
  span {
    font-family: ${brand.mono};
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  strong {
    color: ${brand.blue};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${brand.muted};
    flex: 0 0 auto;
  }
`;

const GongVideo = styled.video<{ $displayMode?: "talkTrack" | "video" }>`
  aspect-ratio: 16 / 9;
  background: #050607;
  border: 0;
  border-radius: 5px;
  box-shadow: none;
  display: block;
  height: auto;
  max-height: 390px;
  object-fit: contain;
  position: static;
  width: 100%;
`;

const GongAudio = styled.audio`
  height: 1px;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  display: block;
  width: 1px;
`;

const GongTalkTrack = styled.blockquote<{
  $displayMode?: "talkTrack" | "video";
}>`
  border-left: 4px solid ${brand.lime};
  color: ${brand.ink};
  display: ${(props) => (props.$displayMode === "video" ? "none" : "block")};
  font-size: ${(props) =>
    props.$displayMode === "video" ? "clamp(13px, 1.05vw, 16px)" : "14px"};
  line-height: ${(props) => (props.$displayMode === "video" ? "1.2" : "1.14")};
  margin: 0;
  max-height: ${(props) => (props.$displayMode === "video" ? "78px" : "none")};
  overflow: visible;
  padding: ${(props) =>
    props.$displayMode === "video" ? "1px 0 1px 12px" : "2px 0 2px 16px"};
  white-space: pre-line;
`;

const GongWaveform = styled.div<{ $displayMode?: "talkTrack" | "video" }>`
  align-items: end;
  display: ${(props) => (props.$displayMode === "video" ? "none" : "grid")};
  gap: 4px;
  grid-template-columns: repeat(18, minmax(0, 1fr));
  height: 22px;

  span {
    background: linear-gradient(to top, ${brand.blue}, ${brand.lime});
    border-radius: 999px;
    display: block;
    height: 42%;
    opacity: 0.82;
  }

  span:nth-child(2n) {
    height: 74%;
  }

  span:nth-child(3n) {
    height: 56%;
  }

  span:nth-child(5n) {
    height: 92%;
  }
`;

const GongMediaError = styled.span`
  color: #a2392f;
  font-size: 12px;
  font-weight: 800;
`;

const OpenerBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 22px;
  min-height: 100%;
`;

const DashLogo = styled.div`
  color: #fff;
  font-family: ${brand.mono};
  font-size: 38px;
  letter-spacing: 0;
`;

const OpenerRail = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  span {
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.78);
    font-family: ${brand.mono};
    font-size: 13px;
    font-weight: 800;
    line-height: 1.25;
    min-height: 66px;
    padding: 14px;
    text-transform: uppercase;
  }
`;

const TacticPreviewBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 18px;
  min-height: 100%;
`;

const TacticPreviewHeader = styled.div`
  align-items: end;
  display: flex;
  justify-content: space-between;
  gap: 18px;

  strong {
    color: #fff;
    font-size: clamp(30px, 3vw, 44px);
    line-height: 1;
  }
`;

const TacticPreviewList = styled.div`
  display: grid;
  gap: 10px;
`;

const TacticPreviewItem = styled.div<{ $active?: boolean }>`
  align-items: center;
  background: ${(props) =>
    props.$active ? "rgba(237, 255, 61, 0.96)" : "rgba(255, 255, 255, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(237, 255, 61, 0.96)" : "rgba(255, 255, 255, 0.18)"};
  border-radius: 8px;
  color: ${(props) => (props.$active ? brand.ink : "#fff")};
  display: grid;
  gap: 12px;
  grid-template-columns: 46px minmax(0, 1fr);
  min-height: 70px;
  padding: 13px 14px;

  span {
    align-items: center;
    background: ${(props) =>
      props.$active ? brand.ink : "rgba(255, 255, 255, 0.12)"};
    border-radius: 6px;
    color: ${(props) => (props.$active ? "#fff" : brand.lime)};
    display: inline-flex;
    font-family: ${brand.mono};
    font-size: 13px;
    font-weight: 900;
    height: 38px;
    justify-content: center;
  }

  strong {
    font-size: clamp(16px, 1.35vw, 21px);
    line-height: 1.1;
  }
`;

const PerformanceFrameBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 10px;
  min-height: 100%;
`;

const PerformanceFrameCard = styled.div<{ $active?: boolean }>`
  background: ${(props) =>
    props.$active ? "rgba(237, 255, 61, 0.96)" : "rgba(255, 255, 255, 0.12)"};
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(237, 255, 61, 0.96)" : "rgba(255, 255, 255, 0.18)"};
  border-radius: 8px;
  color: ${(props) => (props.$active ? brand.ink : "#fff")};
  display: grid;
  gap: 7px;
  min-height: 80px;
  padding: 14px;

  ${VisualMeta} {
    color: ${(props) => (props.$active ? brand.ink : brand.lime)};
    min-width: 28px;
  }

  strong {
    font-size: clamp(17px, 1.38vw, 22px);
    line-height: 1.05;
    min-width: 0;
  }

  span:last-child {
    color: ${(props) =>
      props.$active ? "rgba(32, 48, 45, 0.78)" : "rgba(255, 255, 255, 0.72)"};
    font-size: clamp(11px, 0.88vw, 13px);
    font-weight: 800;
    line-height: 1.15;
  }
`;

const PerformanceFrameTitleRow = styled.div`
  align-items: baseline;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
`;

const NoPersonalCreditBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 12px;
  min-height: 100%;
`;

const NoPersonalCreditItem = styled.div`
  align-items: center;
  background: rgba(255, 252, 245, 0.96);
  border: 1px solid rgba(237, 255, 61, 0.38);
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 12px;
  grid-template-columns: 88px minmax(0, 1fr);
  min-height: 76px;
  padding: 14px;

  span {
    align-items: center;
    background: ${brand.blue};
    border-radius: 6px;
    color: #fff;
    display: inline-flex;
    font-family: ${brand.mono};
    font-size: 13px;
    font-weight: 900;
    height: 42px;
    justify-content: center;
    text-transform: uppercase;
  }

  strong {
    font-size: clamp(18px, 1.5vw, 24px);
    line-height: 1.05;
  }
`;

const FinancialLanguageBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 18px;
  min-height: 100%;
`;

const FinancialNumber = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 54px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1;
`;

const FinancialStack = styled.div`
  display: grid;
  gap: 8px;
`;

const FinancialStackItem = styled.div<{ $alert?: boolean }>`
  background: ${(props) =>
    props.$alert ? brand.lime : "rgba(255,255,255,.08)"};
  border: 1px solid
    ${(props) => (props.$alert ? brand.lime : "rgba(255,255,255,.18)")};
  border-radius: 7px;
  color: ${(props) => (props.$alert ? "#123b39" : "#fff")};
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  padding: 13px 14px;
  text-transform: uppercase;
`;

const ConceptGrid = styled.div`
  align-content: center;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 100%;
`;

const ConceptTile = styled.div`
  background: ${brand.surface};
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 10px;
  min-height: 142px;
  padding: 18px;

  strong {
    font-size: 29px;
    line-height: 1;
  }

  span {
    color: ${brand.muted};
    font-size: 14px;
    line-height: 1.35;
  }
`;

const ConceptEquation = styled.div`
  background: ${brand.lime};
  border-radius: 7px;
  color: #123b39;
  font-family: ${brand.mono};
  font-size: 16px;
  font-weight: 900;
  grid-column: 1 / -1;
  padding: 15px 16px;
  text-align: center;
  text-transform: uppercase;
`;

const NetAssetBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 10px;
  min-height: 100%;
`;

const NetAssetRow = styled.div<{ $negative?: boolean }>`
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  padding: 16px;

  span {
    color: rgba(255, 255, 255, 0.74);
    font-family: ${brand.mono};
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  strong {
    color: ${(props) => (props.$negative ? "#ffaaa6" : "#fff")};
    font-family: ${brand.mono};
    font-size: 29px;
    line-height: 1;
  }
`;

const NetAssetResult = styled(NetAssetRow)`
  background: ${brand.lime};
  border-color: ${brand.lime};
  color: #123b39;

  span,
  strong {
    color: #123b39;
  }
`;

const RatioBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 16px;
  min-height: 100%;
`;

const RatioFormula = styled.div`
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  display: grid;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr);
  padding: 16px;
  text-align: center;

  strong {
    font-family: ${brand.mono};
    font-size: 19px;
    text-transform: uppercase;
  }

  span {
    color: ${brand.lime};
    font-family: ${brand.mono};
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }
`;

const RatioExamples = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

const RatioCard = styled.div<{ $good?: boolean }>`
  background: ${(props) =>
    props.$good ? brand.surface : "rgba(255,255,255,.08)"};
  border: 1px solid
    ${(props) => (props.$good ? brand.lime : "rgba(255,255,255,.16)")};
  border-radius: 8px;
  color: ${(props) => (props.$good ? brand.ink : "#fff")};
  display: grid;
  gap: 8px;
  padding: 17px;

  strong {
    color: ${(props) => (props.$good ? brand.blue : brand.lime)};
    font-family: ${brand.mono};
    font-size: 36px;
    line-height: 1;
  }

  span {
    color: ${(props) => (props.$good ? brand.muted : "rgba(255,255,255,.72)")};
    font-family: ${brand.mono};
    font-size: 12px;
  }
`;

const RunwayBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 16px;
  min-height: 100%;
`;

const RunwayFormula = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  span,
  strong {
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 7px;
    font-family: ${brand.mono};
    padding: 12px;
  }

  span {
    color: rgba(255, 255, 255, 0.66);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  strong {
    color: ${brand.lime};
    font-size: 24px;
    line-height: 1;
  }
`;

const RunwayMonths = styled.div`
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
`;

const RunwayMonth = styled.div`
  align-items: center;
  background: rgba(237, 255, 61, 0.13);
  border: 1px solid rgba(237, 255, 61, 0.44);
  border-radius: 5px;
  color: #fff;
  display: flex;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  justify-content: center;
  min-height: 36px;
`;

const RunwayRule = styled.div`
  background: ${brand.lime};
  border-radius: 7px;
  color: #123b39;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  padding: 13px;
  text-align: center;
  text-transform: uppercase;
`;

const StatementBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 10px;
  min-height: 100%;
`;

const StatementCard = styled.div<{ $accent?: boolean }>`
  align-items: baseline;
  background: ${(props) => (props.$accent ? brand.lime : brand.surface)};
  border: 1px solid ${(props) => (props.$accent ? brand.lime : brand.rule)};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 7px;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 15px 16px;

  ${VisualMeta} {
    min-width: 0;
  }

  strong {
    color: ${(props) => (props.$accent ? "#123b39" : brand.ink)};
    font-size: 24px;
    line-height: 1;
    min-width: 0;
  }

  span {
    color: ${(props) => (props.$accent ? "#123b39" : brand.muted)};
    font-size: 14px;
    grid-column: 1 / -1;
    line-height: 1.32;
  }
`;

const PathBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) 46px minmax(0, 1fr);
  min-height: 100%;

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const PathCard = styled.div<{ $active?: boolean }>`
  align-content: center;
  background: ${(props) => (props.$active ? brand.lime : brand.surface)};
  border: 1px solid ${(props) => (props.$active ? "transparent" : brand.rule)};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr);
  padding: 18px;

  ${VisualMeta} {
    min-width: 0;
  }

  strong {
    color: ${(props) => (props.$active ? "#123b39" : brand.ink)};
    font-size: clamp(20px, 1.55vw, 25px);
    line-height: 1.04;
    min-width: 0;
    overflow-wrap: normal;
    word-break: normal;
  }

  span {
    color: ${(props) => (props.$active ? "#123b39" : brand.muted)};
    font-size: 14px;
    line-height: 1.35;
    min-width: 0;
  }
`;

const PathArrow = styled.div`
  align-items: center;
  color: ${brand.blue};
  display: flex;
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 900;
  justify-content: center;
  text-transform: uppercase;

  @media (max-width: 720px) {
    justify-content: start;
  }
`;

const PacketBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) 42px minmax(0, 1fr);
  min-height: 100%;
`;

const PacketStack = styled.div`
  display: grid;
  gap: 8px;
`;

const PacketItem = styled.div<{ $accent?: boolean; $complete?: boolean }>`
  background: ${(props) =>
    props.$accent
      ? brand.lime
      : props.$complete
        ? brand.surface
        : brand.mutedBlock};
  border: 1px solid ${(props) => (props.$accent ? brand.lime : brand.rule)};
  border-radius: 7px;
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 850;
  line-height: 1.25;
  min-height: 46px;
  padding: 12px;
  text-transform: uppercase;
`;

const PacketPlus = styled.div`
  align-items: center;
  color: ${brand.lime};
  display: flex;
  font-family: ${brand.mono};
  font-size: 30px;
  font-weight: 900;
  justify-content: center;
`;

const CallBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 42px minmax(0, 1fr) 42px minmax(0, 1fr);
  min-height: 100%;

  @media (max-width: 640px) {
    align-content: start;
    grid-template-columns: 1fr;
  }
`;

const CallStep = styled.div<{ $accent?: boolean }>`
  align-items: center;
  background: ${(props) => (props.$accent ? brand.lime : brand.surface)};
  border: 1px solid ${(props) => (props.$accent ? brand.lime : brand.rule)};
  border-radius: 8px;
  color: ${brand.ink};
  display: flex;
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 900;
  justify-content: center;
  min-height: 126px;
  padding: 14px;
  text-align: center;
  text-transform: uppercase;
  word-break: normal;

  @media (max-width: 640px) {
    justify-content: flex-start;
    min-height: 58px;
    padding: 12px 14px;
    text-align: left;
  }
`;

const CallConnector = styled.div`
  align-self: center;
  background: ${brand.lime};
  border-radius: 999px;
  height: 4px;

  @media (max-width: 640px) {
    display: none;
  }
`;

const MatrixBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 10px;
  min-height: 100%;
`;

const MatrixCell = styled.div<{ $value: number }>`
  align-items: center;
  color: #fff;
  display: grid;
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 850;
  gap: 12px;
  grid-template-columns: 170px minmax(0, 1fr);
  text-transform: uppercase;

  &::after {
    background: linear-gradient(
      to right,
      ${brand.lime} 0 ${(props) => props.$value}%,
      rgba(255, 255, 255, 0.16) ${(props) => props.$value}% 100%
    );
    border-radius: 999px;
    content: "";
    display: block;
    height: 13px;
  }
`;

const LossBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 15px;
  min-height: 100%;
`;

const LossNumber = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 58px;
  font-weight: 900;
  line-height: 1;
`;

const DealGrid = styled.div`
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
`;

const DealCell = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  color: #fff;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 850;
  min-height: 40px;
  padding: 11px 9px;
  text-transform: uppercase;
`;

const LossRule = styled.div`
  background: ${brand.lime};
  border-radius: 7px;
  color: #123b39;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  padding: 12px;
  text-transform: uppercase;
`;

const ControlBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 10px;
  min-height: 100%;
`;

const ControlNode = styled.div<{ $parent?: boolean }>`
  background: ${(props) => (props.$parent ? brand.lime : brand.surface)};
  border: 1px solid ${(props) => (props.$parent ? brand.lime : brand.rule)};
  border-radius: 8px;
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 19px;
  font-weight: 900;
  padding: 18px;
  text-transform: uppercase;
`;

const ControlLine = styled.div`
  background: rgba(237, 255, 61, 0.7);
  height: 36px;
  margin-left: 28px;
  width: 4px;
`;

const ControlCaption = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 15px;
  line-height: 1.35;
  padding: 14px 16px;
`;

const MarginBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 14px;
  min-height: 100%;
`;

const MarginStack = styled.div`
  display: grid;
  gap: 7px;
`;

const MarginSlice = styled.div<{ $height: number; $risk?: boolean }>`
  align-items: center;
  background: ${(props) => (props.$risk ? brand.lime : "rgba(255,255,255,.1)")};
  border: 1px solid
    ${(props) => (props.$risk ? brand.lime : "rgba(255,255,255,.18)")};
  border-radius: 7px;
  color: ${(props) => (props.$risk ? "#123b39" : "#fff")};
  display: flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  min-height: ${(props) => `${props.$height}px`};
  padding: 0 12px;
  text-transform: uppercase;
`;

const MarginRule = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  line-height: 1.25;
  text-transform: uppercase;
`;

const FlagBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 100%;
`;

const FlagItem = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-left: 5px solid ${brand.lime};
  border-radius: 8px;
  color: #fff;
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 900;
  line-height: 1.25;
  min-height: 92px;
  padding: 15px;
  text-transform: uppercase;
`;

const ProfileBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 12px;
  min-height: 100%;
`;

const ProfileCard = styled.div`
  align-items: baseline;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 8px;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 98px;
  padding: 18px;

  ${VisualMeta} {
    min-width: 0;
  }

  strong {
    font-size: 23px;
    line-height: 1.1;
    min-width: 0;
  }

  span {
    color: ${brand.muted};
    font-size: 15px;
    grid-column: 1 / -1;
    line-height: 1.3;
  }
`;

const ExposureBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 24px;
  min-height: 100%;
`;

const ExposureHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 12px;

  strong {
    color: ${brand.lime};
    font-family: ${brand.mono};
    font-size: 48px;
    line-height: 1;
  }

  span {
    border: 1px solid rgba(255, 255, 255, 0.24);
    border-radius: 999px;
    color: #fff;
    font-family: ${brand.mono};
    font-size: 14px;
    font-weight: 800;
    padding: 8px 12px;
  }
`;

const ExposureDays = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
`;

const ExposureDay = styled.div<{ $active?: boolean; $paid?: boolean }>`
  align-content: start;
  background: ${(props) =>
    props.$active
      ? brand.lime
      : props.$paid
        ? "#7c4dff"
        : "rgba(255,255,255,.05)"};
  border: 1px solid
    ${(props) =>
      props.$active
        ? brand.lime
        : props.$paid
          ? "#7c4dff"
          : "rgba(255,255,255,.16)"};
  border-radius: 7px;
  color: ${(props) => (props.$active ? "#123b39" : "#fff")};
  display: grid;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  min-height: 88px;
  padding: 14px;
  text-transform: uppercase;
`;

const ExposureRule = styled.div`
  border: 1px solid ${brand.lime};
  border-radius: 999px;
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 800;
  padding: 12px 14px;
  text-transform: uppercase;
`;

const CompareBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100%;
`;

const ComparePanel = styled.div<{ $dark?: boolean }>`
  background: ${(props) => (props.$dark ? brand.dark : brand.surface)};
  border: 1px solid ${(props) => (props.$dark ? brand.lime : brand.rule)};
  border-radius: 8px;
  color: ${(props) => (props.$dark ? "#fff" : brand.ink)};
  align-items: center;
  display: grid;
  gap: 9px;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  padding: 12px;

  strong {
    font-size: 21px;
    line-height: 1.1;
    min-width: 0;
  }

  span {
    color: ${(props) => (props.$dark ? "rgba(255,255,255,.72)" : brand.muted)};
    font-size: 12px;
    line-height: 1.35;
    min-width: 0;
  }
`;

const TermsBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 26px;
  min-height: 100%;
`;

const TermOptions = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
`;

const Term = styled.div<{ $active?: boolean }>`
  align-items: center;
  background: ${(props) =>
    props.$active ? brand.lime : "rgba(255,255,255,.05)"};
  border: 1px solid
    ${(props) => (props.$active ? brand.lime : "rgba(255,255,255,.16)")};
  border-radius: 7px;
  color: ${(props) => (props.$active ? "#123b39" : "rgba(255,255,255,.74)")};
  display: flex;
  font-family: ${brand.mono};
  font-size: 15px;
  font-weight: 800;
  justify-content: center;
  min-height: 66px;
  text-transform: uppercase;
`;

const SignalRows = styled.div`
  display: grid;
  gap: 12px;
`;

const SignalRow = styled.div<{ $value: number }>`
  align-items: center;
  color: rgba(255, 255, 255, 0.82);
  display: grid;
  font-family: ${brand.mono};
  font-size: 14px;
  gap: 10px;
  grid-template-columns: 170px minmax(0, 1fr);
  text-transform: uppercase;

  &::after {
    background: linear-gradient(
      to right,
      ${brand.blue} 0 ${(props) => props.$value}%,
      rgba(255, 255, 255, 0.18) ${(props) => props.$value}% 100%
    );
    border-radius: 999px;
    content: "";
    display: block;
    height: 10px;
  }
`;

const TakeawayBoard = styled.div`
  align-content: center;
  display: grid;
  gap: 12px;
  min-height: 100%;
`;

const TakeawayChip = styled.div`
  background: ${brand.lime};
  border-radius: 4px;
  color: #123b39;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  padding: 8px 10px;
  text-transform: uppercase;
  width: fit-content;
`;

const TakeawayItem = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #fff;
  font-size: 22px;
  line-height: 1.2;
  padding: 18px;
`;

const WorkflowBoard = styled.div`
  align-content: center;
  background: rgba(0, 0, 0, 0.26);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  display: grid;
  gap: 8px;
  min-height: 100%;
  padding: 24px;

  strong {
    font-size: 24px;
    line-height: 1.1;
  }

  span {
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.35;
  }
`;

const StageProgress = styled.div`
  background: rgba(255, 255, 255, 0.15);
  bottom: 0;
  height: 7px;
  left: 0;
  position: absolute;
  right: 0;
`;

const StageProgressFill = styled.div`
  background: ${brand.lime};
  height: 100%;
`;

const TimelineDock = styled.div<{ $hasAudioDock?: boolean }>`
  align-items: center;
  background: rgba(12, 14, 10, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  bottom: 22px;
  display: grid;
  gap: 10px;
  grid-template-columns: auto auto minmax(0, 1fr) auto auto auto;
  left: 24px;
  padding: 8px 12px;
  position: absolute;
  right: 24px;
  z-index: 4;

  @media (max-width: 720px) {
    bottom: 14px;
    gap: 6px;
    grid-template-columns: auto minmax(0, 1fr) auto auto auto;
    left: 12px;
    padding: 7px 8px;
    right: 12px;

    span:first-of-type {
      display: none;
    }
  }
`;

const TimelinePlayButton = styled.button`
  appearance: none;
  background: ${brand.lime};
  border: 1px solid ${brand.lime};
  border-radius: 999px;
  color: ${brand.ink};
  cursor: pointer;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 900;
  min-height: 30px;
  min-width: 62px;
  padding: 0 12px;
  text-transform: uppercase;

  &:hover {
    background: #f3ff73;
  }
`;

const TimelineTime = styled.span`
  color: rgba(255, 255, 255, 0.76);
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  min-width: 42px;
  text-align: center;
`;

const TimelineTrack = styled.div`
  min-width: 0;
  position: relative;
`;

const TimelineRange = styled.input`
  accent-color: ${brand.lime};
  cursor: pointer;
  display: block;
  min-width: 0;
  position: relative;
  width: 100%;
  z-index: 2;
`;

const TimelineMarkers = styled.div`
  bottom: -3px;
  left: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
  top: -3px;
  z-index: 3;
`;

const TimelineMarker = styled.span<{ $type: "gong" | "skill" }>`
  background: ${(props) => (props.$type === "gong" ? brand.purple : "#fff")};
  border: 2px solid
    ${(props) =>
      props.$type === "gong" ? "rgba(255, 255, 255, 0.92)" : brand.blue};
  border-radius: 999px;
  box-shadow: 0 0 0 2px rgba(12, 14, 10, 0.55);
  cursor: help;
  height: ${(props) => (props.$type === "gong" ? "12px" : "10px")};
  left: var(--left);
  pointer-events: auto;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: ${(props) => (props.$type === "gong" ? "12px" : "10px")};
`;

const PlaybackRateSelect = styled.select`
  appearance: none;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  color: #ffffff;
  cursor: pointer;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 900;
  height: 30px;
  min-width: 62px;
  padding: 0 10px;
  text-align: center;

  &:focus-visible {
    outline: 2px solid ${brand.lime};
    outline-offset: 2px;
  }
`;

const CaptionToggleButton = styled.button<{ $active?: boolean }>`
  appearance: none;
  background: ${({ $active }) =>
    $active ? brand.lime : "rgba(255, 255, 255, 0.12)"};
  border: 1px solid
    ${({ $active }) => ($active ? brand.lime : "rgba(255, 255, 255, 0.22)")};
  border-radius: 999px;
  color: ${({ $active }) => ($active ? brand.ink : "#ffffff")};
  cursor: pointer;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 900;
  height: 30px;
  min-width: 42px;
  padding: 0 10px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  &:focus-visible {
    outline: 2px solid ${brand.lime};
    outline-offset: 2px;
  }
`;

const CaptionOverlay = styled.div`
  background: rgba(12, 14, 10, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  bottom: 78px;
  color: #ffffff;
  font-size: clamp(13px, 1.3vw, 16px);
  font-weight: 800;
  left: 28px;
  line-height: 1.2;
  max-height: 48px;
  overflow: hidden;
  padding: 9px 16px;
  position: absolute;
  right: 28px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 5;

  @media (max-width: 720px) {
    bottom: 72px;
    left: 18px;
    max-height: 44px;
    padding: 8px 10px;
    right: 18px;
  }
`;

const ReviewModeBadge = styled.div`
  background: rgba(237, 255, 61, 0.9);
  border: 1px solid rgba(18, 59, 57, 0.22);
  border-radius: 999px;
  color: #123b39;
  font-family: ${brand.mono};
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
  padding: 6px 9px;
  position: absolute;
  right: 22px;
  text-transform: uppercase;
  top: 14px;
  z-index: 3;
`;

const AudioDock = styled.div`
  height: 1px;
  left: 24px;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
  top: 24px;
  width: 1px;
`;

const AudioPlayer = styled.audio`
  background: transparent;
  display: block;
  height: 1px;
  width: 100%;
`;

const WorkflowVideoPlayer = styled.video`
  align-self: stretch;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  display: block;
  height: 100%;
  min-height: 0;
  object-fit: contain;
  position: relative;
  width: 100%;
  z-index: 1;
`;

const MediaMissing = styled.div`
  background: ${brand.surface};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.muted};
  font-size: 14px;
  padding: 12px 14px;
`;

const LessonRail = styled.section`
  background: ${brand.surface};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 420px;
  overflow: hidden;

  @media (min-width: 1440px) {
    height: 100%;
    min-height: 0;
  }
`;

const RailTabs = styled.div`
  background: #f7f5ef;
  border-bottom: 1px solid ${brand.rule};
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  padding: 8px;
`;

const RailTabButton = styled.button<{ $active?: boolean }>`
  align-items: center;
  appearance: none;
  background: ${(props) => (props.$active ? brand.surface : "transparent")};
  border: 1px solid ${(props) => (props.$active ? brand.rule : "transparent")};
  border-radius: 6px;
  color: ${(props) => (props.$active ? brand.ink : brand.muted)};
  cursor: pointer;
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  gap: 8px;
  height: 36px;
  justify-content: center;
  letter-spacing: 0.04em;
  padding: 0 10px;
  text-transform: uppercase;

  &:hover {
    border-color: rgba(53, 76, 239, 0.26);
    color: ${brand.blue};
  }
`;

const RailCount = styled.span`
  align-items: center;
  background: ${brand.lime};
  border: 1px solid rgba(32, 48, 45, 0.12);
  border-radius: 999px;
  color: ${brand.ink};
  display: inline-flex;
  font-size: 10px;
  height: 20px;
  justify-content: center;
  min-width: 24px;
  padding: 0 6px;
`;

const RailPanel = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  scrollbar-color: rgba(53, 76, 239, 0.42) transparent;
  scrollbar-width: thin;
`;

const RailPanelHeader = styled.div`
  align-items: baseline;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 10px;
  min-width: 0;
`;

const LessonCardTitle = styled.h4`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.2;
  margin: 0;
  text-transform: uppercase;
`;

const RailPanelMeta = styled.div`
  color: ${brand.muted};
  flex: none;
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ObjectiveList = styled.ul`
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0 0 12px;
  padding: 0;

  li {
    align-items: start;
    color: ${brand.ink};
    display: grid;
    font-size: 15px;
    gap: 8px;
    grid-template-columns: 18px minmax(0, 1fr);
    line-height: 1.35;
  }

  li::before {
    background: ${brand.lime};
    border: 1px solid rgba(32, 48, 45, 0.12);
    border-radius: 999px;
    content: "";
    display: block;
    height: 8px;
    margin-top: 6px;
    width: 8px;
  }
`;

const JobAidBlock = styled.div`
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.06),
    ${brand.surface} 44%
  );
  border: 1px solid rgba(32, 48, 45, 0.1);
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: grid;
  gap: 6px;
  margin-top: 14px;
  padding: 12px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const JobAidEyebrow = styled.div`
  color: ${brand.muted};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const JobAidTitle = styled.div`
  color: ${brand.ink};
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
`;

const JobAidCopy = styled.p`
  color: ${brand.muted};
  font-size: 14px;
  line-height: 1.35;
  margin: 0;
`;

const JobAidLink = styled.a`
  align-items: center;
  color: ${brand.blue};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  justify-self: start;
  letter-spacing: 0.04em;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    text-decoration: underline;
  }
`;

const SectionList = styled.div`
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
`;

const SectionItem = styled.button<{
  $active?: boolean;
  $complete?: boolean;
  $reviewMode?: boolean;
}>`
  align-items: center;
  appearance: none;
  background: ${(props) =>
    props.$active
      ? brand.lime
      : props.$complete
        ? "#e9f8f1"
        : brand.mutedBlock};
  border: 1px solid
    ${(props) =>
      props.$active
        ? "#b8bffd"
        : props.$complete
          ? "rgba(118, 191, 148, 0.6)"
          : brand.rule};
  border-radius: 7px;
  color: inherit;
  display: grid;
  gap: 7px;
  grid-template-columns: 24px minmax(0, 1fr);
  min-height: 34px;
  padding: 5px 8px;
  text-align: left;
  width: 100%;
  cursor: ${(props) =>
    props.$reviewMode || props.$complete ? "pointer" : "default"};

  &:disabled {
    opacity: 0.62;
  }

  &:hover {
    border-color: ${(props) => (props.$reviewMode ? brand.blue : undefined)};
  }
`;

const SectionNumber = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  text-align: center;
`;

const SectionCopy = styled.div`
  min-width: 0;
`;

const SectionTitle = styled.div`
  color: ${brand.ink};
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SectionMeta = styled.div`
  color: ${brand.muted};
  font-family: ${brand.mono};
  font-size: 10px;
  margin-top: 1px;
  text-transform: uppercase;
`;

const EmptyState = styled.div`
  background: ${brand.mutedBlock};
  border: 1px dashed ${brand.rule};
  border-radius: 8px;
  color: ${brand.muted};
  font-size: 13px;
  line-height: 1.4;
  padding: 12px;
`;

const RailNextUp = styled.aside`
  background: #20251d;
  border: 1px solid rgba(32, 48, 45, 0.24);
  border-radius: 8px;
  color: #fff;
  display: grid;
  gap: 4px;
  grid-template-columns: minmax(0, 1fr) auto;
  margin-top: 12px;
  min-width: 0;
  padding: 12px;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const NextLessonLabel = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const NextLessonTitle = styled.div`
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NextLessonMeta = styled.div`
  color: rgba(255, 255, 255, 0.58);
  font-family: ${brand.mono};
  font-size: 10px;
  letter-spacing: 0.06em;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

const NextLessonButton = styled.a<{ $disabled?: boolean }>`
  align-items: center;
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  color: ${brand.ink};
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  display: inline-flex;
  font-size: 13px;
  font-weight: 800;
  grid-column: 2;
  grid-row: 1 / span 3;
  height: 34px;
  justify-content: center;
  justify-self: end;
  margin-left: 12px;
  opacity: ${(props) => (props.$disabled ? 0.58 : 1)};
  padding: 0 12px;
  text-decoration: none;
  width: fit-content;

  &:hover {
    text-decoration: none;
  }

  @media (max-width: 560px) {
    grid-column: 1;
    grid-row: auto;
    justify-self: start;
    margin-left: 0;
    margin-top: 6px;
  }
`;

const CourseConfetti = styled.div`
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: fixed;
  z-index: 0;

  span {
    animation: course-confetti-fall 4.8s linear infinite;
    background: ${brand.blue};
    border-radius: 2px;
    height: 16px;
    left: var(--left);
    opacity: 0.92;
    position: absolute;
    top: -32px;
    transform: rotate(calc(var(--i) * 17deg));
    transform-origin: center;
    width: 8px;
    animation-delay: var(--delay);
    animation-duration: var(--duration);
  }

  span:nth-child(3n) {
    background: ${brand.lime};
    width: 12px;
  }

  span:nth-child(4n) {
    background: #ff8a5b;
    border-radius: 999px;
    height: 10px;
  }

  span:nth-child(5n) {
    background: ${brand.purple};
  }

  @keyframes course-confetti-fall {
    0% {
      opacity: 0;
      transform: translate3d(0, -24px, 0) rotate(0deg);
    }

    10% {
      opacity: 1;
    }

    100% {
      opacity: 0.92;
      transform: translate3d(var(--drift), calc(100vh + 72px), 0)
        rotate(calc(360deg + var(--i) * 19deg));
    }
  }
`;

const CheckpointList = styled.div`
  display: grid;
  gap: 6px;
`;

const CheckpointItem = styled.button<{
  $complete?: boolean;
  $missed?: boolean;
  $reviewMode?: boolean;
}>`
  appearance: none;
  background: ${(props) =>
    props.$missed ? "#fff7e6" : props.$complete ? "#eef8d5" : brand.mutedBlock};
  border: 1px solid
    ${(props) =>
      props.$missed
        ? "#efd69b"
        : props.$complete
          ? "rgba(118, 145, 31, 0.36)"
          : brand.rule};
  border-radius: 8px;
  color: inherit;
  cursor: ${(props) => (props.$reviewMode ? "pointer" : "default")};
  display: grid;
  gap: 3px;
  padding: 8px;
  text-align: left;
  width: 100%;

  &:disabled {
    opacity: 1;
  }

  &:hover {
    border-color: ${(props) => (props.$reviewMode ? brand.blue : undefined)};
  }
`;

const CheckpointTopline = styled.div`
  color: ${brand.blue};
  display: flex;
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 800;
  justify-content: space-between;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const CheckpointQuestion = styled.div`
  color: ${brand.ink};
  display: -webkit-box;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

const CheckpointReview = styled.div`
  color: ${brand.muted};
  font-size: 12px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProgressMini = styled.div`
  display: grid;
  gap: 5px;
  margin: -3px 0 7px;

  span {
    color: ${brand.muted};
    font-family: ${brand.mono};
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
`;

const ProgressMiniTrack = styled.div`
  background: ${brand.mutedBlock};
  border-radius: 999px;
  height: 5px;
  overflow: hidden;
`;

const ProgressMiniFill = styled.div`
  background: ${brand.blue};
  height: 100%;
`;

const CheckpointModal = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.62);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  padding: 28px;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 6;
`;

const CheckpointModalCard = styled.div`
  background: ${brand.surface};
  border: 1px solid ${brand.rule};
  border-radius: 10px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
  color: ${brand.ink};
  display: grid;
  gap: 12px;
  grid-template-rows: auto minmax(58px, auto) auto 58px auto;
  height: min(540px, calc(100% - 40px));
  max-width: 680px;
  padding: 20px;
  width: min(680px, 100%);
`;

const CheckpointModalTitle = styled.h3`
  color: ${brand.ink};
  font-size: clamp(18px, 2.2vw, 23px);
  line-height: 1.16;
  margin: 0;
  overflow: auto;
`;

const CheckpointOptions = styled.div`
  display: grid;
  gap: 8px;
`;

const CheckpointAnswer = styled.button<{
  $correct?: boolean;
  $selected?: boolean;
}>`
  align-items: center;
  background: ${(props) =>
    props.$selected ? (props.$correct ? "#e9f8f1" : "#fff0ef") : "#fff"};
  border: 1px solid
    ${(props) =>
      props.$selected ? (props.$correct ? "#76bf94" : "#e58f87") : brand.rule};
  border-radius: 8px;
  color: ${(props) =>
    props.$selected ? (props.$correct ? "#1f6f49" : "#a2392f") : brand.ink};
  cursor: pointer;
  display: grid;
  font-size: 14px;
  gap: 10px;
  grid-template-columns: 28px minmax(0, 1fr);
  line-height: 1.3;
  min-height: 48px;
  padding: 10px 12px;
  text-align: left;

  span {
    align-items: center;
    background: ${(props) =>
      props.$selected ? (props.$correct ? "#2e8f5b" : "#c94a40") : brand.lime};
    border-radius: 999px;
    color: ${(props) => (props.$selected ? "#fff" : "#123b39")};
    display: inline-flex;
    font-family: ${brand.mono};
    font-size: 11px;
    font-weight: 800;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  &:hover {
    border-color: ${brand.blue};
  }

  &:disabled {
    cursor: default;
  }
`;

const CheckpointFeedback = styled.div<{
  $passed?: boolean;
  $visible?: boolean;
}>`
  background: ${(props) =>
    props.$visible ? (props.$passed ? "#e9f8f1" : "#fff7e6") : "#fffaf0"};
  border: 1px solid ${(props) => (props.$passed ? "#b8e0ca" : "#e7c86f")};
  border-radius: 8px;
  color: ${(props) => (props.$passed ? "#26724d" : "#8a5a00")};
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.58);
  font-size: 13px;
  line-height: 1.35;
  min-height: 58px;
  opacity: ${(props) => (props.$visible ? 1 : 0.86)};
  overflow: auto;
  padding: 12px;
`;

const CheckpointContinue = styled.button`
  align-items: center;
  background: ${brand.blue};
  border: 0;
  border-radius: 7px;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  height: 40px;
  justify-content: center;
  justify-self: start;
  letter-spacing: 0.04em;
  padding: 0 14px;
  text-transform: uppercase;

  &:disabled {
    background: #d7d3ca;
    color: ${brand.muted};
    cursor: not-allowed;
  }
`;

const LessonModalOverlay = styled.div`
  align-items: center;
  background: rgba(12, 14, 10, 0.56);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  padding: 24px;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 8;
`;

const LessonModalPanel = styled.div<{ $complete?: boolean }>`
  background: ${brand.surface};
  border: 1px solid rgba(32, 48, 45, 0.14);
  border-top: 5px solid
    ${(props) => (props.$complete ? "#19a767" : brand.purple)};
  border-radius: 10px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.4);
  color: ${brand.ink};
  display: grid;
  gap: 14px;
  justify-items: start;
  max-width: 680px;
  padding: 32px;
  width: min(680px, 100%);

  @media (max-width: 640px) {
    padding: 24px;
  }
`;

const LessonModalKicker = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const LessonModalTitle = styled.h3`
  color: ${brand.ink};
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.1;
  margin: 0;
`;

const LessonModalCopy = styled.p`
  color: ${brand.muted};
  font-size: clamp(15px, 1.4vw, 17px);
  line-height: 1.5;
  margin: 0;
  max-width: 58ch;
`;

const LessonModalButton = styled.button`
  align-items: center;
  background: ${brand.blue};
  border: 0;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  font-size: 15px;
  font-weight: 900;
  height: 46px;
  justify-content: center;
  justify-self: start;
  padding: 0 18px;
  text-decoration: none;

  &:hover {
    background: #203bd8;
  }
`;

const LockNotice = styled.div`
  background: #fff7e6;
  border: 1px solid #efd69b;
  border-radius: 8px;
  color: #8a5a00;
  font-size: 13px;
  line-height: 1.35;
  padding: 12px;
`;

const NotFound = styled.section`
  background: ${brand.surface};
  border: 1px solid ${brand.rule};
  border-radius: 10px;
  padding: 24px;
  margin: 0;
`;

export default observer(UnderwritingLesson);
