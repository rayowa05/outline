import { observer } from "mobx-react";
import { AcademicCapIcon } from "outline-icons";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Scene from "~/components/Scene";
import { client } from "~/utils/ApiClient";
import {
  underwritingLessonPath,
  underwritingTrainingPath,
} from "~/utils/routeHelpers";
import {
  getUnderwritingQuizByModule,
  type UnderwritingQuizOption,
  type UnderwritingQuizQuestion,
} from "@shared/learning/underwritingQuizContent";
import LearningHero from "./LearningHero";
import UnderwritingModuleNotes from "./UnderwritingModuleNotes";

type Params = {
  moduleNumber: string;
};

type QuizResult = {
  attemptNumber: number;
  maxScore: number;
  missed: {
    concept: string;
    correct: boolean;
    correctOptionId: string | null;
    questionId: string;
    questionNumber: number;
    selectedOptionId: string;
  }[];
  passed: boolean;
  progressPercent: number;
  requiredPercent: number;
  score: number;
  scorePercent: number;
};

type QuizStartResponse = {
  quizId: string;
  requiredPercent: number;
  review: {
    answers: Record<string, string>;
    result: QuizResult;
  } | null;
  startedAt: string;
};

type DisplayQuestion = UnderwritingQuizQuestion & {
  options: UnderwritingQuizOption[];
};

type OptionReviewStatus = "correct" | "incorrect" | "selected" | "neutral";

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
  purple: "#6f3df4",
  mint: "#e9f8f1",
  coral: "#ffe8db",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

