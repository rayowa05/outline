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

@Table({ tableName: "learning_badges", modelName: "learning_badge" })
@Fix
class LearningBadge extends IdModel<
  InferAttributes<LearningBadge>,
  Partial<InferCreationAttributes<LearningBadge>>
> {
  static eventNamespace = "learning";

  @Column(DataType.STRING(64))
  badgeId: string;

  @Column(DataType.STRING(64))
  courseId: string;

  @Column(DataType.DATE)
  awardedAt: Date;

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

export default LearningBadge;
