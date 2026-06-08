# LMS Email Delivery Readiness

Date: 2026-06-05
Surface: `https://kb.dash.fi/learning`
App: `dashfi-kb-staging`
Sender account: `noreply@dash.fi`

## Current Status

- Outline email is enabled in Fly secrets.
- `SMTP_USERNAME`, `SMTP_FROM_EMAIL`, and `SMTP_REPLY_EMAIL` are all configured as `noreply@dash.fi`.
- SMTP transport shape is complete: host, port, username, password, from, and reply-to are present.
- Enrollment email template is drafted in `server/emails/templates/LearningReminderEmail.tsx`.
- Template status: built locally, not deployed, not queued.
- SMTP verification passed from the Fly machine for both `smtp.gmail.com` and `smtp-relay.gmail.com`.
- Current deployed SMTP host is `smtp-relay.gmail.com`.
- One manual test email was sent to `ray@dash.fi` through `noreply@dash.fi`.
- Do not requeue cohort enrollment emails until Ray approves the test email.
- Enrollment URL was corrected from `/learning` to `/learning/underwriting-training` after Ray confirmed the first test landed on the generic hub.
- Corrected preview/PDF now uses `https://kb.dash.fi/learning/underwriting-training`.
- A follow-up send attempt with the corrected link was blocked by Gmail `421-4.7.0`; retry only after the throttle clears.

## Enrollment Template

The enrollment email uses the existing Outline email pipeline and is triggered by `LearningReminderEmail` with `kind: "enrollment"`.

Subject:

```text
You're enrolled in DashFi Learning Hub
```

Preview:

```text
Your first assigned course is Underwriting Training.
```

HTML content includes:

- DashFi Learning Hub branded dark assignment panel.
- First course assignment: Underwriting Training.
- Course facts: course, 100% requirement, due date.
- Learner clarity: take notes, complete skill checks, pass module knowledge checks with 100%.
- Primary CTA: Start course.
- CTA URL: `https://kb.dash.fi/learning/underwriting-training`.

Local render verification passed:

- HTML renders without TypeScript build errors.
- Subject and preview render.
- HTML contains `DashFi Learning Hub`.
- HTML contains `Underwriting Training`.
- HTML contains `Start course`.
- HTML contains `100% to pass`.

Manual test send:

- Recipient: `ray@dash.fi`
- Subject: `You're enrolled in DashFi Learning Hub`
- SMTP response: `250 2.0.0 OK`
- Rejected recipients: none

## Enrollment State

The following learners have active required assignments for Underwriting Training:

| Learner | Email | Due Date | Assignment |
|---|---|---:|---|
| John Molnar | `john.m@dash.fi` | 2026-06-19 | Active |
| Christopher Thurman | `chris.thurman@dash.fi` | 2026-06-19 | Active |
| Ken Boyle | `ken@dash.fi` | 2026-06-19 | Active |
| Dave Bell / DB | `dave.b@dash.fi` | 2026-06-19 | Active |
| Clint Vice | `clint.vice@dash.fi` | 2026-06-19 | Active |
| Zach Cohen | `zach.c@dash.fi` | 2026-06-19 | Active |
| Mark Brazil | `mark@dash.fi` | 2026-06-19 | Active |
| Lukas Geipel | `lukas.geipel@dash.fi` | 2026-06-19 | Active |

## Send Policy

Email is backup. Slack should become the primary notification path once the Slack bot is wired.

Use this send sequence:

1. Verify SMTP transport.
2. Confirm no active Gmail throttle errors in Fly logs.
3. Send one test email to Ray.
4. Requeue cohort enrollment emails.
5. Verify worker logs show send attempts without SMTP errors.
6. Monitor replies/bounces manually.

## Verification Commands

Run from `/Users/rayowais/claude-projects/dashfi-lms/outline`.

```bash
~/.fly/bin/flyctl secrets list -a dashfi-kb-staging
```

Expected:

- `SMTP_HOST`: deployed
- `SMTP_PORT`: deployed
- `SMTP_USERNAME`: deployed
- `SMTP_PASSWORD`: deployed
- `SMTP_FROM_EMAIL`: deployed
- `SMTP_REPLY_EMAIL`: deployed
- `SMTP_SECURE`: deployed

Transport verification should confirm:

- `fromIsNoreply: true`
- `replyIsNoreply: true`
- `usernameIsNoreply: true`
- `transportVerified: true`

If `transportVerified` is false with Gmail `421`, wait before requeueing.

## Requeue Rule

Do not rely only on `enrollmentReminderSentAt` for the first cohort. It was updated when the jobs were scheduled, but Gmail throttling means delivery was not fully confirmed.

When SMTP verifies cleanly, requeue enrollment emails directly for the eight assigned learners and log:

- recipient email
- subject
- queued timestamp
- worker send result
- any SMTP error

## Slack Follow-Up

Once Rambo is ready, move learner notifications to Slack:

- Assignment DM
- Due date reminder
- Quiz failure/retry prompt
- Completion celebration
- Manager progress digest

Email remains a fallback for compliance and non-Slack cases.
