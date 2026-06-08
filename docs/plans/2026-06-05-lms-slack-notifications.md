# DashFi Learning Hub Slack Notifications

Date: 2026-06-05
Surface: DashFi Learning Hub / Underwriting Training
Status: Slack app created, branded, and installed

## App Setup Status

- Workspace: DashFi
- App name: DashFi Learning Hub
- Bot display name: DashFi Learning Hub
- App ID: `A0B8N271022`
- App created: June 5, 2026
- App installed to workspace: Yes
- Brand color: `#1c2018`
- App icon: uploaded from the LMS app icon asset
- Bot token: generated in Slack, not stored in repo

## Answer

Yes, we can build Slack notifications for the Learning Hub.

What I can do now:

- Draft the Slack app manifest.
- Build the LMS backend integration once we have the bot token and signing secret.
- Map LMS users to Slack users by email.
- Send assignment, reminder, failure, and completion messages.
- Add reporting/manager digest messages.

What required Slack admin/app console access:

- Create or install the Slack app in the DashFi workspace. Done.
- Approve requested bot scopes. Done.
- Copy the bot token and signing secret into Fly secrets.

The current Slack MCP can list channels/users and post to channels, but it is not a production Slack app creator and does not expose bot token installation or app manifest creation.

## Recommended App

App name:

```text
DashFi Learning Hub
```

Bot display name:

```text
DashFi Learning Hub
```

Purpose:

```text
Send required training assignments, due reminders, quiz retry prompts, completion celebrations, and manager progress digests.
```

## Minimum Bot Scopes

Use these scopes for the first production version:

| Scope | Why |
|---|---|
| `chat:write` | Send Slack messages as the app |
| `users:read` | List users and resolve Slack IDs |
| `users:read.email` | Match LMS users to Slack users by email |
| `im:write` | Open/direct-message learners when needed |
| `channels:read` | Resolve announcement/reporting channels if we use channel messages |

Optional later:

| Scope | Why |
|---|---|
| `chat:write.public` | Post to public channels the bot has not joined |
| `reactions:write` | Add confirmation reactions to admin/test messages |

## Slack App Manifest Draft

```yaml
display_information:
  name: DashFi Learning Hub
  description: Learning assignments and reminders for DashFi training.
  background_color: "#1c2018"
features:
  bot_user:
    display_name: DashFi Learning Hub
    always_online: false
oauth_config:
  scopes:
    bot:
      - chat:write
      - users:read
      - users:read.email
      - im:write
      - channels:read
settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

## Fly Secrets Needed

After installing the app, add:

```bash
~/.fly/bin/flyctl secrets set \
  LEARNING_SLACK_BOT_TOKEN='xoxb-...' \
  LEARNING_SLACK_SIGNING_SECRET='...' \
  -a dashfi-kb-staging
```

Optional:

```bash
~/.fly/bin/flyctl secrets set \
  LEARNING_SLACK_MANAGER_CHANNEL_ID='C...' \
  -a dashfi-kb-staging
```

## Message Events To Build

Phase 1:

- Assignment DM: sent when learner is assigned Underwriting Training.
- Due reminder DM: sent 3 days before due date.
- Overdue DM: sent after due date.
- Quiz failure DM: sent when a learner misses a module knowledge check.
- Completion DM: sent when the learner completes the course.

Phase 2:

- Manager digest: daily or twice-weekly channel summary.
- Leaderboard announcement: optional, if Ray approves public visibility.
- Admin test endpoint: send a test DM to a selected learner.

## Backend Implementation Plan

1. Add Slack config to `server/env.ts`.
2. Add a small Slack client wrapper, e.g. `server/utils/learningSlack.ts`.
3. Add user lookup by email using Slack `users.lookupByEmail` or cached `users.list`.
4. Store Slack user ID mapping, ideally in the existing learning/reporting layer or a small table.
5. Extend `LearningReminderTask` to send Slack DMs when email is scheduled.
6. Add Slack send events to `LearningEvent` for auditability.
7. Add fallback behavior:
   - If Slack user lookup fails, keep email as backup.
   - If Slack send fails, log the failure and do not block LMS progress.

## Open Decisions

- Should Slack be primary and email fallback, or should both fire for launch?
- Should manager digests go to `sales-comms`, a private manager channel, or a new `learning-hub` channel?
- Should quiz-failure reminders be private only? Recommendation: private DM only.
- Should completion celebrations be private or public? Recommendation: private for v1, public only if Ray approves.

## Current Constraints

- The repo has Outline Slack OAuth references, but no Learning Hub Slack notification implementation.
- No Learning Hub Slack secrets are currently deployed in Fly for `dashfi-kb-staging` or production.
- The available Slack MCP is useful for discovery/testing, not for creating/installing a production Slack app.