function UnderwritingQuiz() {
  const history = useHistory();
  const { moduleNumber } = useParams<Params>();
  const activeModule = Number(moduleNumber);
  const quiz = getUnderwritingQuizByModule(activeModule);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localAttemptSeed, setLocalAttemptSeed] = useState(() =>
    Math.random().toString(36).slice(2)
  );
  const [hintedQuestionIds, setHintedQuestionIds] = useState<string[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const answeredCount = useMemo(
    () =>
      quiz
        ? quiz.questions.filter((question) => answers[question.id]).length
        : 0,
    [answers, quiz]
  );
  const allAnswered = Boolean(quiz && answeredCount === quiz.questions.length);
  const displayQuestions = useMemo<DisplayQuestion[]>(() => {
    if (!quiz) {
      return [];
    }

    return quiz.questions.map((question) => ({
      ...question,
      options: shuffleBySeed(
        question.options,
        `${quiz.id}:${question.id}:${startedAt}:${localAttemptSeed}`
      ),
    }));
  }, [localAttemptSeed, quiz, startedAt]);
  const displayOrder = useMemo(
    () =>
      Object.fromEntries(
        displayQuestions.map((question) => [
          question.id,
          question.options.map((option) => option.id),
        ])
      ),
    [displayQuestions]
  );
  const activeQuestion =
    displayQuestions[
      Math.min(activeQuestionIndex, Math.max(0, displayQuestions.length - 1))
    ];

  const startQuizAttempt = useCallback(
    (reviewPassedAttempt = true) => {
      if (!quiz) {
        return;
      }

      setStartedAt("");
      void client
        .post<{ data: QuizStartResponse }>("/learning.quizStart", {
          courseId: "underwriting-training",
          moduleNumber: activeModule,
          quizId: quiz.id,
          reviewPassedAttempt,
        })
        .then((response) => {
          setStartedAt(response.data.startedAt);
          if (response.data.review) {
            setAnswers(response.data.review.answers);
            setResult(response.data.review.result);
            setActiveQuestionIndex(0);
          }
          setError("");
        })
        .catch(() => {
          setError("Knowledge check could not be started.");
        });
    },
    [activeModule, quiz]
  );

  useEffect(() => {
    if (!quiz) {
      return;
    }

    let mounted = true;

    void client
      .post<{
        data: {
          gates: {
            locked: boolean;
            lockedReason: string | null;
            moduleNumber: number;
          }[];
        };
      }>("/learning.overview", {
        courseId: "underwriting-training",
      })
      .then((response) => {
        const gate = response.data.gates.find(
          (item) => item.moduleNumber === activeModule
        );
        if (mounted && gate?.locked) {
          history.replace(underwritingTrainingPath());
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [activeModule, history, quiz]);

  useEffect(() => {
    startQuizAttempt();
  }, [startQuizAttempt]);

  useEffect(() => {
    setActiveQuestionIndex((value) =>
      Math.min(value, Math.max(0, displayQuestions.length - 1))
    );
  }, [displayQuestions.length]);

  if (!quiz) {
    return (
      <Scene
        icon={<AcademicCapIcon />}
        title="Underwriting Knowledge Check"
        transparentHeaderUntilScrolled
        wide
      >
        <Page>
          <LearningHero
            current="module-map"
            eyebrow="Underwriting training"
            title="Knowledge check not found"
          >
            Return to the module map and choose another item.
          </LearningHero>
        </Page>
      </Scene>
    );
  }

  const submitQuiz = () => {
    if (!startedAt || !allAnswered) {
      return;
    }

    setSubmitting(true);
    void client
      .post<{ data: QuizResult }>("/learning.quizSubmit", {
        answers,
        courseId: "underwriting-training",
        displayOrder,
        moduleNumber: activeModule,
        quizId: quiz.id,
        startedAt,
      })
      .then((response) => {
        setResult(response.data);
        setError("");
        if (response.data.passed) {
          setCelebrating(true);
        }
        setActiveQuestionIndex(0);
        window.scrollTo({ behavior: "smooth", top: 0 });
      })
      .catch(() => setError("Knowledge check could not be submitted."))
      .finally(() => setSubmitting(false));
  };

  const startRetake = () => {
    if (result?.missed.length) {
      setHintedQuestionIds(result.missed.map((item) => item.questionId));
    }
    setAnswers({});
    setResult(null);
    setCelebrating(false);
    setLocalAttemptSeed(Math.random().toString(36).slice(2));
    setActiveQuestionIndex(0);
    startQuizAttempt(false);
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  const nextModuleHref =
    activeModule < 3
      ? underwritingLessonPath(activeModule + 1, 1)
      : underwritingTrainingPath();
  const completionCtaLabel =
    activeModule < 3 ? "Go to next module" : "Course overview";

  return (
    <Scene
      icon={<AcademicCapIcon />}
      title={quiz.title}
      transparentHeaderUntilScrolled
      wide
    >
      <Page>
        <LearningHero
          current="module-map"
          eyebrow={`Module ${quiz.moduleNumber} assessment`}
          title={quiz.title}
        >
          Take your time. You need 100% to pass this module and unlock the next
          module.
        </LearningHero>

        {error ? <Alert>{error}</Alert> : null}
        {celebrating ? (
          <ConfettiOverlay aria-live="polite">
            <ConfettiBurst aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} style={{ "--i": index } as CSSProperties} />
              ))}
            </ConfettiBurst>
            <ConfettiMessage>
              Module {quiz.moduleNumber} complete
            </ConfettiMessage>
            <ConfettiCopy>
              You scored 100%. Continue when you are ready.
            </ConfettiCopy>
            <ConfettiAction as={Link} to={nextModuleHref}>
              {completionCtaLabel}
            </ConfettiAction>
          </ConfettiOverlay>
        ) : null}

        <QuizWorkspace>
          <QuizColumn>
            <IntroPanel>
              <IntroKicker>Required module knowledge check</IntroKicker>
              <IntroTitle>100% required to pass</IntroTitle>
              <IntroCopy>
                Use your module notes, answer every question carefully, and
                submit when you are ready. If you miss a question, review the
                lesson and retake the knowledge check.
              </IntroCopy>
              <ProgressLine>
                <strong>
                  {answeredCount}/{quiz.questions.length}
                </strong>
                <span>questions answered</span>
              </ProgressLine>
            </IntroPanel>

            {result ? (
              <ResultPanel $passed={result.passed}>
                <ResultTitle>
                  {result.passed ? "Module passed" : "Retake required"}
                </ResultTitle>
                <ResultScore>
                  {result.score}/{result.maxScore} · {result.scorePercent}%
                </ResultScore>
                <ResultCopy>
                  {result.passed
                    ? "You scored 100%. The next module is unlocked."
                    : "This module requires 100%. Review the missed concepts and retake the knowledge check when ready."}
                </ResultCopy>
                {result.missed.length ? (
                  <MissedList>
                    {result.missed.map((item) => (
                      <li key={item.questionId}>
                        Question {item.questionNumber}: {item.concept}
                      </li>
                    ))}
                  </MissedList>
                ) : null}
                <ResultActions>
                  <ActionLink as={Link} to={underwritingTrainingPath()}>
                    Module map
                  </ActionLink>
                  {result.passed ? (
                    <ActionLink as={Link} to={nextModuleHref}>
                      {completionCtaLabel}
                    </ActionLink>
                  ) : null}
                  {!result.passed ? (
                    <ActionButton onClick={startRetake} type="button">
                      Retake full knowledge check
                    </ActionButton>
                  ) : null}
                  {!result.passed ? (
                    <ActionLink
                      as={Link}
                      to={underwritingLessonPath(activeModule, 1)}
                      $secondary
                    >
                      Review module
                    </ActionLink>
                  ) : null}
                </ResultActions>
              </ResultPanel>
            ) : null}

            <QuestionCarousel>
              <CarouselHeader>
                <QuestionDots aria-label="Quiz questions">
                  {displayQuestions.map((question, index) => (
                    <QuestionDot
                      key={question.id}
                      aria-label={`Go to question ${index + 1}`}
                      $active={index === activeQuestionIndex}
                      $answered={Boolean(answers[question.id])}
                      $missed={Boolean(
                        result?.missed.some(
                          (item) => item.questionId === question.id
                        )
                      )}
                      $passed={Boolean(
                        result &&
                        !result.missed.some(
                          (item) => item.questionId === question.id
                        )
                      )}
                      onClick={() => setActiveQuestionIndex(index)}
                      type="button"
                    >
                      {index + 1}
                    </QuestionDot>
                  ))}
                </QuestionDots>
                <CarouselControls>
                  <CarouselButton
                    disabled={activeQuestionIndex === 0}
                    onClick={() =>
                      setActiveQuestionIndex((value) => Math.max(0, value - 1))
                    }
                    type="button"
                  >
                    Previous
                  </CarouselButton>
                  <CarouselButton
                    disabled={
                      activeQuestionIndex >= displayQuestions.length - 1
                    }
                    onClick={() =>
                      setActiveQuestionIndex((value) =>
                        Math.min(displayQuestions.length - 1, value + 1)
                      )
                    }
                    type="button"
                  >
                    Next
                  </CarouselButton>
                </CarouselControls>
              </CarouselHeader>
              {activeQuestion ? (
                <QuestionCard
                  key={activeQuestion.id}
                  question={activeQuestion}
                  showHint={
                    !result &&
                    hintedQuestionIds.includes(activeQuestion.id) &&
                    Boolean(activeQuestion.hint)
                  }
                >
                  <OptionGrid>
                    {activeQuestion.options.map((option, index) => {
                      const selected = answers[activeQuestion.id] === option.id;
                      const status = getOptionReviewStatus({
                        option,
                        result,
                        selected,
                      });

                      return (
                        <OptionButton
                          key={option.id}
                          disabled={Boolean(result)}
                          $reviewStatus={status}
                          $selected={selected}
                          onClick={() =>
                            setAnswers((value) => ({
                              ...value,
                              [activeQuestion.id]: option.id,
                            }))
                          }
                          type="button"
                        >
                          <OptionLabel>{displayOptionLabel(index)}</OptionLabel>
                          <OptionBody>
                            <span>{option.text}</span>
                            {shouldShowOptionFeedback({
                              option,
                              result,
                              selected,
                            }) ? (
                              <OptionFeedback $reviewStatus={status}>
                                {option.feedback}
                              </OptionFeedback>
                            ) : null}
                          </OptionBody>
                        </OptionButton>
                      );
                    })}
                  </OptionGrid>
                </QuestionCard>
              ) : null}
            </QuestionCarousel>

            <SubmitBar>
              <SubmitMeta>
                {allAnswered
                  ? "Ready to submit"
                  : `${quiz.questions.length - answeredCount} questions remaining`}
              </SubmitMeta>
              <SubmitButton
                disabled={!allAnswered || submitting || Boolean(result)}
                onClick={submitQuiz}
                type="button"
              >
                {submitting ? "Submitting" : "Submit knowledge check"}
              </SubmitButton>
            </SubmitBar>
          </QuizColumn>

          <NotesColumn>
            <UnderwritingModuleNotes
              courseId="underwriting-training"
              lessonNumber={quiz.lessonNumber}
              lessonTitle={quiz.title}
              mode="quiz"
              moduleNumber={quiz.moduleNumber}
            />
          </NotesColumn>
        </QuizWorkspace>
      </Page>
    </Scene>
  );
}

function QuestionCard({
  children,
  question,
  showHint,
}: {
  children: ReactNode;
  question: UnderwritingQuizQuestion;
  showHint: boolean;
}) {
  return (
    <QuestionArticle>
      <QuestionMeta>Question {question.number}</QuestionMeta>
      <QuestionStem>{question.stem}</QuestionStem>
      {showHint && question.hint ? (
        <ReviewHint>
          <strong>Review focus</strong>
          <span>{question.hint}</span>
        </ReviewHint>
      ) : null}
      {children}
    </QuestionArticle>
  );
}

function getOptionReviewStatus({
  option,
  result,
  selected,
}: {
  option: UnderwritingQuizOption;
  result: QuizResult | null;
  selected: boolean;
}): OptionReviewStatus {
  if (!result) {
    if (!selected) {
      return "neutral";
    }

    return option.correct ? "correct" : "incorrect";
  }

  if (option.correct) {
    return "correct";
  }

  if (selected) {
    return "incorrect";
  }

  return "neutral";
}

function shouldShowOptionFeedback({
  option,
  result,
  selected,
}: {
  option: UnderwritingQuizOption;
  result: QuizResult | null;
  selected: boolean;
}) {
  if (selected) {
    return true;
  }

  return Boolean(result && option.correct);
}

function displayOptionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function seededRandom(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;

    return ((hash >>> 0) % 1000000) / 1000000;
  };
}

