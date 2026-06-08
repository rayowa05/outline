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

@Table({
  tableName: "learning_quiz_attempts",
  modelName: "learning_quiz_attempt",
})
@Fix
class LearningQuizAttempt extends IdModel<
  InferAttributes<LearningQuizAttempt>,
  Partial<InferCreationAttributes<LearningQuizAttempt>>
> {
  static eventNamespace = "learning";

  @Column(DataType.STRING(64))
  courseId: string;

  @Column(DataType.INTEGER)
  moduleNumber: number;

  @Column(DataType.STRING(96))
  quizId: string;

  @Column(DataType.INTEGER)
  attemptNumber: number;

  @Column(DataType.INTEGER)
  score: number;

  @Column(DataType.INTEGER)
  maxScore: number;

  @Column(DataType.INTEGER)
  scorePercent: number;

  @Column(DataType.BOOLEAN)
  passed: boolean;

  @Column(DataType.INTEGER)
  requiredPercent: number;

  @Column(DataType.DATE)
  startedAt: Date;

  @Column(DataType.DATE)
  submittedAt: Date;

  @Column(DataType.INTEGER)
  durationSeconds: number;

  @Column(DataType.JSONB)
  answers: Record<string, unknown>;

  @Column(DataType.JSONB)
  questionSnapshot: Record<string, unknown>;

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

export default LearningQuizAttempt;
