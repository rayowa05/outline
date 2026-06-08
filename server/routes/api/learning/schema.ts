import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const LearningReportScope = z.enum([
  "learner",
  "module",
  "manager",
  "team",
  "course",
  "question",
]);

export const LearningReportingSchema = BaseSchema.extend({
  body: z.object({
    scope: LearningReportScope.default("course").optional(),
    courseId: z.string().max(64).default("underwriting-training").optional(),
    moduleId: z.string().optional(),
    manager: z.string().optional(),
    team: z.string().optional(),
    cohort: z.string().optional(),
    limit: z.number().int().positive().max(500).default(200).optional(),
  }),
});

export const LearningOverviewSchema = BaseSchema.extend({
  body: z.object({
    courseId: z.string().max(64).default("underwriting-training").optional(),
  }),
});

export const LearningProgressSchema = BaseSchema.extend({
  body: z.object({
    courseId: z.string().max(64).default("underwriting-training").optional(),
    moduleNumber: z.number().int().positive(),
    lessonNumber: z.number().int().positive(),
    lessonCompleted: z.boolean().default(false),
    maxWatched: z.number().nonnegative().default(0),
    totalDuration: z.number().nonnegative().default(0),
    completedCheckpointIds: z.array(z.string()).default([]),
    checkpointCount: z.number().int().nonnegative().default(0),
  }),
});

export const LearningQuizStartSchema = BaseSchema.extend({
  body: z.object({
    courseId: z.string().max(64).default("underwriting-training").optional(),
    moduleNumber: z.number().int().positive(),
    quizId: z.string().max(96),
    reviewPassedAttempt: z.boolean().default(true).optional(),
  }),
});

export const LearningQuizSubmitSchema = BaseSchema.extend({
  body: z.object({
    courseId: z.string().max(64).default("underwriting-training").optional(),
    moduleNumber: z.number().int().positive(),
    quizId: z.string().max(96),
    startedAt: z.iso.datetime(),
    answers: z.record(z.string(), z.string()),
    displayOrder: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export const LearningNotesListSchema = BaseSchema.extend({
  body: z.object({
    courseId: z.string().max(64).default("underwriting-training").optional(),
    moduleNumber: z.number().int().positive(),
  }),
});

export const LearningNoteCreateSchema = BaseSchema.extend({
  body: z.object({
    courseId: z.string().max(64).default("underwriting-training").optional(),
    moduleNumber: z.number().int().positive(),
    lessonNumber: z.number().int().positive(),
    lessonTitle: z.string().max(160),
    body: z.string().trim().min(1).max(8000),
  }),
});

export const LearningNoteUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
    body: z.string().trim().min(1).max(8000),
  }),
});

export const LearningNoteDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
  }),
});

export const LearningAssignSchema = BaseSchema.extend({
  body: z
    .object({
      courseId: z.string().max(64).default("underwriting-training").optional(),
      userIds: z.array(z.uuid()).max(200).default([]).optional(),
      emails: z.array(z.string().email()).max(200).default([]).optional(),
      dueAt: z.iso.datetime().optional(),
      required: z.boolean().default(true).optional(),
    })
    .refine(
      (body) => (body.userIds?.length ?? 0) + (body.emails?.length ?? 0) > 0,
      {
        message: "At least one userId or email is required",
        path: ["userIds"],
      }
    ),
});

export type LearningReportingReq = z.infer<typeof LearningReportingSchema>;
export type LearningOverviewReq = z.infer<typeof LearningOverviewSchema>;
export type LearningProgressReq = z.infer<typeof LearningProgressSchema>;
export type LearningQuizStartReq = z.infer<typeof LearningQuizStartSchema>;
export type LearningQuizSubmitReq = z.infer<typeof LearningQuizSubmitSchema>;
export type LearningNotesListReq = z.infer<typeof LearningNotesListSchema>;
export type LearningNoteCreateReq = z.infer<typeof LearningNoteCreateSchema>;
export type LearningNoteUpdateReq = z.infer<typeof LearningNoteUpdateSchema>;
export type LearningNoteDeleteReq = z.infer<typeof LearningNoteDeleteSchema>;
export type LearningAssignReq = z.infer<typeof LearningAssignSchema>;
