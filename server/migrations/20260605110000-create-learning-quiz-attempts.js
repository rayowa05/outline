"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "learning_quiz_attempts",
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
          quizId: {
            type: Sequelize.STRING(96),
            allowNull: false,
          },
          attemptNumber: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          score: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          maxScore: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          scorePercent: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          passed: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          requiredPercent: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 100,
          },
          startedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          submittedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          durationSeconds: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          answers: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          questionSnapshot: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
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
        "learning_quiz_attempts",
        ["teamId", "userId", "courseId", "moduleNumber", "attemptNumber"],
        { transaction }
      );
      await queryInterface.addIndex(
        "learning_quiz_attempts",
        ["teamId", "courseId", "moduleNumber", "passed", "submittedAt"],
        { transaction }
      );
      await queryInterface.addIndex(
        "learning_quiz_attempts",
        ["teamId", "courseId", "userId", "submittedAt"],
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("learning_quiz_attempts", {
        transaction,
      });
    });
  },
};
