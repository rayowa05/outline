import * as React from "react";
import { Table, TBody, TR, TD } from "oy-vey";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type ReminderKind = "enrollment" | "due_soon" | "overdue";

type Props = EmailProps & {
  courseTitle: string;
  dueAt: string | null;
  kind: ReminderKind;
  learningUrl: string;
  name: string;
  teamUrl: string;
};

const brand = {
  paper: "#f7f5ef",
  surface: "#fffcf5",
  rule: "#dedad1",
  ink: "#20302d",
  muted: "#777a73",
  dark: "#1c2018",
  blue: "#354cef",
  lime: "#edff3d",
  lavender: "#ececff",
  successSurface: "#e9f8f1",
  successText: "#26724d",
};

const monoStack =
  'SFMono-Regular, Consolas, "Liberation Mono", "Courier New", monospace';

const cardStyle: React.CSSProperties = {
  background: brand.surface,
  border: `1px solid ${brand.rule}`,
  borderTop: `4px solid ${brand.blue}`,
  borderRadius: "8px",
  padding: "22px",
};

const labelStyle: React.CSSProperties = {
  color: brand.muted,
  fontFamily: monoStack,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  lineHeight: "16px",
  margin: "0 0 6px",
  textTransform: "uppercase",
};

const bodyCopyStyle: React.CSSProperties = {
  color: brand.ink,
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0",
};

const mutedCopyStyle: React.CSSProperties = {
  color: brand.muted,
  fontSize: "13px",
  lineHeight: "19px",
  margin: "0",
};