function shuffleBySeed<T>(items: T[], seed: string) {
  const random = seededRandom(seed);
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

const Page = styled.div`
  background: ${brand.paper};
  border-radius: 8px;
  display: grid;
  gap: 14px;
  margin: 0;
  min-width: 0;
  padding: 14px 16px 36px;

  ${breakpoint("tablet")`
    margin: -40px -28px 0;
    padding: 18px 28px 44px;
  `};
`;

const Alert = styled.div`
  background: ${brand.coral};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  font-size: 13px;
  padding: 12px 14px;
`;

const ConfettiOverlay = styled.div`
  align-items: center;
  background: linear-gradient(
    180deg,
    rgba(25, 167, 103, 0.1),
    ${brand.surface} 44%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid #19a767;
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 8px;
  justify-items: center;
  min-height: 112px;
  overflow: hidden;
  padding: 18px;
  position: relative;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const ConfettiBurst = styled.div`
  height: 72px;
  position: relative;
  width: 220px;

  span {
    animation: confetti-pop 1.35s ease-out infinite;
    background: ${brand.blue};
    border-radius: 2px;
    height: 10px;
    left: 50%;
    position: absolute;
    top: 48%;
    transform: rotate(calc(var(--i) * 21deg));
    transform-origin: center;
    width: 6px;
  }

  span:nth-child(3n) {
    background: ${brand.lime};
  }

  span:nth-child(4n) {
    background: ${brand.coral};
  }

  @keyframes confetti-pop {
    0% {
      opacity: 0;
      transform: translate(0, 0) rotate(calc(var(--i) * 21deg)) scale(0.4);
    }

    20% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      transform: translate(
          calc((var(--i) - 9) * 12px),
          calc(-68px + var(--i) * 4px)
        )
        rotate(calc(var(--i) * 47deg)) scale(1);
    }
  }
