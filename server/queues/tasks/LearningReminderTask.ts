import { addDays, format, isAfter, isBefore } from "date-fns";
import { Op } from "sequelize";
import LearningReminderEmail from "@server/emails/templates/LearningReminderEmail";
import { LearningAssignment, Team, User } from "@server/models";
import { LearningAssignmentStatus } from "@server/models/LearningAssignment";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";

const UNDERWRITING_COURSE_TITLE = "Underwriting Training";
const UNDERWRITING_COURSE_PATH = "/learning/underwriting-training";

export default class LearningReminderTask extends CronTask {
  public async perform() {
    const now = new Date();
    const dueSoonCutoff = addDays(now, 3);
    const assignments = await LearningAssignment.findAll({
      include: [
        {
          model: User,
          as: "user",
          required: true,
        },
        {
          model: Team,
          as: "team",
          required: true,
        },
      ],
      where: {
        required: true,
        status: {
          [Op.ne]: LearningAssignmentStatus.Completed,
        },
      },
    });

    for (const assignment of assignments) {
      const dueAt = assignment.dueAt;
      const dueAtLabel = dueAt ? format(dueAt, "MMM d, yyyy") : null;
      const learningUrl = `${assignment.team.url}${UNDERWRITING_COURSE_PATH}`;

      if (!assignment.enrollmentReminderSentAt) {
        await new LearningReminderEmail({
          courseTitle: UNDERWRITING_COURSE_TITLE,
          dueAt: dueAtLabel,
          kind: "enrollment",
          language: assignment.user.language,
          learningUrl,
          name: assignment.user.name,
          teamUrl: assignment.team.url,
          to: assignment.user.email,
        }).schedule();

        assignment.enrollmentReminderSentAt = now;
        await assignment.save();
        continue;
      }

      if (
        dueAt &&
        !assignment.dueSoonReminderSentAt &&
        isAfter(dueAt, now) &&
        isBefore(dueAt, dueSoonCutoff)
      ) {
        await new LearningReminderEmail({
          courseTitle: UNDERWRITING_COURSE_TITLE,
          dueAt: dueAtLabel,
          kind: "due_soon",
          language: assignment.user.language,
          learningUrl,
          name: assignment.user.name,
          teamUrl: assignment.team.url,
          to: assignment.user.email,
        }).schedule();

        assignment.dueSoonReminderSentAt = now;
        await assignment.save();
        continue;
      }

      if (dueAt && !assignment.overdueReminderSentAt && isBefore(dueAt, now)) {
        await new LearningReminderEmail({
          courseTitle: UNDERWRITING_COURSE_TITLE,
          dueAt: dueAtLabel,
          kind: "overdue",
          language: assignment.user.language,
          learningUrl,
          name: assignment.user.name,
          teamUrl: assignment.team.url,
          to: assignment.user.email,
        }).schedule();

        assignment.overdueReminderSentAt = now;
        assignment.status = LearningAssignmentStatus.Overdue;
        await assignment.save();
      }
    }
  }

  public get cron() {
    return {
      interval: TaskInterval.Day,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
