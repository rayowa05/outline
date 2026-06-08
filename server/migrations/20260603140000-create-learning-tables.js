"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "learning_assignments",
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
          required: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          status: {
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: "not_started",
          },
          progressPercent: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          progress: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          assignedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          dueAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          completedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          lastActivityAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          enrollmentReminderSentAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          dueSoonReminderSentAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          overdueReminderSentAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          assignedById: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: "users",
              key: "id",
            },
            onDelete: "SET NULL",
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
        "learning_assignments",
        ["teamId", "userId", "courseId"],
        {
          transaction,
          unique: true,
        }
      );
      await queryInterface.addIndex(
        "learning_assignments",
        ["teamId", "courseId", "status"],
        { transaction }
      );
      await queryInterface.addIndex("learning_assignments", ["dueAt"], {
        transaction,
      });

      await queryInterface.createTable(
        "learning_events",
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
            allowNull: true,
          },
          lessonNumber: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          event: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          progressPercent: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          data: {
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
        "learning_events",
        ["teamId", "courseId", "createdAt"],
        { transaction }
      );
      await queryInterface.addIndex(
        "learning_events",
        ["teamId", "userId", "courseId"],
        { transaction }
      );

      await queryInterface.createTable(
        "learning_badges",
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          badgeId: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          courseId: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          awardedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          data: {
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
        "learning_badges",
        ["teamId", "userId", "courseId", "badgeId"],
        {
          transaction,
          unique: true,
        }
      );
      await queryInterface.addIndex(
        "learning_badges",
        ["teamId", "courseId", "badgeId"],
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("learning_badges", { transaction });
      await queryInterface.dropTable("learning_events", { transaction });
      await queryInterface.dropTable("learning_assignments", { transaction });
    });
  },
};