const enrollmentButtonStyle: React.CSSProperties = {
  background: brand.blue,
  border: `1px solid ${brand.blue}`,
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 700,
  padding: "12px 18px",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const EnrollmentStep = ({
  number,
  text,
}: {
  number: string;
  text: string;
}) => (
  <TR>
    <TD width="34" valign="top" style={{ padding: "0 0 12px" }}>
      <span
        style={{
          background: brand.lavender,
          border: `1px solid ${brand.rule}`,
          borderRadius: "999px",
          color: brand.blue,
          display: "inline-block",
          fontFamily: monoStack,
          fontSize: "12px",
          fontWeight: 700,
          height: "24px",
          lineHeight: "24px",
          textAlign: "center",
          width: "24px",
        }}
      >
        {number}
      </span>
    </TD>
    <TD valign="top" style={{ padding: "0 0 12px" }}>
      <p style={bodyCopyStyle}>{text}</p>
    </TD>
  </TR>
);

/**
 * Email sent to learners when training is assigned or needs attention.
 */
export default class LearningReminderEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected subject({ courseTitle, kind }: Props) {
    if (kind === "overdue") {
      return this.t("Overdue") + ": " + courseTitle;
    }

    if (kind === "due_soon") {
      return this.t("Due soon") + ": " + courseTitle;
    }

    return this.t("You're enrolled in DashFi Learning Hub");
  }

  protected preview({ courseTitle, kind }: Props) {
    if (kind === "overdue") {
      return this.t("Your required training is overdue: {{ courseTitle }}", {
        courseTitle,
      });
    }

    if (kind === "due_soon") {
      return this.t("Your required training is due soon: {{ courseTitle }}", {
        courseTitle,
      });
    }

    return this.t("Your first assigned course is {{ courseTitle }}.", {
      courseTitle,
    });
  }

  protected renderAsText({
    courseTitle,
    dueAt,
    kind,
    learningUrl,
  }: Props): string {
    const dueLine = dueAt ? `\n${this.t("Due date")}: ${dueAt}` : "";

    if (kind === "enrollment") {
      return `
${this.t("You're enrolled in DashFi Learning Hub")}

${this.t("Your first assigned course is {{ courseTitle }}.", {
  courseTitle,
})}${dueLine}

${this.t("What to know before you start:")}
- ${this.t("Each module knowledge check requires 100% to pass.")}
- ${this.t("Use your module notes as you move through the lessons.")}
- ${this.t("If you miss a question, review the lesson and retake the quiz.")}

${this.t("Start here")}: ${learningUrl}
`;
    }

    const action =
      kind === "overdue"
        ? this.t("Please complete this course as soon as possible.")
        : this.t("Open DashFi Learning Hub to continue.");

    return `
${this.preview({ courseTitle, dueAt, kind, learningUrl, name: "", teamUrl: "", to: "" })}
${dueLine}

${action}

${learningUrl}
`;
  }

  protected render({ courseTitle, dueAt, kind, learningUrl }: Props) {
    if (kind === "enrollment") {
      return this.renderEnrollment({
        courseTitle,
        dueAt,
        kind,
        learningUrl,
        name: "",
        teamUrl: "",
        to: "",
      });
    }

    const heading =
      kind === "overdue"
        ? this.t("Training is overdue")
        : kind === "due_soon"
          ? this.t("Training is due soon")
          : this.t("You have a new course");

    return (
      <EmailTemplate
        previewText={this.preview({
          courseTitle,
          dueAt,
          kind,
          learningUrl,
          name: "",
          teamUrl: "",
          to: "",
        })}
      >
        <Header />

        <Body>
          <Heading>{heading}</Heading>
          <p>
            {this.t("Course")}: <strong>{courseTitle}</strong>
          </p>
          {dueAt ? (
            <p>
              {this.t("Due date")}: <strong>{dueAt}</strong>
            </p>
          ) : null}
          <p>
            {kind === "overdue"
              ? this.t(
                  "Please complete this required course as soon as possible."
                )
              : kind === "enrollment"
                ? this.t(
                    "Open DashFi Learning Hub to start. Each module knowledge check requires 100% to pass, so take your time and use your notes."
                  )
                : this.t(
                    "Open DashFi Learning Hub to continue your assigned course."
                  )}
          </p>
          <EmptySpace height={10} />
          <p>
            <Button href={learningUrl}>
              {this.t("Open DashFi Learning Hub")}
            </Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }

  private renderEnrollment({ courseTitle, dueAt, learningUrl }: Props) {
    const previewText = this.preview({
      courseTitle,
      dueAt,
      kind: "enrollment",
      learningUrl,
      name: "",
      teamUrl: "",
      to: "",
    });

    return (
      <EmailTemplate
        bgcolor={brand.paper}
        goToAction={{
          name: this.t("Start course"),
          url: learningUrl,
        }}
        previewText={previewText}
      >
        <Table width="100%">
          <TBody>
            <TR>
              <TD style={{ padding: "36px 0 10px" }}>
                <p
                  style={{
                    color: brand.ink,
                    fontSize: "18px",
                    fontWeight: 800,
                    lineHeight: "24px",
                    margin: "0",
                  }}
                >
                  DashFi Learning Hub
                </p>
              </TD>
            </TR>
          </TBody>
        </Table>

        <Table width="100%">
          <TBody>
            <TR>
              <TD style={{ padding: "8px 0 0" }}>
                <Table
                  width="100%"
                  style={{
                    background: brand.dark,
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                >
                  <TBody>
                    <TR>
                      <TD style={{ padding: "28px" }}>
                        <p
                          style={{
                            color: brand.lime,
                            fontFamily: monoStack,
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            lineHeight: "16px",
                            margin: "0 0 12px",
                            textTransform: "uppercase",
                          }}
                        >
                          DashFi Learning Hub
                        </p>
                        <h1
                          style={{
                            color: "#ffffff",
                            fontSize: "30px",
                            fontWeight: 700,
                            lineHeight: "34px",
                            margin: "0 0 12px",
                          }}
                        >
                          You have been enrolled.
                        </h1>
                        <p
                          style={{
                            color: "#dfe3d9",
                            fontSize: "16px",
                            lineHeight: "24px",
                            margin: "0",
                          }}
                        >
                          Your first assigned course is{" "}
                          <strong style={{ color: "#ffffff" }}>
                            {courseTitle}
                          </strong>
                          .
                        </p>
                      </TD>
                    </TR>
                  </TBody>
                </Table>
              </TD>
            </TR>

            <TR>
              <TD style={{ padding: "16px 0 0" }}>
                <Table width="100%" style={cardStyle}>
                  <TBody>
                    <TR>
                      <TD
                        width="33%"
                        valign="top"
                        style={{
                          borderRight: `1px solid ${brand.rule}`,
                          padding: "0 14px 0 0",
                        }}
                      >
                        <p style={labelStyle}>{this.t("Course")}</p>
                        <p style={{ ...bodyCopyStyle, fontWeight: 700 }}>
                          {courseTitle}
                        </p>
                      </TD>
                      <TD
                        width="33%"
                        valign="top"
                        style={{
                          borderRight: `1px solid ${brand.rule}`,
                          padding: "0 14px",
                        }}
                      >
                        <p style={labelStyle}>{this.t("Requirement")}</p>
                        <p style={{ ...bodyCopyStyle, fontWeight: 700 }}>
                          {this.t("100% to pass")}
                        </p>
                      </TD>
                      <TD
                        width="33%"
                        valign="top"
                        style={{ padding: "0 0 0 14px" }}
                      >
                        <p style={labelStyle}>{this.t("Due date")}</p>
                        <p style={{ ...bodyCopyStyle, fontWeight: 700 }}>
                          {dueAt ?? this.t("Assigned now")}
                        </p>
                      </TD>
                    </TR>
                  </TBody>
                </Table>
              </TD>
            </TR>

            <TR>
              <TD style={{ padding: "16px 0 0" }}>
                <Table width="100%" style={cardStyle}>
                  <TBody>
                    <TR>
                      <TD>
                        <p style={labelStyle}>{this.t("Before you start")}</p>
                        <p
                          style={{
                            ...bodyCopyStyle,
                            fontSize: "18px",
                            fontWeight: 700,
                            lineHeight: "24px",
                            marginBottom: "14px",
                          }}
                        >
                          {this.t(
                            "Take your time. Your notes matter for the module quizzes."
                          )}
                        </p>
                        <Table width="100%">
                          <TBody>
                            <EnrollmentStep
                              number="1"
                              text={this.t(
                                "Watch each lesson and complete the skill checks as they appear."
                              )}
                            />
                            <EnrollmentStep
                              number="2"
                              text={this.t(
                                "Use the module notepad while you learn. The quiz is designed to reward careful notes."
                              )}
                            />
                            <EnrollmentStep
                              number="3"
                              text={this.t(
                                "Pass each module knowledge check with 100%. If you miss a question, review and retake it."
                              )}
                            />
                          </TBody>
                        </Table>
                      </TD>
                    </TR>
                  </TBody>
                </Table>
              </TD>
            </TR>

            <TR>
              <TD style={{ padding: "16px 0 0" }}>
                <Table
                  width="100%"
                  style={{
                    background: brand.successSurface,
                    border: "1px solid #b8e0ca",
                    borderRadius: "8px",
                  }}
                >
                  <TBody>
                    <TR>
                      <TD style={{ padding: "18px 20px" }}>
                        <p
                          style={{
                            ...labelStyle,
                            color: brand.successText,
                            marginBottom: "4px",
                          }}
                        >
                          First step
                        </p>
                        <p style={mutedCopyStyle}>
                          {this.t(
                            "Open the hub, start Underwriting Training, and begin with the first module."
                          )}
                        </p>
                      </TD>
                      <TD
                        align="right"
                        valign="middle"
                        style={{ padding: "18px 20px" }}
                      >
                        <a href={learningUrl} style={enrollmentButtonStyle}>
                          {this.t("Start course")}
                        </a>
                      </TD>
                    </TR>
                  </TBody>
                </Table>
              </TD>
            </TR>

            <TR>
              <TD style={{ padding: "18px 0 0" }}>
                <p style={mutedCopyStyle}>
                  {this.t(
                    "This message was sent because you were assigned required training in DashFi Learning Hub."
                  )}
                </p>
              </TD>
            </TR>
          </TBody>
        </Table>

        <Table width="100%">
          <TBody>
            <TR>
              <TD
                style={{
                  borderTop: `1px solid ${brand.rule}`,
                  color: brand.muted,
                  fontSize: "13px",
                  lineHeight: "19px",
                  padding: "20px 0 28px",
                }}
              >
                DashFi Learning Hub
              </TD>
            </TR>
          </TBody>
        </Table>
      </EmailTemplate>
    );
  }
}
