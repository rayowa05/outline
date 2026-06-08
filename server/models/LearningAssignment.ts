import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

export enum LearningAssignmentStatus {
  NotStarted = "not_started",
  InProgress = "in_progress",
  Completed = "completed",
  Overdue = "overdue",
}

export interface LearningProgressState {
  lessons?: Record<
    string,
    {
      moduleNumber: number;
      lessonNumber: number;
      lessonCompleted: boolean;
      progressPercent: number;
      completedCheckpointCount: number;
      failedCheckpointCount?: number;
      checkpointCount: number;
      updatedAt: string;
    }
  >;
  quizzes?: Record<
    string,
    {
      moduleNumber: number;
      quizId: string;
      passed: boolean;
      bestScore: number;
      maxScore: number;
      bestScorePercent: number;
      requiredPercent: number;
      attemptCount: number;
      lastAttemptAt: string;
      passedAt?: string;
    }
  >;
  courseStartedAt?: string;
  courseCompletedAt?: string;
  completionSeconds?: number;
}

@Table({ tableName: "learning_assignments", modelName: "learning_assignment" })
@Fix
class LearningAssignment extends IdModel<
  InferAttributes<LearningAssignment>,
  Partial<InferCreationAttributes<LearningAssignment>>
> {
  static eventNamespace = "learning";

  @Column(DataType.STRING(64))
  courseId: string;

  @Column(DataType.BOOLEAN)
  required: boolean;

  @Column(DataType.STRING(32))
  status: LearningAssignmentStatus;

  @Column(DataType.INTEGER)
  progressPercent: number;

  @Column(DataType.JSONB)
  progress: LearningProgressState;

  @Column(DataType.DATE)
  assignedAt: Date;

  @Column(DataType.DATE)
  dueAt: Date | null;

  @Column(DataType.DATE)
  completedAt: Date | null;

  @Column(DataType.DATE)
  lastActivityAt: Date | null;

  @Column(DataType.DATE)
  enrollmentReminderSentAt: Date | null;

  @Column(DataType.DATE)
  dueSoonReminderSentAt: Date | null;

  @Column(DataType.DATE)
  overdueReminderSentAt: Date | null;

  @BelongsTo(() => User, "assignedById")
  assignedBy: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  assignedById: string | null;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default LearningAssignment;