`;

const ConfettiMessage = styled.div`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ConfettiCopy = styled.p`
  color: ${brand.ink};
  font-size: 14px;
  line-height: 1.35;
  margin: 0;
  text-align: center;
`;

const ConfettiAction = styled.a`
  align-items: center;
  background: ${brand.blue};
  border-radius: 8px;
  color: #fff;
  display: inline-flex;
  font-size: 14px;
  font-weight: 900;
  height: 40px;
  justify-content: center;
  padding: 0 16px;
  text-decoration: none;

  &:hover {
    text-decoration: none;
  }
`;

const QuizWorkspace = styled.div`
  display: grid;
  gap: 14px;

  ${breakpoint("tablet")`
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(310px, 0.34fr);
  `};
`;

const QuizColumn = styled.main`
  display: grid;
  gap: 12px;
  min-width: 0;
`;

const NotesColumn = styled.aside`
  min-width: 0;
  position: sticky;
  top: 76px;
`;

const IntroPanel = styled.section`
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.08),
    ${brand.surface} 44%
  );
  border: 1px solid rgba(53, 76, 239, 0.18);
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 10px;
  padding: 20px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const IntroKicker = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const IntroTitle = styled.h2`
  color: ${brand.ink};
  font-size: clamp(24px, 3vw, 36px);
  line-height: 1.05;
  margin: 0;
