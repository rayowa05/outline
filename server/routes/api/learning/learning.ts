import { addDays, format, isBefore } from "date-fns";
import Router from "koa-router";
import { Op } from "sequelize";
import LearningReminderEmail from "@server/emails/templates/LearningReminderEmail";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@server/errors";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import {
  LearningAssignment,
  LearningBadge,
  LearningEvent,
  LearningModuleNote,
  LearningQuizAttempt,
  User,
} from "@server/models";
import {
  LearningAssignmentStatus,
  type LearningProgressState,
} from "@server/models/LearningAssignment";
import type { APIContext } from "@server/types";
import {
  getUnderwritingQuizById,
  getUnderwritingQuizByModule,
} from "@shared/learning/underwritingQuizContent";
import * as T from "./schema";

const router = new Router();

const UNDERWRITING_COURSE_ID = "underwriting-training";
const UNDERWRITING_COURSE_TITLE = "Underwriting Training";
const UNDERWRITING_COURSE_PATH = "/learning/underwriting-training";
const UNDERWRITING_REQUIRED_LESSON_COUNT = 14;
const UNDERWRITING_REQUIRED_QUIZ_COUNT = 2;
const UNDERWRITING_REQUIRED_SKILL_CHECK_COUNT = 24;
const UNDERWRITING_MODULE_THREE_LESSON_COUNT = 3;
const UNDERWRITING_CERTIFIED_BADGE_ID = "underwriting-certified";
const DEFAULT_DUE_DAYS = 14;

interface LearningReportRow {
  learnerId: string;
  learnerName: string;
  learnerEmail: string | null;
  courseId: string;
  status: LearningAssignmentStatus;
  progressPercent: number;
  assignedAt: string;
  dueAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  lessonsCompleted: number;
  skillChecksCompleted: number;
  skillChecksRequired: number;
  quizzesPassed: number;
  quizzesRequired: number;
  quizAttemptCount: number;
  quizFailureCount: number;
  moduleQuizStats: {
    attemptCount: number;
    bestScorePercent: number;
    failureCount: number;
    lastAttemptAt: string | null;
    moduleNumber: number;
    passed: boolean;
    quizId: string;
  }[];
  courseStartedAt: string | null;
  completionSeconds: number | null;
  badgeEarned: boolean;
}

interface LearningReportSummary {
  assigned: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
  averageProgress: number;
  badgesAwarded: number;
}

interface LearningOverview {
  course: {
    id: string;
    title: string;
    requiredLessonCount: number;
    requiredQuizCount: number;
  };
  assignment: LearningReportRow;
  gates: {
    moduleNumber: number;
    locked: boolean;
    lockedReason: string | null;
    requiredQuizId: string | null;
    quizPassed: boolean;
  }[];
  badges: {
    badgeId: string;
    label: string;
    awardedAt: string;
  }[];
  reporting: {
    generatedAt: string;
    visibleScope: "team" | "self";
    summary: LearningReportSummary;
    rows: LearningReportRow[];
  };
}

function normalizeCourseId(courseId?: string) {
  return courseId || UNDERWRITING_COURSE_ID;
}

