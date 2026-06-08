"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "learning_module_notes",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          courseId: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          moduleNumber: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          lessonNumber: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          lessonTitle: {
            type: Sequelize.STRING(160),
            allowNull: false,
          },
          body: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          userId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          teamId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "teams",
              key: "id",
            },
            onDelete: "CASCADE",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "learning_module_notes",
        ["teamId", "userId", "courseId", "moduleNumber", "createdAt"],
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("learning_module_notes", { transaction });
    });
  },
};