`;

const IntroCopy = styled.p`
  color: ${brand.ink};
  font-size: 15px;
  line-height: 1.45;
  margin: 0;
`;

const ProgressLine = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;

  strong {
    color: ${brand.blue};
    font-family: ${brand.mono};
  }

  span {
    color: ${brand.muted};
    font-size: 13px;
  }
`;

const ResultPanel = styled.section<{ $passed: boolean }>`
  background: ${(props) =>
    props.$passed
      ? `linear-gradient(180deg, rgba(25, 167, 103, 0.1), ${brand.surface} 44%)`
      : `linear-gradient(180deg, rgba(255, 232, 219, 0.72), ${brand.surface} 44%)`};
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${(props) => (props.$passed ? "#19a767" : brand.purple)};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 8px;
  padding: 16px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const ResultTitle = styled.h2`
  font-size: 22px;
  line-height: 1.12;
  margin: 0;
`;

const ResultScore = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 14px;
  font-weight: 900;
`;

const ResultCopy = styled.p`
  color: ${brand.ink};
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
`;

const MissedList = styled.ul`
  color: ${brand.ink};
  display: grid;
  font-size: 13px;
  gap: 5px;
  line-height: 1.35;
  margin: 4px 0 0;
  padding-left: 18px;
`;

const ResultActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ActionLink = styled.a<{ $secondary?: boolean }>`
  align-items: center;
  background: ${(props) => (props.$secondary ? brand.surface : brand.blue)};
  border: 1px solid ${(props) => (props.$secondary ? brand.rule : brand.blue)};
  border-radius: 8px;
  color: ${(props) => (props.$secondary ? brand.ink : "#fff")};
  display: inline-flex;
  font-size: 13px;
  font-weight: 800;
  height: 36px;
  padding: 0 12px;
  text-decoration: none;
`;

const ActionButton = styled.button`
  align-items: center;
  background: ${brand.blue};
  border: 1px solid ${brand.blue};
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  font-size: 13px;
  font-weight: 800;
  height: 36px;
  padding: 0 12px;
`;

const QuestionCarousel = styled.div`
  display: grid;
  gap: 12px;
`;