function dueDateFromNow() {
  return addDays(new Date(), DEFAULT_DUE_DAYS);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function buildPassedQuizReview({
  assignment,
  attempt,
  quiz,
}: {
  assignment: LearningAssignment;
  attempt: LearningQuizAttempt;
  quiz: NonNullable<ReturnType<typeof getUnderwritingQuizById>>;
}) {
  return {
    answers: Object.fromEntries(
      quiz.questions.map((question) => [
        question.id,
        question.options.find((option) => option.correct)?.id ?? "",
      ])
    ),
    result: {
      attemptNumber: attempt.attemptNumber,
      maxScore: attempt.maxScore,
      missed: [],
      passed: true,
      progressPercent: assignment.progressPercent,
      requiredPercent: attempt.requiredPercent,
      score: attempt.score,
      scorePercent: attempt.scorePercent,
    },
  };
}

function getLessonKey(moduleNumber: number, lessonNumber: number) {
  return `${moduleNumber}-${lessonNumber}`;
}

function countCompletedLessons(progress: LearningProgressState | null) {
  const lessons = progress?.lessons ?? {};
  return Object.values(lessons).filter((lesson) => lesson.lessonCompleted)
    .length;
}

function countCompletedSkillChecks(progress: LearningProgressState | null) {
  const lessons = progress?.lessons ?? {};
  return Object.values(lessons).reduce(
    (total, lesson) => total + lesson.completedCheckpointCount,
    0
  );
}

function countRequiredSkillChecks(progress: LearningProgressState | null) {
  const lessons = progress?.lessons ?? {};
  return Object.values(lessons).reduce(
    (total, lesson) => total + lesson.checkpointCount,
    0
  );
}

function countPassedRequiredQuizzes(progress: LearningProgressState | null) {
  const quizzes = progress?.quizzes ?? {};
  return Object.values(quizzes).filter((quiz) => quiz.passed).length;
}

function countQuizAttempts(progress: LearningProgressState | null) {
  const quizzes = progress?.quizzes ?? {};
  return Object.values(quizzes).reduce(
    (total, quiz) => total + quiz.attemptCount,
    0
  );
}

function getModuleQuizStats(progress: LearningProgressState | null) {
  const quizzes = progress?.quizzes ?? {};

  return Object.values(quizzes).map((quiz) => ({
    attemptCount: quiz.attemptCount,
    bestScorePercent: quiz.bestScorePercent,
    failureCount: Math.max(0, quiz.attemptCount - (quiz.passed ? 1 : 0)),
    lastAttemptAt: quiz.lastAttemptAt ?? null,
    moduleNumber: quiz.moduleNumber,
    passed: quiz.passed,
    quizId: quiz.quizId,
  }));
}

function countQuizFailures(progress: LearningProgressState | null) {
  return getModuleQuizStats(progress).reduce(
    (total, quiz) => total + quiz.failureCount,
    0
  );
}

function getRequiredCompletionUnitCount() {
  return UNDERWRITING_REQUIRED_LESSON_COUNT + UNDERWRITING_REQUIRED_QUIZ_COUNT;
}

function getProgressPercent(progress: LearningProgressState | null) {
  const completedUnits =
    countCompletedLessons(progress) + countPassedRequiredQuizzes(progress);

  return Math.min(
    100,
    Math.round((completedUnits / getRequiredCompletionUnitCount()) * 100)
  );
}

function hasAnyCourseProgress(progress: LearningProgressState | null) {
  return Boolean(
    progress?.courseStartedAt ||
    Object.keys(progress?.lessons ?? {}).length ||
    Object.keys(progress?.quizzes ?? {}).length
  );
}

function hasPassedModuleQuiz(
  progress: LearningProgressState | null,
  moduleNumber: number
) {
  const quiz = getUnderwritingQuizByModule(moduleNumber);
  if (!quiz) {
    return true;
  }

  return Boolean(progress?.quizzes?.[quiz.id]?.passed);
}

function hasCompletedModuleLessons(
  progress: LearningProgressState | null,
  moduleNumber: number,
  lessonCount: number
) {
  const lessons = progress?.lessons ?? {};

  return Array.from({ length: lessonCount }, (_, index) =>
    Boolean(lessons[getLessonKey(moduleNumber, index + 1)]?.lessonCompleted)
  ).every(Boolean);
}

function buildGateState(progress: LearningProgressState | null) {
  const moduleOneQuiz = getUnderwritingQuizByModule(1);
  const moduleTwoQuiz = getUnderwritingQuizByModule(2);
  const moduleThreeComplete = hasCompletedModuleLessons(
    progress,
    3,
    UNDERWRITING_MODULE_THREE_LESSON_COUNT
  );

  return [
    {
      locked: false,
      lockedReason: null,
      moduleNumber: 1,
      quizPassed: hasPassedModuleQuiz(progress, 1),
      requiredQuizId: null,
    },
    {
      locked: !hasPassedModuleQuiz(progress, 1),
      lockedReason: hasPassedModuleQuiz(progress, 1)
        ? null
        : "Pass the Module 1 quiz with 100% to unlock Module 2.",
      moduleNumber: 2,
      quizPassed: hasPassedModuleQuiz(progress, 2),
      requiredQuizId: moduleOneQuiz?.id ?? null,
    },
    {
      locked: !hasPassedModuleQuiz(progress, 2),
      lockedReason: hasPassedModuleQuiz(progress, 2)
        ? null
        : "Pass the Module 2 quiz with 100% to unlock Module 3.",
      moduleNumber: 3,
      quizPassed: true,
      requiredQuizId: moduleTwoQuiz?.id ?? null,
    },
    {
      locked: !moduleThreeComplete,
      lockedReason: moduleThreeComplete
        ? null
        : "Complete the Module 3 workflow lessons to unlock the required job aid review.",
      moduleNumber: 4,
      quizPassed: true,
      requiredQuizId: null,
    },
  ];
}

function ensureCourseStarted(progress: LearningProgressState) {
  return progress.courseStartedAt
    ? progress
    : {
        ...progress,
        courseStartedAt: new Date().toISOString(),
      };
}

function withCompletionState(
  progress: LearningProgressState,
  completedAt: Date | null
) {
  if (!completedAt || !progress.courseStartedAt) {
    return progress;
  }

  return {
    ...progress,
    completionSeconds: Math.max(
      0,
      Math.round(
        (completedAt.getTime() - new Date(progress.courseStartedAt).getTime()) /
          1000
      )
    ),
    courseCompletedAt: completedAt.toISOString(),
  };
}

function getAssignmentStatus(
  progressPercent: number,
  dueAt: Date | null,
  completedAt: Date | null
) {
  if (completedAt || progressPercent >= 100) {
    return LearningAssignmentStatus.Completed;
  }

  if (dueAt && isBefore(dueAt, new Date())) {
    return LearningAssignmentStatus.Overdue;
  }

  if (progressPercent > 0) {
    return LearningAssignmentStatus.InProgress;
  }

  return LearningAssignmentStatus.NotStarted;
}

async function ensureAssignment(
  ctx: APIContext,
  courseId: string,
  dueAt?: Date
) {
  const { user } = ctx.state.auth;
  const existing = await LearningAssignment.findOne({
    where: {
      courseId,
      teamId: user.teamId,
      userId: user.id,
    },
  });

  if (existing) {
    return existing;
  }

  return LearningAssignment.createWithCtx(ctx, {
    assignedAt: new Date(),
    assignedById: null,
    courseId,
    dueAt: dueAt ?? null,
    progress: {},
    progressPercent: 0,
    required: false,
    status: LearningAssignmentStatus.NotStarted,
    teamId: user.teamId,
    userId: user.id,
  });
}

async function sendEnrollmentEmail(
  assignment: LearningAssignment,
  learner: User
) {
  if (!learner.email) {
    return false;
  }

  const team = await assignment.$get("team");

  if (!team) {
    throw NotFoundError("Learning assignment team not found");
  }

  await new LearningReminderEmail({
    courseTitle: UNDERWRITING_COURSE_TITLE,
    dueAt: assignment.dueAt ? format(assignment.dueAt, "MMM d, yyyy") : null,
    kind: "enrollment",
    language: learner.language,
    learningUrl: `${team.url}${UNDERWRITING_COURSE_PATH}`,
    name: learner.name,
    teamUrl: team.url,
    to: learner.email,
  }).schedule();

  return true;
}

async function awardBadgeIfEligible(
  ctx: APIContext,
  assignment: LearningAssignment
) {
  if (assignment.courseId !== UNDERWRITING_COURSE_ID) {
    return undefined;
  }

  if (assignment.progressPercent < 100) {
    return undefined;
  }

  if (
    countCompletedSkillChecks(assignment.progress) <
    UNDERWRITING_REQUIRED_SKILL_CHECK_COUNT
  ) {
    return undefined;
  }

  if (
    countPassedRequiredQuizzes(assignment.progress) <
    UNDERWRITING_REQUIRED_QUIZ_COUNT
  ) {
    return undefined;
  }

  const [badge] = await LearningBadge.findOrCreate({
    where: {
      badgeId: UNDERWRITING_CERTIFIED_BADGE_ID,
      courseId: assignment.courseId,
      teamId: assignment.teamId,
      userId: assignment.userId,
    },
    defaults: {
      awardedAt: new Date(),
      badgeId: UNDERWRITING_CERTIFIED_BADGE_ID,
      courseId: assignment.courseId,
      data: {
        label: "Underwriting Certified",
      },
      teamId: assignment.teamId,
      userId: assignment.userId,
    },
  });

  return badge;
}

async function buildReportRows(courseId: string, user: User, limit: number) {
  const where = user.isAdmin
    ? {
        courseId,
        teamId: user.teamId,
      }
    : {
        courseId,
        teamId: user.teamId,
        userId: user.id,
      };

  const assignments = await LearningAssignment.findAll({
    include: [
      {
        model: User,
        as: "user",
        required: true,
      },
    ],
    limit,
    order: [
      ["status", "ASC"],
      ["updatedAt", "DESC"],
    ],
    where,
  });

  const badges = await LearningBadge.findAll({
    where: {
      badgeId: UNDERWRITING_CERTIFIED_BADGE_ID,
      courseId,
      teamId: user.teamId,
      userId: {
        [Op.in]: assignments.map((assignment) => assignment.userId),
      },
    },
  });
  const badgeUserIds = new Set(badges.map((badge) => badge.userId));

  return assignments.map((assignment): LearningReportRow => {
    const progress = assignment.progress ?? {};
    const moduleQuizStats = getModuleQuizStats(progress);
    return {
      assignedAt: assignment.assignedAt.toISOString(),
      badgeEarned: badgeUserIds.has(assignment.userId),
      completedAt: assignment.completedAt?.toISOString() ?? null,
      courseId: assignment.courseId,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      lastActivityAt: assignment.lastActivityAt?.toISOString() ?? null,
      learnerEmail: assignment.user.email,
      learnerId: assignment.userId,
      learnerName: assignment.user.name,
      lessonsCompleted: countCompletedLessons(progress),
      progressPercent: assignment.progressPercent,
      completionSeconds: progress.completionSeconds ?? null,
      courseStartedAt: progress.courseStartedAt ?? null,
      quizAttemptCount: countQuizAttempts(progress),
      quizFailureCount: countQuizFailures(progress),
      moduleQuizStats,
      quizzesPassed: countPassedRequiredQuizzes(progress),
      quizzesRequired: UNDERWRITING_REQUIRED_QUIZ_COUNT,
      skillChecksCompleted: countCompletedSkillChecks(progress),
      skillChecksRequired: Math.max(
        countRequiredSkillChecks(progress),
        UNDERWRITING_REQUIRED_SKILL_CHECK_COUNT
      ),
      status: getAssignmentStatus(
        assignment.progressPercent,
        assignment.dueAt,
        assignment.completedAt
      ),
    };
  });
}

function buildSummary(rows: LearningReportRow[]): LearningReportSummary {
  const assigned = rows.length;
  const completed = rows.filter(
    (row) => row.status === LearningAssignmentStatus.Completed
  ).length;
  const notStarted = rows.filter(
    (row) => row.status === LearningAssignmentStatus.NotStarted
  ).length;
  const inProgress = rows.filter(
    (row) => row.status === LearningAssignmentStatus.InProgress
  ).length;
  const overdue = rows.filter(
    (row) => row.status === LearningAssignmentStatus.Overdue
  ).length;
  const averageProgress = assigned
    ? Math.round(
        rows.reduce((total, row) => total + row.progressPercent, 0) / assigned
      )
    : 0;

  return {
    assigned,
    averageProgress,
    badgesAwarded: rows.filter((row) => row.badgeEarned).length,
    completed,
    completionRate: assigned ? Math.round((completed / assigned) * 100) : 0,
    inProgress,
    notStarted,
    overdue,
  };
}

async function buildOverview(
  ctx: APIContext,
  courseId = UNDERWRITING_COURSE_ID
): Promise<LearningOverview> {
  const { user } = ctx.state.auth;
  const assignment = await ensureAssignment(ctx, courseId);
  const rows = await buildReportRows(courseId, user, 200);
  const selfRow = rows.find((row) => row.learnerId === user.id);

  if (!selfRow) {
    throw NotFoundError("Learning assignment not found");
  }

  const badges = await LearningBadge.findAll({
    where: {
      courseId,
      teamId: user.teamId,
      userId: user.id,
    },
  });

  return {
    assignment: selfRow,
    badges: badges.map((badge) => ({
      awardedAt: badge.awardedAt.toISOString(),
      badgeId: badge.badgeId,
      label:
        badge.badgeId === UNDERWRITING_CERTIFIED_BADGE_ID
          ? "Underwriting Certified"
          : badge.badgeId,
    })),
    course: {
      id: assignment.courseId,
      requiredLessonCount: UNDERWRITING_REQUIRED_LESSON_COUNT,
      requiredQuizCount: UNDERWRITING_REQUIRED_QUIZ_COUNT,
      title: UNDERWRITING_COURSE_TITLE,
    },
    gates: buildGateState(assignment.progress),
    reporting: {
      generatedAt: new Date().toISOString(),
      rows,
      summary: buildSummary(rows),
      visibleScope: user.isAdmin ? "team" : "self",
    },
  };
}

router.post(
  "learning.overview",
  auth(),
  validate(T.LearningOverviewSchema),
  async (ctx: APIContext<T.LearningOverviewReq>) => {
    const courseId = normalizeCourseId(ctx.input.body.courseId);

    ctx.body = {
      data: await buildOverview(ctx, courseId),
    };
  }
);

router.post(
  "learning.progress",
  auth(),
  validate(T.LearningProgressSchema),
  async (ctx: APIContext<T.LearningProgressReq>) => {
    const { user } = ctx.state.auth;
    const {
      checkpointCount,
      completedCheckpointIds,
      failedCheckpointIds,
      lessonCompleted,
      lessonNumber,
      maxWatched,
      moduleNumber,
      totalDuration,
    } = ctx.input.body;
    const courseId = normalizeCourseId(ctx.input.body.courseId);
    const assignment = await ensureAssignment(ctx, courseId);
    const lessonKey = getLessonKey(moduleNumber, lessonNumber);
    const progress = assignment.progress ?? {};

    if (
      lessonCompleted &&
      assignment.status === LearningAssignmentStatus.NotStarted &&
      assignment.progressPercent === 0 &&
      !hasAnyCourseProgress(progress)
    ) {
      // A reset assignment should not be rehydrated by a stale browser tab that
      // still has completed lesson state in localStorage.
      ctx.body = {
        data: await buildOverview(ctx, courseId),
      };
      return;
    }

    const lessons = progress.lessons ?? {};
    const watchedPercent = totalDuration
      ? Math.round(
          Math.min(100, Math.max(0, (maxWatched / totalDuration) * 100))
        )
      : lessonCompleted
        ? 100
        : 0;

    const nextProgress: LearningProgressState = ensureCourseStarted({
      ...progress,
      lessons: {
        ...lessons,
        [lessonKey]: {
          checkpointCount,
          completedCheckpointCount: completedCheckpointIds.length,
          failedCheckpointCount: failedCheckpointIds.length,
          lessonCompleted,
          lessonNumber,
          moduleNumber,
          progressPercent: lessonCompleted ? 100 : watchedPercent,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    const progressPercent = getProgressPercent(nextProgress);
    const completedAt =
      progressPercent >= 100 ? (assignment.completedAt ?? new Date()) : null;
    const completedProgress = withCompletionState(nextProgress, completedAt);
    const status = getAssignmentStatus(
      progressPercent,
      assignment.dueAt,
      completedAt
    );

    await assignment.updateWithCtx(ctx, {
      completedAt,
      lastActivityAt: new Date(),
      progress: completedProgress,
      progressPercent,
      status,
    });

    await LearningEvent.createWithCtx(ctx, {
      courseId,
      data: {
        checkpointCount,
        completedCheckpointCount: completedCheckpointIds.length,
        failedCheckpointCount: failedCheckpointIds.length,
        lessonCompleted,
        maxWatched,
        totalDuration,
      },
      event: lessonCompleted ? "lesson_completed" : "progress_updated",
      lessonNumber,
      moduleNumber,
      progressPercent,
      teamId: user.teamId,
      userId: user.id,
    });

    await awardBadgeIfEligible(ctx, assignment);

    ctx.body = {
      data: await buildOverview(ctx, courseId),
    };
  }
);

router.post(
  "learning.quizStart",
  auth(),
  validate(T.LearningQuizStartSchema),
  async (ctx: APIContext<T.LearningQuizStartReq>) => {
    const { user } = ctx.state.auth;
    const courseId = normalizeCourseId(ctx.input.body.courseId);
    const { moduleNumber, quizId, reviewPassedAttempt } = ctx.input.body;
    const quiz = getUnderwritingQuizById(quizId);

    if (!quiz || quiz.moduleNumber !== moduleNumber) {
      throw ValidationError("Quiz not found");
    }

    const assignment = await ensureAssignment(ctx, courseId);
    const gate = buildGateState(assignment.progress).find(
      (item) => item.moduleNumber === moduleNumber
    );
    if (gate?.locked) {
      throw ValidationError(gate.lockedReason ?? "Module is locked");
    }

    const progress = ensureCourseStarted(assignment.progress ?? {});
    const startedAt = new Date();

    await assignment.updateWithCtx(ctx, {
      lastActivityAt: startedAt,
      progress,
      status: getAssignmentStatus(
        assignment.progressPercent,
        assignment.dueAt,
        assignment.completedAt
      ),
    });

    await LearningEvent.createWithCtx(ctx, {
      courseId,
      data: {
        quizId,
        requiredPercent: quiz.requiredPercent,
      },
      event: "quiz_started",
      lessonNumber: quiz.lessonNumber,
      moduleNumber,
      progressPercent: assignment.progressPercent,
      teamId: user.teamId,
      userId: user.id,
    });

    const latestPassedAttempt = reviewPassedAttempt
      ? await LearningQuizAttempt.findOne({
          order: [["submittedAt", "DESC"]],
          where: {
            courseId,
            moduleNumber,
            passed: true,
            quizId,
            teamId: user.teamId,
            userId: user.id,
          },
        })
      : null;

    ctx.body = {
      data: {
        quizId,
        requiredPercent: quiz.requiredPercent,
        review: latestPassedAttempt
          ? buildPassedQuizReview({
              assignment,
              attempt: latestPassedAttempt,
              quiz,
            })
          : null,
        startedAt: startedAt.toISOString(),
      },
    };
  }
);

router.post(
  "learning.quizSubmit",
  auth(),
  validate(T.LearningQuizSubmitSchema),
  async (ctx: APIContext<T.LearningQuizSubmitReq>) => {
    const { user } = ctx.state.auth;
    const courseId = normalizeCourseId(ctx.input.body.courseId);
    const {
      answers,
      displayOrder = {},
      moduleNumber,
      quizId,
      startedAt,
    } = ctx.input.body;
    const quiz = getUnderwritingQuizById(quizId);

    if (!quiz || quiz.moduleNumber !== moduleNumber) {
      throw ValidationError("Quiz not found");
    }

    const assignment = await ensureAssignment(ctx, courseId);
    const gate = buildGateState(assignment.progress).find(
      (item) => item.moduleNumber === moduleNumber
    );
    if (gate?.locked) {
      throw ValidationError(gate.lockedReason ?? "Module is locked");
    }

    const submittedAt = new Date();
    const startedDate = new Date(startedAt);
    const maxScore = quiz.questions.length;
    const gradedAnswers = quiz.questions.map((question) => {
      const selectedOptionId = answers[question.id] ?? "";
      const selectedOption = question.options.find(
        (option) => option.id === selectedOptionId
      );
      const correctOption = question.options.find((option) => option.correct);

      return {
        concept: question.concept,
        correct: Boolean(selectedOption?.correct),
        correctOptionId: correctOption?.id ?? null,
        questionId: question.id,
        questionNumber: question.number,
        selectedOptionId,
      };
    });
    const score = gradedAnswers.filter((answer) => answer.correct).length;
    const scorePercent = Math.round((score / maxScore) * 100);
    const passed = scorePercent >= quiz.requiredPercent;
    const previousAttempts = await LearningQuizAttempt.count({
      where: {
        courseId,
        moduleNumber,
        quizId,
        teamId: user.teamId,
        userId: user.id,
      },
    });
    const attemptNumber = previousAttempts + 1;

    await LearningQuizAttempt.createWithCtx(ctx, {
      answers: {
        displayOrder,
        items: gradedAnswers,
      },
      attemptNumber,
      courseId,
      durationSeconds: Math.max(
        0,
        Math.round((submittedAt.getTime() - startedDate.getTime()) / 1000)
      ),
      maxScore,
      moduleNumber,
      passed,
      questionSnapshot: {
        questions: quiz.questions.map((question) => {
          const displayedOptionIds =
            displayOrder[question.id] ??
            question.options.map((option) => option.id);
          const displayedOptions = displayedOptionIds
            .map((optionId) =>
              question.options.find((option) => option.id === optionId)
            )
            .filter((option) => option !== undefined);

          return {
            id: question.id,
            concept: question.concept,
            displayOrder: displayedOptionIds,
            number: question.number,
            options: displayedOptions.map((option) => ({
              id: option.id,
              label: option.label,
              text: option.text,
            })),
            stem: question.stem,
          };
        }),
      },
      quizId,
      requiredPercent: quiz.requiredPercent,
      score,
      scorePercent,
      startedAt: startedDate,
      submittedAt,
      teamId: user.teamId,
      userId: user.id,
    });

    const progress = ensureCourseStarted(assignment.progress ?? {});
    const quizzes = progress.quizzes ?? {};
    const previousQuiz = quizzes[quizId];
    const nextQuizProgress = {
      attemptCount: attemptNumber,
      bestScore: Math.max(previousQuiz?.bestScore ?? 0, score),
      bestScorePercent: Math.max(
        previousQuiz?.bestScorePercent ?? 0,
        scorePercent
      ),
      lastAttemptAt: submittedAt.toISOString(),
      maxScore,
      moduleNumber,
      passed: Boolean(previousQuiz?.passed || passed),
      passedAt:
        previousQuiz?.passedAt ??
        (passed ? submittedAt.toISOString() : undefined),
      quizId,
      requiredPercent: quiz.requiredPercent,
    };
    const nextProgress: LearningProgressState = {
      ...progress,
      quizzes: {
        ...quizzes,
        [quizId]: nextQuizProgress,
      },
    };
    const progressPercent = getProgressPercent(nextProgress);
    const completedAt =
      progressPercent >= 100 ? (assignment.completedAt ?? submittedAt) : null;
    const completedProgress = withCompletionState(nextProgress, completedAt);
    const status = getAssignmentStatus(
      progressPercent,
      assignment.dueAt,
      completedAt
    );

    await assignment.updateWithCtx(ctx, {
      completedAt,
      lastActivityAt: submittedAt,
      progress: completedProgress,
      progressPercent,
      status,
    });

    await LearningEvent.createWithCtx(ctx, {
      courseId,
      data: {
        attemptNumber,
        maxScore,
        passed,
        quizId,
        requiredPercent: quiz.requiredPercent,
        score,
        scorePercent,
      },
      event: passed ? "quiz_passed" : "quiz_failed",
      lessonNumber: quiz.lessonNumber,
      moduleNumber,
      progressPercent,
      teamId: user.teamId,
      userId: user.id,
    });

    await awardBadgeIfEligible(ctx, assignment);

    ctx.body = {
      data: {
        attemptNumber,
        gates: buildGateState(completedProgress),
        maxScore,
        missed: gradedAnswers.filter((answer) => !answer.correct),
        passed,
        progressPercent,
        requiredPercent: quiz.requiredPercent,
        score,
        scorePercent,
      },
    };
  }
);

router.post(
  "learning.notesList",
  auth(),
  validate(T.LearningNotesListSchema),
  async (ctx: APIContext<T.LearningNotesListReq>) => {
    const { user } = ctx.state.auth;
    const courseId = normalizeCourseId(ctx.input.body.courseId);
    const { moduleNumber } = ctx.input.body;
    await ensureAssignment(ctx, courseId);

    const notes = await LearningModuleNote.findAll({
      order: [["createdAt", "ASC"]],
      where: {
        courseId,
        moduleNumber,
        teamId: user.teamId,
        userId: user.id,
      },
    });

    ctx.body = {
      data: notes.map((note) => ({
        body: note.body,
        courseId: note.courseId,
        createdAt: note.createdAt.toISOString(),
        id: note.id,
        lessonNumber: note.lessonNumber,
        lessonTitle: note.lessonTitle,
        moduleNumber: note.moduleNumber,
        updatedAt: note.updatedAt.toISOString(),
      })),
    };
  }
);

router.post(
  "learning.noteCreate",
  auth(),
  validate(T.LearningNoteCreateSchema),
  async (ctx: APIContext<T.LearningNoteCreateReq>) => {
    const { user } = ctx.state.auth;
    const courseId = normalizeCourseId(ctx.input.body.courseId);
    const { body, lessonNumber, lessonTitle, moduleNumber } = ctx.input.body;
    const assignment = await ensureAssignment(ctx, courseId);
    const progress = ensureCourseStarted(assignment.progress ?? {});
    const now = new Date();

    const note = await LearningModuleNote.createWithCtx(ctx, {
      body,
      courseId,
      lessonNumber,
      lessonTitle,
      moduleNumber,
      teamId: user.teamId,
      userId: user.id,
    });

    await assignment.updateWithCtx(ctx, {
      lastActivityAt: now,
      progress,
      status: getAssignmentStatus(
        assignment.progressPercent,
        assignment.dueAt,
        assignment.completedAt
      ),
    });

    await LearningEvent.createWithCtx(ctx, {
      courseId,
      data: {
        noteId: note.id,
      },
      event: "note_created",
      lessonNumber,
      moduleNumber,
      progressPercent: assignment.progressPercent,
      teamId: user.teamId,
      userId: user.id,
    });

    ctx.body = {
      data: {
        body: note.body,
        courseId: note.courseId,
        createdAt: note.createdAt.toISOString(),
        id: note.id,
        lessonNumber: note.lessonNumber,
        lessonTitle: note.lessonTitle,
        moduleNumber: note.moduleNumber,
        updatedAt: note.updatedAt.toISOString(),
      },
    };
  }
);

router.post(
  "learning.noteUpdate",
  auth(),
  validate(T.LearningNoteUpdateSchema),
  async (ctx: APIContext<T.LearningNoteUpdateReq>) => {
    const { user } = ctx.state.auth;
    const { body, id } = ctx.input.body;
    const note = await LearningModuleNote.findOne({
      where: {
        id,
        teamId: user.teamId,
        userId: user.id,
      },
    });

    if (!note) {
      throw NotFoundError("Learning note not found");
    }

    await note.updateWithCtx(ctx, {
      body,
    });

    ctx.body = {
      data: {
        body: note.body,
        courseId: note.courseId,
        createdAt: note.createdAt.toISOString(),
        id: note.id,
        lessonNumber: note.lessonNumber,
        lessonTitle: note.lessonTitle,
        moduleNumber: note.moduleNumber,
        updatedAt: note.updatedAt.toISOString(),
      },
    };
  }
);

router.post(
  "learning.noteDelete",
  auth(),
  validate(T.LearningNoteDeleteSchema),
  async (ctx: APIContext<T.LearningNoteDeleteReq>) => {
    const { user } = ctx.state.auth;
    const { id } = ctx.input.body;
    const note = await LearningModuleNote.findOne({
      where: {
        id,
        teamId: user.teamId,
        userId: user.id,
      },
    });

    if (!note) {
      throw NotFoundError("Learning note not found");
    }

    await note.destroyWithCtx(ctx);

    ctx.body = {
      data: {
        id,
      },
    };
  }
);

router.post(
  "learning.assign",
  auth(),
  validate(T.LearningAssignSchema),
  async (ctx: APIContext<T.LearningAssignReq>) => {
    const { user } = ctx.state.auth;

    if (!user.isAdmin) {
      throw AuthorizationError("Admin access required to assign training");
    }

    const courseId = normalizeCourseId(ctx.input.body.courseId);
    const dueAt = ctx.input.body.dueAt ? new Date(ctx.input.body.dueAt) : null;
    const required = ctx.input.body.required ?? true;
    const userIds = ctx.input.body.userIds ?? [];
    const emails = (ctx.input.body.emails ?? []).map(normalizeEmail);
    const lookupWhere =
      userIds.length && emails.length
        ? {
            [Op.or]: [
              {
                id: {
                  [Op.in]: userIds,
                },
              },
              {
                email: {
                  [Op.in]: emails,
                },
              },
            ],
          }
        : userIds.length
          ? {
              id: {
                [Op.in]: userIds,
              },
            }
          : {
              email: {
                [Op.in]: emails,
              },
            };
    const users = await User.findAll({
      where: {
        ...lookupWhere,
        teamId: user.teamId,
      },
    });
    const foundEmails = new Set(
      users
        .map((assignedUser) => assignedUser.email)
        .filter((email): email is string => Boolean(email))
        .map(normalizeEmail)
    );
    const emailed: string[] = [];

    for (const assignedUser of users) {
      const [assignment, created] = await LearningAssignment.findOrCreate({
        where: {
          courseId,
          teamId: user.teamId,
          userId: assignedUser.id,
        },
        defaults: {
          assignedAt: new Date(),
          assignedById: user.id,
          courseId,
          dueAt: dueAt ?? dueDateFromNow(),
          progress: {},
          progressPercent: 0,
          required,
          status: LearningAssignmentStatus.NotStarted,
          teamId: user.teamId,
          userId: assignedUser.id,
        },
      });

      if (
        dueAt ||
        assignment.required !== required ||
        assignment.assignedById !== user.id
      ) {
        await assignment.update({
          assignedById: assignment.assignedById ?? user.id,
          dueAt: dueAt ?? assignment.dueAt,
          required,
          status: getAssignmentStatus(
            assignment.progressPercent,
            dueAt ?? assignment.dueAt,
            assignment.completedAt
          ),
        });
      }

      if (created || !assignment.enrollmentReminderSentAt) {
        const sent = await sendEnrollmentEmail(assignment, assignedUser);
        if (sent) {
          await assignment.update({
            enrollmentReminderSentAt: new Date(),
          });
          if (assignedUser.email) {
            emailed.push(assignedUser.email);
          }
        }
      }
    }

    ctx.body = {
      data: {
        assigned: users.length,
        courseId,
        emailed,
        missingEmails: emails.filter((email) => !foundEmails.has(email)),
        users: users.map((assignedUser) => ({
          email: assignedUser.email,
          id: assignedUser.id,
          name: assignedUser.name,
        })),
      },
    };
  }
);

router.post(
  "learning.reporting",
  auth(),
  validate(T.LearningReportingSchema),
  async (ctx: APIContext<T.LearningReportingReq>) => {
    const { user } = ctx.state.auth;
    const {
      cohort,
      limit = 200,
      manager,
      moduleId,
      scope = "course",
      team,
    } = ctx.input.body;
    const courseId = normalizeCourseId(ctx.input.body.courseId);
    await ensureAssignment(ctx, courseId);

    const rows = await buildReportRows(courseId, user, limit);
    const generatedAt = new Date().toISOString();

    ctx.body = {
      data: {
        filters: {
          cohort,
          courseId,
          limit,
          manager,
          moduleId,
          scope,
          team,
        },
        generatedAt,
        rows,
        source: "learning_assignments",
        status: "ready",
        summary: buildSummary(rows),
        visibleScope: user.isAdmin ? "team" : "self",
      },
    };
  }
);

export default router;
