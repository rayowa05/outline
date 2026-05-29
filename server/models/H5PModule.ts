import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({ tableName: "h5p_modules", modelName: "h5p_module" })
@Fix
class H5PModule extends IdModel<
  InferAttributes<H5PModule>,
  Partial<InferCreationAttributes<H5PModule>>
> {
  @Length({
    max: 64,
    msg: "moduleId must be 64 characters or less",
  })
  @Column
  moduleId: string;

  @Length({
    max: 255,
    msg: "title must be 255 characters or less",
  })
  @Column
  title: string;

  @Length({
    max: 255,
    msg: "contentType must be 255 characters or less",
  })
  @Column
  contentType: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;
}

export default H5PModule;
