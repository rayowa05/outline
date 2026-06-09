export type CourseStatus = "active" | "planned";

export type ModuleStatus = "active" | "locked" | "assetReady";

export type LessonStatus = "ready" | "locked" | "assetReady" | "pending";

export type LessonKind = "interactive" | "video" | "document" | "quiz";

export type LearningLesson = {
  number: number;
  title: string;
  duration: string;
  kind: LessonKind;
  status: LessonStatus;
  note?: string;
};

export type LearningModule = {
  number: number;
  title: string;
  subtitle: string;
  status: ModuleStatus;
  duration: string;
  lessonCount: number;
  completion: number;
  summary: string;
  lessons: LearningLesson[];
};

export type LearningCourse = {
  id: string;
  title: string;
  eyebrow: string;
  status: CourseStatus;
  audience: string;
  duration: string;
  moduleCount: number;
  lessonCount: number;
  extraItems: string;
  progressLabel: string;
  description: string;
  modules: LearningModule[];
};

export const learningHomePath = "/learning";

export const underwritingCourse: LearningCourse = {
  id: "underwriting-training",
  title: "Underwriting Training",
  eyebrow: "Required AE certification",
  status: "active",
  audience: "Sales, onboarding, and manager coaching",
  duration: "75 min",
  moduleCount: 3,
  lessonCount: 17,
  extraItems: "2 required knowledge checks and 2 required job aids",
  progressLabel: "0 of 3 modules complete",
  description:
    "Build the judgment to qualify advertisers for Dash.fi underwriting, set clean expectations, and submit useful context.",
  modules: [
    {
      number: 1,
      title: "Financials 101",
      subtitle: "Financial signals before discovery",
      status: "active",
      duration: "22 min",
      lessonCount: 5,
      completion: 0,
      summary:
        "Learn the financial signals that change how you qualify spend, explain risk, and avoid overpromising limits.",
      lessons: [
        {
          number: 1,
          title: "Why Underwriting Exists",
          duration: "6:52",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 2,
          title: "The Financial Language You Need",
          duration: "6:56",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 3,
          title: "How the Underwriting Team Evaluates",
          duration: "5:14",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 4,
          title: "$6.7M Lesson",
          duration: "3:25",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 5,
          title: "Module 1 Knowledge Check",
          duration: "12-15 min",
          kind: "quiz",
          status: "ready",
          note: "Requires 100% to unlock Module 2.",
        },
      ],
    },
    {
      number: 2,
      title: "Discovery and Positioning",
      subtitle: "Ask better questions and position the path",
      status: "active",
      duration: "32 min",
      lessonCount: 7,
      completion: 0,
      summary:
        "Practice the discovery moves that surface cash, documents, personal concerns, and application blockers early.",
      lessons: [
        {
          number: 1,
          title: "Opening the Financial Conversation",
          duration: "6:10",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 2,
          title: "Asking Contentious Questions",
          duration: "6:58",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 3,
          title: "Getting Ahead of Customer Concerns",
          duration: "5:27",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 4,
          title: "Handling Customer Concerns",
          duration: "4:55",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 5,
          title: "Reading the Signals",
          duration: "3:28",
          kind: "interactive",
          status: "ready",
        },
        {
          number: 6,
          title: "The Application Process",
          duration: "4:24",
          kind: "interactive",
          status: "ready",
          note: "Job aid review to be added to this module.",
        },
        {
          number: 7,
          title: "Module 2 Knowledge Check",
          duration: "12-15 min",
          kind: "quiz",
          status: "ready",
          note: "Requires 100% to unlock Module 3.",
        },
      ],
    },
    {
      number: 3,
      title: "Underwriting Workflow",
      subtitle: "Submit clean requests and manage review",
      status: "assetReady",
      duration: "22 min",
      lessonCount: 5,
      completion: 0,
      summary:
        "Workflow drills for submitting requests, reading review status, handling limit increases, and saving the required underwriting job aids.",
      lessons: [
        {
          number: 1,
          title: "Submitting the Underwriting Request",
          duration: "4:48",
          kind: "video",
          status: "assetReady",
        },
        {
          number: 2,
          title: "Reviewing the Underwriting Request",
          duration: "4:38",
          kind: "video",
          status: "assetReady",
        },
        {
          number: 3,
          title: "When Your Customer Needs a Limit Increase",
          duration: "2:03",
          kind: "video",
          status: "assetReady",
        },
        {
          number: 4,
          title: "UW Process/Internal Process",
          duration: "5 min",
          kind: "document",
          status: "assetReady",
          note: "Required job aid review. Scroll through the document to complete certification.",
        },
        {
          number: 5,
          title: "New Underwriting Discovery & Positioning",
          duration: "5 min",
          kind: "document",
          status: "assetReady",
          note: "Required job aid review. Scroll through the document to complete certification.",
        },
      ],
    },
  ],
};

export const learningCourses: LearningCourse[] = [
  underwritingCourse,
  {
    id: "shipping-agent-training",
    title: "Shipping Agent Training",
    eyebrow: "Shipping training",
    status: "planned",
    audience: "Shipping agents",
    duration: "TBD",
    moduleCount: 0,
    lessonCount: 0,
    extraItems: "Course outline pending",
    progressLabel: "Not assigned",
    description:
      "Training path for shipping workflows, customer handoffs, and operational expectations.",
    modules: [],
  },
  {
    id: "app-training",
    title: "App Training",
    eyebrow: "Product training",
    status: "planned",
    audience: "Sales, support, and onboarding",
    duration: "TBD",
    moduleCount: 0,
    lessonCount: 0,
    extraItems: "Course outline pending",
    progressLabel: "Not assigned",
    description:
      "Product training for core app navigation, customer workflows, and common support moments.",
    modules: [],
  },
  {
    id: "expense-management-training",
    title: "Expense Management Training",
    eyebrow: "Spend training",
    status: "planned",
    audience: "Sales, support, and account teams",
    duration: "TBD",
    moduleCount: 0,
    lessonCount: 0,
    extraItems: "Course outline pending",
    progressLabel: "Not assigned",
    description:
      "Training path for expense workflows, policy conversations, card controls, and customer implementation details.",
    modules: [],
  },
];

export const underwritingStats = [
  {
    value: String(underwritingCourse.moduleCount),
    label: "Certification stages",
  },
  {
    value: String(underwritingCourse.lessonCount),
    label: "Drills + checks",
  },
  {
    value: underwritingCourse.duration,
    label: "Current runtime",
  },
  {
    value: "0/3",
    label: "Completed stages",
  },
];
