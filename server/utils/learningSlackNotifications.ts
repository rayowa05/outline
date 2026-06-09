import { format } from "date-fns";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import User from "@server/models/User";
import fetch from "@server/utils/fetch";

const SLACK_API_BASE_URL = "https://slack.com/api";
const UNDERWRITING_COURSE_TITLE = "Underwriting Training";

type SlackApiResponse<T extends Record<string, unknown>> = T & {
  ok: boolean;
  error?: string;
};

type SlackUserLookupPayload = {
  user?: {
    id?: string;
  };
};

type SlackConversationOpenPayload = {
  channel?: {
    id?: string;
  };
};

export type LearningSlackNotificationResult =
  | {
      sent: true;
      channelId: string;
    }
  | {
      sent: false;
      error: string;
      skipped?: boolean;
    };

export function isLearningSlackNotificationConfigured() {
  return Boolean(env.LEARNING_SLACK_BOT_TOKEN);
}

function truncateError(error: string) {
  return error.slice(0, 500);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${env.LEARNING_SLACK_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function readSlackJson<T extends Record<string, unknown>>(
  response: Awaited<ReturnType<typeof fetch>>
) {
  const json = (await response.json()) as SlackApiResponse<T>;

  if (!response.ok || !json.ok) {
    throw new Error(json.error ?? `http_${response.status}`);
  }

  return json;
}

async function lookupSlackUserIdByEmail(email: string) {
  const response = await fetch(
    `${SLACK_API_BASE_URL}/users.lookupByEmail?email=${encodeURIComponent(
      email
    )}`,
    {
      headers: authHeaders(),
      timeout: 5000,
    }
  );
  const json = await readSlackJson<SlackUserLookupPayload>(response);
  const userId = json.user?.id;

  if (!userId) {
    throw new Error("slack_user_not_found");
  }

  return userId;
}

async function openDirectMessageChannel(userId: string) {
  const response = await fetch(`${SLACK_API_BASE_URL}/conversations.open`, {
    body: JSON.stringify({
      return_im: true,
      users: userId,
    }),
    headers: authHeaders(),
    method: "POST",
    timeout: 5000,
  });
  const json = await readSlackJson<SlackConversationOpenPayload>(response);
  const channelId = json.channel?.id;

  if (!channelId) {
    throw new Error("slack_dm_channel_not_found");
  }

  return channelId;
}

function buildEnrollmentMessage({
  dueAt,
  learningUrl,
  name,
}: {
  dueAt: Date | null;
  learningUrl: string;
  name: string;
}) {
  const dueLine = dueAt ? `\nDue date: ${format(dueAt, "MMM d, yyyy")}` : "";

  return `Hi ${name}, you have been enrolled in Dash.fi Learning Hub.

Course: ${UNDERWRITING_COURSE_TITLE}${dueLine}

Please complete the required training here:
${learningUrl}

Your progress is tracked in the Learning Hub.`;
}

export async function sendLearningEnrollmentSlackNotification({
  dueAt,
  learner,
  learningUrl,
}: {
  dueAt: Date | null;
  learner: User;
  learningUrl: string;
}): Promise<LearningSlackNotificationResult> {
  if (!env.LEARNING_SLACK_BOT_TOKEN) {
    return {
      error: "slack_not_configured",
      sent: false,
      skipped: true,
    };
  }

  if (!learner.email) {
    return {
      error: "learner_email_missing",
      sent: false,
      skipped: true,
    };
  }

  try {
    const slackUserId = await lookupSlackUserIdByEmail(learner.email);
    const channelId = await openDirectMessageChannel(slackUserId);

    await readSlackJson<Record<string, unknown>>(
      await fetch(`${SLACK_API_BASE_URL}/chat.postMessage`, {
        body: JSON.stringify({
          channel: channelId,
          text: buildEnrollmentMessage({
            dueAt,
            learningUrl,
            name: learner.name,
          }),
          unfurl_links: false,
          unfurl_media: false,
        }),
        headers: authHeaders(),
        method: "POST",
        timeout: 5000,
      })
    );

    return {
      channelId,
      sent: true,
    };
  } catch (err) {
    const error = truncateError(
      err instanceof Error ? err.message : "slack_notification_failed"
    );

    Logger.warn("Learning Hub Slack enrollment notification failed", {
      error,
      userId: learner.id,
    });

    return {
      error,
      sent: false,
    };
  }
}