const CarouselHeader = styled.div`
  align-items: center;
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.05),
    ${brand.surface} 44%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  padding: 10px 12px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const CarouselControls = styled.div`
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
`;

const CarouselButton = styled.button`
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  height: 34px;
  padding: 0 12px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const QuestionDots = styled.div`
  display: flex;
  flex: 1 1 220px;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
`;

const QuestionDot = styled.button<{
  $active?: boolean;
  $answered?: boolean;
  $missed?: boolean;
  $passed?: boolean;
}>`
  align-items: center;
  background: ${(props) =>
    props.$active
      ? brand.blue
      : props.$missed
        ? brand.coral
        : props.$passed
          ? brand.mint
          : props.$answered
            ? brand.lavender
            : "#fff"};
  border: 1px solid
    ${(props) =>
      props.$active
        ? brand.blue
        : props.$missed
          ? "#d45b35"
          : props.$passed
            ? "#2f9d65"
            : props.$answered
              ? "rgba(53, 76, 239, 0.28)"
              : brand.rule};
  border-radius: 999px;
  color: ${(props) => (props.$active ? "#fff" : brand.ink)};
  cursor: pointer;
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  height: 30px;
  justify-content: center;
  width: 30px;
`;

const QuestionArticle = styled.article`
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.05),
    ${brand.surface} 40%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 16px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const QuestionMeta = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const QuestionStem = styled.h3`
  color: ${brand.ink};
  font-size: 18px;
  line-height: 1.25;
  margin: 0;
`;

const ReviewHint = styled.div`
  background: ${brand.mint};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  font-size: 12px;
  gap: 2px;
  line-height: 1.3;
  padding: 8px 10px;

  strong {
    color: ${brand.blue};
    font-family: ${brand.mono};
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
`;

const OptionGrid = styled.div`
  display: grid;
  gap: 8px;
`;

const OptionButton = styled.button<{
  $reviewStatus: OptionReviewStatus;
  $selected?: boolean;
}>`
  align-items: start;
  background: ${(props) => optionBackground(props.$reviewStatus)};
  border: 1px solid ${(props) => optionBorder(props.$reviewStatus)};
  border-radius: 8px;
  color: ${brand.ink};
  cursor: ${(props) => (props.disabled ? "default" : "pointer")};
  display: grid;
  gap: 10px;
  grid-template-columns: 28px minmax(0, 1fr);
  line-height: 1.35;
  min-height: 48px;
  padding: 10px 12px;
  text-align: left;
`;

const OptionLabel = styled.span`
  align-items: center;
  background: ${brand.blue};
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  height: 26px;
  justify-content: center;
  width: 26px;
`;

const OptionBody = styled.span`
  display: grid;
  gap: 8px;
  min-width: 0;
`;

const OptionFeedback = styled.span<{ $reviewStatus: OptionReviewStatus }>`
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid ${(props) => optionBorder(props.$reviewStatus)};
  border-radius: 8px;
  color: ${brand.ink};
  display: block;
  font-size: 12px;
  line-height: 1.35;
  padding: 8px 10px;
`;

function optionBackground(status: OptionReviewStatus) {
  if (status === "correct") {
    return brand.mint;
  }
  if (status === "incorrect") {
    return brand.coral;
  }
  if (status === "selected") {
    return brand.lavender;
  }
  return "#fff";
}

function optionBorder(status: OptionReviewStatus) {
  if (status === "correct") {
    return "#2f9d65";
  }
  if (status === "incorrect") {
    return "#d45b35";
  }
  if (status === "selected") {
    return brand.blue;
  }
  return brand.rule;
}

const SubmitBar = styled.div`
  align-items: center;
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.05),
    ${brand.surface} 44%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 12px;
  position: sticky;
  bottom: 12px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.08);
`;

const SubmitMeta = styled.div`
  color: ${brand.muted};
  font-size: 13px;
`;

const SubmitButton = styled.button`
  background: ${brand.blue};
  border: 0;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  height: 40px;
  padding: 0 16px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export default observer(UnderwritingQuiz);
