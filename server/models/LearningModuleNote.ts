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

@Table({ tableName: "learning_module_notes", modelName: "learning_module_note" })
@Fix
class LearningModuleNote extends IdModel<
  InferAttributes<LearningModuleNote>,
  Partial<InferCreationAttributes<LearningModuleNote>>
> {
  static eventNamespace = "learning";

  @Column(DataType.STRING(64))
  courseId: string;

  @Column(DataType.INTEGER)
  moduleNumber: number;

  @Column(DataType.INTEGER)
  lessonNumber: number;

  @Column(DataType.STRING(160))
  lessonTitle: string;

  @Column(DataType.TEXT)
  body: string;

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

export default LearningModuleNote;
