"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "learning_assignments",
        "slackEnrollmentReminderSentAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "learning_assignments",
        "slackEnrollmentReminderError",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        "learning_assignments",
        "slackEnrollmentReminderError",
        { transaction }
      );
      await queryInterface.removeColumn(
        "learning_assignments",
        "slackEnrollmentReminderSentAt",
        { transaction }
      );
    });
  },
};
