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

@Table({ tableName: "learning_events", modelName: "learning_event" })
@Fix
class LearningEvent extends IdModel<
  InferAttributes<LearningEvent>,
  Partial<InferCreationAttributes<LearningEvent>>
> {
  static eventNamespace = "learning";

  @Column(DataType.STRING(64))
  courseId: string;

  @Column(DataType.INTEGER)
  moduleNumber: number | null;

  @Column(DataType.INTEGER)
  lessonNumber: number | null;

  @Column(DataType.STRING(64))
  event: string;

  @Column(DataType.INTEGER)
  progressPercent: number;

  @Column(DataType.JSONB)
  data: Record<string, unknown>;

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

export default LearningEvent;
