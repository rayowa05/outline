export type LessonVisualKind =
  | "opener"
  | "profiles"
  | "exposure"
  | "businessLens"
  | "performanceFrame"
  | "noPersonalCredit"
  | "terms"
  | "takeaway"
  | "tacticPreview"
  | "financialLanguage"
  | "balanceSheet"
  | "netAssets"
  | "currentRatio"
  | "runway"
  | "statements"
  | "underwritingPaths"
  | "documentPacket"
  | "evaluationMatrix"
  | "underwritingCall"
  | "lossPattern"
  | "ownershipControl"
  | "marginCushion"
  | "redFlags"
  | "workflowVideo"
  | "applicationProcess"
  | "signalBoard";

export type LessonSection = {
  id: string;
  title: string;
  start: number;
  end: number;
  kind: LessonVisualKind;
  stageTitle: string;
  stageCopy: string;
};

export type LessonMedia = {
  audioSrc?: string;
  captionsSrc?: string;
  timelineSrc?: string;
  videoSrc?: string;
};

export type LessonCheckpoint = {
  id: string;
  label: string;
  placement: number;
  question: string;
  reviewTarget: string;
  options: Array<{
    id: string;
    text: string;
    correct?: boolean;
    feedback: string;
  }>;
};

export type LessonProductionBlueprint = {
  objectives: string[];
  media?: LessonMedia;
  sections: LessonSection[];
  checkpoints?: LessonCheckpoint[];
  productionNotes?: string[];
};

export const underwritingLessonProductionData: Record<
  string,
  LessonProductionBlueprint
> = {
  "1-1": {
    objectives: [
      "Explain why underwriting protects Dash.fi and the customer.",
      "Identify the spend profiles Dash.fi is built for.",
      "Describe how float creates repayment exposure.",
      "Frame underwriting as terms calibration, not pass or fail.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-1/lesson-1/audio.mp3",
      captionsSrc: "/training/underwriting/module-1/lesson-1/captions.vtt",
      timelineSrc: "/training/underwriting/module-1/lesson-1/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "Why underwriting exists",
        start: 0,
        end: 32.972,
        kind: "opener",
        stageTitle: "Why underwriting exists",
        stageCopy:
          "Underwriting is the mechanism that lets Dash.fi match terms to the financial profile.",
      },
      {
        id: "section-2",
        title: "Who Dash.fi is built for",
        start: 32.972,
        end: 115.126,
        kind: "profiles",
        stageTitle: "Who Dash.fi is built for",
        stageCopy:
          "Three spend profiles show up again and again: ad spend, shipping, and supplier payments.",
      },
      {
        id: "section-3",
        title: "Profitability path",
        start: 115.126,
        end: 138.625,
        kind: "businessLens",
        stageTitle: "Profitability path",
        stageCopy:
          "Dash.fi is built for companies that are profitable or can show a clear path to profitability.",
      },
      {
        id: "section-4",
        title: "Why exposure matters",
        start: 138.625,
        end: 177.217,
        kind: "exposure",
        stageTitle: "What exposure looks like",
        stageCopy:
          "A Net-15 term means Dash.fi carries repayment exposure until the balance is collected.",
      },
      {
        id: "section-5",
        title: "Low limits create risk",
        start: 177.217,
        end: 237.635,
        kind: "performanceFrame",
        stageTitle: "Low limits create risk",
        stageCopy:
          "Traditional providers control exposure by lowering limits, even when the business has outgrown that limit.",
      },
      {
        id: "section-6",
        title: "Business performance lens",
        start: 237.635,
        end: 322.156,
        kind: "businessLens",
        stageTitle: "Business performance, not personal credit",
        stageCopy:
          "The underwriting lens is company health: revenue, cash position, trajectory, and profitability path.",
      },
      {
        id: "section-7",
        title: "Terms match the profile",
        start: 322.156,
        end: 337.62,
        kind: "terms",
        stageTitle: "Terms match the financial profile",
        stageCopy:
          "Shorter or longer terms reflect the prospect's risk profile today. That is calibration, not rejection.",
      },
      {
        id: "section-8",
        title: "Underwriting calibrates terms",
        start: 337.62,
        end: 391.722,
        kind: "takeaway",
        stageTitle: "Underwriting calibrates terms",
        stageCopy:
          "The stronger the company profile, the more options they have. Thinner financials can still qualify at matching terms.",
      },
      {
        id: "section-9",
        title: "Move faster through underwriting",
        start: 391.722,
        end: 410.715,
        kind: "takeaway",
        stageTitle: "Move faster with better context",
        stageCopy:
          "When reps understand the underwriting lens, they set cleaner expectations and move deals forward faster.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Exposure check",
        placement: 217.62,
        question: "What risk exists when Dash.fi extends a $500K Net-15 card?",
        reviewTarget: "Why exposure matters",
        options: [
          {
            id: "a",
            text: "Dash.fi carries the balance until repayment.",
            correct: true,
            feedback:
              "Correct. Float creates exposure because Dash.fi carries spend until the repayment date.",
          },
          {
            id: "b",
            text: "The founder's FICO carries the risk.",
            feedback:
              "Review the exposure section. This lesson is contrasting business underwriting against personal-credit models.",
          },
          {
            id: "c",
            text: "There is no exposure on Net-15.",
            feedback:
              "Review the exposure section. Net-15 means the balance is outstanding until repayment.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Evaluation lens",
        placement: 322.156,
        question: "Which signals best match the Dash.fi underwriting lens?",
        reviewTarget: "Business performance lens",
        options: [
          {
            id: "a",
            text: "Revenue, cash position, trajectory, profitability path.",
            correct: true,
            feedback:
              "Correct. The lesson frames underwriting around business performance signals.",
          },
          {
            id: "b",
            text: "Mortgage, car payment, student loans.",
            feedback:
              "Review the business performance lens. Those are personal-credit inputs, not the Dash.fi lens.",
          },
          {
            id: "c",
            text: "Cashback preference and card color.",
            feedback:
              "Review the business performance lens. Preferences are not underwriting health signals.",
          },
        ],
      },
      {
        id: "checkpoint-3",
        label: "Calibration check",
        placement: 391.722,
        question: "Is underwriting mainly pass/fail?",
        reviewTarget: "Terms match the profile",
        options: [
          {
            id: "a",
            text: "No. Terms match the financial profile.",
            correct: true,
            feedback:
              "Correct. The lesson frames underwriting as calibration to the prospect's risk profile.",
          },
          {
            id: "b",
            text: "Yes. The prospect either gets every term or none.",
            feedback:
              "Review the terms section. A thinner profile can still qualify at matching terms.",
          },
        ],
      },
    ],
    productionNotes: [
      "Pilot lesson should reuse local V2 preview timing and proof-frame visual system.",
      "Gong evidence frame still needs final media/caption verification before embedding.",
    ],
  },
  "1-2": {
    objectives: [
      "Explain net asset position in plain language.",
      "Use current ratio to read basic liquidity risk.",
      "Distinguish a P&L trajectory from a balance sheet snapshot.",
      "Estimate runway from cash balance and burn rate.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-1/lesson-2/audio.mp3",
      captionsSrc: "/training/underwriting/module-1/lesson-2/captions.vtt",
      timelineSrc: "/training/underwriting/module-1/lesson-2/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "Why the language matters",
        start: 0,
        end: 101.006,
        kind: "financialLanguage",
        stageTitle: "The financial language you need",
        stageCopy:
          "Surface fit can hide balance-sheet risk. These terms help reps reduce noise before underwriting.",
      },
      {
        id: "section-2",
        title: "The balance sheet roadmap",
        start: 101.006,
        end: 132.354,
        kind: "balanceSheet",
        stageTitle: "Balance sheet, cash flow, statements",
        stageCopy:
          "The lesson moves through what a company owns, how cash moves, and which documents tell the story.",
      },
      {
        id: "section-3",
        title: "Net asset position",
        start: 132.354,
        end: 171.781,
        kind: "netAssets",
        stageTitle: "Assets minus liabilities",
        stageCopy:
          "Net asset position is what remains after subtracting what the company owes from what it owns.",
      },
      {
        id: "section-4",
        title: "Current ratio",
        start: 171.781,
        end: 220.914,
        kind: "currentRatio",
        stageTitle: "Can they cover near-term bills?",
        stageCopy:
          "Current ratio compares cash-like assets against liabilities due in the next 12 months.",
      },
      {
        id: "section-5",
        title: "Burn rate and runway",
        start: 220.914,
        end: 276.456,
        kind: "runway",
        stageTitle: "Bank balance divided by burn",
        stageCopy:
          "Runway shows how long a company can keep operating if revenue stopped tomorrow.",
      },
      {
        id: "section-6",
        title: "P&L, balance sheet, and margin",
        start: 276.456,
        end: 320.25,
        kind: "statements",
        stageTitle: "Movie, photograph, and cushion",
        stageCopy:
          "P&L shows trajectory, the balance sheet shows position, and margin shows room for error.",
      },
      {
        id: "section-7",
        title: "Extended-term documents",
        start: 320.25,
        end: 351.644,
        kind: "documentPacket",
        stageTitle: "Extended-term documents",
        stageCopy:
          "Balance sheets and P&Ls are required for extended repayment terms, not every Net-1 application.",
      },
      {
        id: "section-8",
        title: "Gross margin cushion",
        start: 351.644,
        end: 388.703,
        kind: "marginCushion",
        stageTitle: "Gross margin cushion",
        stageCopy:
          "Higher margins create more room for error. Thin margins leave very little cushion for credit extension.",
      },
      {
        id: "section-9",
        title: "Seller takeaway",
        start: 388.703,
        end: 414.895,
        kind: "takeaway",
        stageTitle: "Seller takeaway",
        stageCopy:
          "You are not reading financials like an accountant. You are learning the concepts that help flag strong candidates.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Net asset check",
        placement: 171.781,
        question:
          "A company owns $3M in assets and owes $4.5M. What is its net asset position?",
        reviewTarget: "Net asset position",
        options: [
          {
            id: "a",
            text: "$4.5M.",
            feedback:
              "Review net asset position. Liabilities are subtracted from assets; they are not the final position.",
          },
          {
            id: "b",
            text: "$3M.",
            feedback:
              "Review net asset position. Assets alone do not show what remains after debts.",
          },
          {
            id: "c",
            text: "Negative $1.5M.",
            correct: true,
            feedback: "Correct. $3M minus $4.5M leaves negative $1.5M.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Runway check",
        placement: 276.456,
        question:
          "Runway = bank balance divided by monthly burn. If a company spends $180K per month, brings in $130K, and has $400K in the bank, how much runway does it have?",
        reviewTarget: "Burn rate and runway",
        options: [
          {
            id: "a",
            text: "2.2 months.",
            feedback:
              "Review runway. Use monthly burn, not total monthly spend.",
          },
          {
            id: "b",
            text: "8 months.",
            correct: true,
            feedback:
              "Correct. Burn is $50K per month, and $400K divided by $50K is 8 months.",
          },
          {
            id: "c",
            text: "12 months.",
            feedback:
              "Review runway. At $50K monthly burn, $400K does not last a full year.",
          },
        ],
      },
      {
        id: "checkpoint-3",
        label: "Statements check",
        placement: 351.644,
        question:
          "True or false: every Dash.fi application requires a balance sheet and P&L.",
        reviewTarget: "P&L, balance sheet, and margin",
        options: [
          {
            id: "a",
            text: "True.",
            feedback:
              "Review the statements section. Extended terms require a balance sheet and P&L.",
          },
          {
            id: "b",
            text: "False.",
            correct: true,
            feedback:
              "Correct. Net-1 does not require a balance sheet or P&L. Extended terms require a balance sheet and P&L.",
          },
        ],
      },
    ],
    productionNotes: [
      "Timing uses the verified M0P0_2 SRT and preview package asset map.",
      "Checkpoint copy is pruned from Skill-Checks Module 0, checks 4-6.",
      "SRT includes source typos in narration text; retain captions until transcript correction phase.",
    ],
  },
  "1-3": {
    objectives: [
      "Separate Net-1 requirements from extended-term review.",
      "Name the core categories the underwriting team evaluates.",
      "Explain why cash runway matters for float.",
      "Recognize when corporate structure changes the path forward.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-1/lesson-3/audio.mp3",
      captionsSrc: "/training/underwriting/module-1/lesson-3/captions.vtt",
      timelineSrc: "/training/underwriting/module-1/lesson-3/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "Two underwriting paths",
        start: 0,
        end: 43.42,
        kind: "underwritingPaths",
        stageTitle: "Two underwriting paths",
        stageCopy:
          "Net-1 is a lighter path. Extended terms need a fuller financial packet before underwriting can calibrate risk.",
      },
      {
        id: "section-2",
        title: "Extended terms packet",
        start: 43.42,
        end: 69.473,
        kind: "documentPacket",
        stageTitle: "Extended terms packet",
        stageCopy:
          "Extended terms require 24 months of P&L and balance sheet because Dash.fi is carrying more repayment exposure.",
      },
      {
        id: "section-3",
        title: "Underwriting call",
        start: 69.473,
        end: 105.695,
        kind: "underwritingCall",
        stageTitle: "Underwriting call",
        stageCopy:
          "Underwriting reads the numbers first, then uses the call to understand what the numbers do not fully explain.",
      },
      {
        id: "section-4",
        title: "Cash runway",
        start: 105.695,
        end: 150.37,
        kind: "runway",
        stageTitle: "Cash runway",
        stageCopy:
          "For extended terms, underwriting wants enough cash on hand relative to the requested limit.",
      },
      {
        id: "section-5",
        title: "Current ratio",
        start: 150.37,
        end: 174.333,
        kind: "currentRatio",
        stageTitle: "Current ratio",
        stageCopy:
          "A weak current ratio is one of the fastest ways a prospect will not qualify for Net-30 or above.",
      },
      {
        id: "section-6",
        title: "Debt structure",
        start: 174.333,
        end: 218.87,
        kind: "evaluationMatrix",
        stageTitle: "Debt structure",
        stageCopy:
          "Existing financing is not automatically bad. Underwriting wants to know whether debt is shrinking or growing.",
      },
      {
        id: "section-7",
        title: "Revenue trajectory",
        start: 218.87,
        end: 244.598,
        kind: "evaluationMatrix",
        stageTitle: "Revenue trajectory",
        stageCopy:
          "Revenue trajectory is about whether the company is moving toward profitability or still burning cash.",
      },
      {
        id: "section-8",
        title: "Corporate structure",
        start: 244.598,
        end: 288.065,
        kind: "ownershipControl",
        stageTitle: "Corporate structure",
        stageCopy:
          "Parent entities can change the path if the parent controls the balance sheet or can support the application.",
      },
      {
        id: "section-9",
        title: "Set expectations",
        start: 288.065,
        end: 313.143,
        kind: "takeaway",
        stageTitle: "Set expectations",
        stageCopy:
          "The rep's job is to set the right path early so underwriting is not surprised later.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Net-1 requirements",
        placement: 43.42,
        question:
          "What does the underwriting team need to approve a Net-1 card path?",
        reviewTarget: "Two underwriting paths",
        options: [
          {
            id: "a",
            text: "24 months of P&L and balance sheet.",
            feedback: "That is the extended-terms packet, not the Net-1 path.",
          },
          {
            id: "b",
            text: "Connected bank account, EIN, and KYC verification.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "A personal guarantee and FICO check.",
            feedback: "Dash.fi does not position Net-1 around PG/FICO checks.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Evaluation categories",
        placement: 288.065,
        question:
          "Which item is NOT one of the five extended-term evaluation categories?",
        reviewTarget: "Evaluation factors",
        options: [
          {
            id: "a",
            text: "Cash runway.",
            feedback: "Cash runway is one of the core evaluation categories.",
          },
          {
            id: "b",
            text: "Gross margin.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "Revenue trajectory.",
            feedback:
              "Revenue trajectory is one of the core evaluation categories.",
          },
        ],
      },
    ],
    productionNotes: [
      "Audit-ready package generated from module-one/financials-101/part-three/section-timing.json.",
      "Media uses ElevenLabs_M0P0_3.wav, M0P0_3.srt, and ElevenLabs_M0P0_3.aaf.",
      "Skill checks are draft selections for Ray/team quality review before final H5P packaging.",
    ],
  },
  "1-4": {
    objectives: [
      "Recognize patterns that make a prospect unlikely to qualify.",
      "Connect business model, margins, and financial distress to outcomes.",
      "Spot obvious non-fits earlier in discovery.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-1/lesson-4/audio.mp3",
      captionsSrc: "/training/underwriting/module-1/lesson-4/captions.vtt",
      timelineSrc: "/training/underwriting/module-1/lesson-4/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "$6.7M pattern",
        start: 0,
        end: 32.845,
        kind: "lossPattern",
        stageTitle: "$6.7M pattern",
        stageCopy:
          "The lesson starts with the cost of missing risk patterns: multiple deals, one avoidable exposure story.",
      },
      {
        id: "section-2",
        title: "Obvious signs",
        start: 32.845,
        end: 37.571,
        kind: "redFlags",
        stageTitle: "Obvious signs",
        stageCopy:
          "You are not underwriting on the call. You are catching the obvious signals early enough to avoid wasted motion.",
      },
      {
        id: "section-3",
        title: "Financial distress",
        start: 37.571,
        end: 59.305,
        kind: "netAssets",
        stageTitle: "Financial distress",
        stageCopy:
          "Recent bankruptcy or financial distress should change the conversation before a deal reaches underwriting.",
      },
      {
        id: "section-4",
        title: "Parent control",
        start: 59.305,
        end: 85.265,
        kind: "ownershipControl",
        stageTitle: "Parent control",
        stageCopy:
          "If a parent company controls the money, the operating entity's revenue may not tell the repayment story.",
      },
      {
        id: "section-5",
        title: "Thin margins",
        start: 85.265,
        end: 109.6,
        kind: "marginCushion",
        stageTitle: "Thin margins",
        stageCopy:
          "Thin margin businesses can look large while having very little cushion for repayment timing or a bad month.",
      },
      {
        id: "section-6",
        title: "Company maturity",
        start: 109.6,
        end: 132.495,
        kind: "balanceSheet",
        stageTitle: "Company maturity",
        stageCopy:
          "A young company with high debt and low cash may not be ready for the limits it wants.",
      },
      {
        id: "section-7",
        title: "Signals before underwriting",
        start: 132.495,
        end: 170.622,
        kind: "redFlags",
        stageTitle: "Signals before underwriting",
        stageCopy:
          "The goal is not to underwrite on the sales call. It is to spot obvious non-fits before the request is packaged.",
      },
      {
        id: "section-8",
        title: "Module wrap",
        start: 170.622,
        end: 197.929,
        kind: "takeaway",
        stageTitle: "Module wrap",
        stageCopy:
          "Financial vocabulary and pattern recognition set up the discovery process in the next module.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Business model fit",
        placement: 109.6,
        question:
          "A prospect buys discounted products and resells them on Amazon at a small markup. Why is this a concern?",
        reviewTarget: "Thin margins",
        options: [
          {
            id: "a",
            text: "Amazon sellers are never a fit.",
            feedback:
              "The issue is the margin profile, not the channel by itself.",
          },
          {
            id: "b",
            text: "Thin margins leave little cushion for repayment risk.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "Revenue alone guarantees repayment.",
            feedback: "The lesson warns against relying only on revenue.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Distress signal",
        placement: 59.305,
        question:
          "True or false: recent bankruptcy can be outweighed by strong current revenue for Dash.fi fit.",
        reviewTarget: "Financial distress",
        options: [
          {
            id: "a",
            text: "True.",
            correct: false,
            feedback:
              "Review this section. The lesson makes a narrower point than that.",
          },
          {
            id: "b",
            text: "False.",
            correct: true,
            feedback:
              "Correct. Recent bankruptcy is a major financial distress signal in this lesson.",
          },
        ],
      },
    ],
    productionNotes: [
      "Audit-ready package generated from module-one/financials-101/part-four/section-timing.json.",
      "Media uses ElevenLabs_M0P0_4.wav, M0P0_4.srt, and ElevenLabs_M0P0_4.aaf.",
      "Skill checks are draft selections for Ray/team quality review before final H5P packaging.",
    ],
  },
  "2-1": {
    objectives: [
      "Open the financial conversation without making underwriting feel punitive.",
      "Position performance-based underwriting against personal-credit models.",
      "Present Net-1 and float without promising specific terms.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-2/lesson-1/audio.mp3",
      captionsSrc: "/training/underwriting/module-2/lesson-1/captions.vtt",
      timelineSrc: "/training/underwriting/module-2/lesson-1/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "Three tactics",
        start: 0,
        end: 37.663,
        kind: "tacticPreview",
        stageTitle: "Open with three tactics",
        stageCopy:
          "Prospects expect FICO pulls, personal guarantees, and low limits. This lesson shows three ways to reframe underwriting as a Dash.fi advantage.",
      },
      {
        id: "section-1-tactic-1",
        title: "Tactic 1: Performance-based underwriting",
        start: 37.663,
        end: 123.178,
        kind: "performanceFrame",
        stageTitle: "Tactic 1: Performance-based underwriting",
        stageCopy:
          "Name the model, connect it to growth, and anchor the value in business performance: revenue, bank balance, and scalable limits.",
      },
      {
        id: "section-2",
        title: "Tactic 2: Differentiate the approach",
        start: 123.178,
        end: 184.767,
        kind: "businessLens",
        stageTitle: "Tactic 2: Differentiate the approach",
        stageCopy:
          "When prospects mention personal guarantees, FICO pulls, or low limits, contrast that with Dash.fi underwriting the business.",
      },
      {
        id: "section-3",
        title: "Business, not personal credit",
        start: 184.767,
        end: 246.356,
        kind: "noPersonalCredit",
        stageTitle: "No PG. No FICO. No UCC.",
        stageCopy:
          "Specific language lowers anxiety: no personal guarantee, no personal credit pull, and no UCC lien for the standard path.",
      },
      {
        id: "section-4",
        title: "Tactic 3: Position the path",
        start: 246.356,
        end: 307.945,
        kind: "underwritingPaths",
        stageTitle: "Tactic 3: Position the path",
        stageCopy:
          "Frame Net-1 as the lighter path and extended terms as a deeper underwriting review without promising a specific outcome.",
      },
      {
        id: "section-5",
        title: "Move to application",
        start: 307.945,
        end: 369.534,
        kind: "underwritingPaths",
        stageTitle: "Move to application",
        stageCopy:
          "Move the conversation to the application without promising a limit or term. The rep's job is to set the right path and expectation.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Opening frame",
        placement: 131.376,
        question:
          "Which opening move does NOT belong in the recommended financial conversation frame?",
        reviewTarget: "Open the conversation",
        options: [
          {
            id: "a",
            text: "Position underwriting as performance-based.",
            feedback: "That is part of the recommended frame.",
          },
          {
            id: "b",
            text: "Promise a specific Net-30 outcome before underwriting.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "Explain that terms depend on the business profile.",
            feedback: "That protects the deal and sets accurate expectations.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Terms expectation",
        placement: 311.842,
        question:
          "A prospect asks what terms Dash.fi can offer. Which response best protects the deal?",
        reviewTarget: "Two product paths",
        options: [
          {
            id: "a",
            text: "You will definitely get Net-30.",
            feedback: "Specific term promises create avoidable risk.",
          },
          {
            id: "b",
            text: "We start with the application and match terms to the business profile after review.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "We cannot discuss terms until much later.",
            feedback:
              "The lesson supports framing the path, not avoiding the topic.",
          },
        ],
      },
      {
        id: "checkpoint-3",
        label: "Net-1 path",
        placement: 346.487,
        question:
          "True or false: Net-1 applicants need 24 months of P&L and balance sheets.",
        reviewTarget: "Two product paths",
        options: [
          {
            id: "a",
            text: "True.",
            correct: false,
            feedback:
              "Review this section. The lesson makes a narrower point than that.",
          },
          {
            id: "b",
            text: "False.",
            correct: true,
            feedback:
              "Correct. That financial statement package applies to extended repayment terms.",
          },
        ],
      },
    ],
    productionNotes: [
      "Audit-ready package generated from module-two/discovery-positioning/part-one/section-timing.json.",
      "Media uses ElevenLabs_M1P1_1.wav, M1P1_1.srt, and ElevenLabs_M1P1_1.aaf.",
      "Skill checks are draft selections for Ray/team quality review before final H5P packaging.",
    ],
  },
  "2-2": {
    objectives: [
      "Use a reasoned setup before asking sensitive financial questions.",
      "Lower the commitment when a prospect gives a vague answer.",
      "Use closed-ended choices to make hard questions easier to answer.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-2/lesson-2/audio.mp3",
      captionsSrc: "/training/underwriting/module-2/lesson-2/captions.vtt",
      timelineSrc: "/training/underwriting/module-2/lesson-2/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "Why questions feel risky",
        start: 0,
        end: 41.797,
        kind: "redFlags",
        stageTitle: "Why questions feel risky",
        stageCopy:
          "Financial questions feel risky when they sound like interrogation. Set the purpose first so the prospect understands why the answer matters.",
      },
      {
        id: "section-2",
        title: "The reason phrase",
        start: 41.797,
        end: 92.184,
        kind: "underwritingCall",
        stageTitle: "The reason I ask is because",
        stageCopy:
          "A reason turns a sensitive financial question into context. The prospect hears why the answer matters before they react.",
      },
      {
        id: "section-3",
        title: "Situation 1: Ask with a reason",
        start: 92.184,
        end: 162.959,
        kind: "underwritingCall",
        stageTitle: "Situation 1: Ask with a reason",
        stageCopy:
          "Start with fit, then ask profitability. Cameron shows how the reason can come before the question without using the exact phrase.",
      },
      {
        id: "section-4",
        title: "Situation 2: Lower the commitment",
        start: 162.959,
        end: 245.808,
        kind: "underwritingCall",
        stageTitle: "Situation 2: Lower the commitment",
        stageCopy:
          "When the answer is vague, anchor to the prospect's goal and narrow the question to something easier to answer.",
      },
      {
        id: "section-5",
        title: "Situation 3: Respond to resistance",
        start: 245.808,
        end: 288.579,
        kind: "underwritingCall",
        stageTitle: "Situation 3: Respond to resistance",
        stageCopy:
          "When a prospect refuses, validate the concern, explain the reason, and ask a smaller version of the question.",
      },
      {
        id: "section-6",
        title: "Additional discovery questions",
        start: 288.579,
        end: 360.142,
        kind: "underwritingCall",
        stageTitle: "Additional discovery questions",
        stageCopy:
          "Cash position and existing debt questions are easier when they are direct, specific, and framed as product-fit discovery.",
      },
      {
        id: "section-7",
        title: "Lesson recap",
        start: 360.142,
        end: 401.149,
        kind: "takeaway",
        stageTitle: "Here's what we covered",
        stageCopy:
          "Use the reason phrase while asking, after vague answers, and when prospects push back. The goal is context plus lower commitment.",
      },
      {
        id: "section-8",
        title: "Make it normal",
        start: 401.149,
        end: 417.893,
        kind: "takeaway",
        stageTitle: "Make it normal",
        stageCopy:
          "Normalize financial discovery by making every question serve the same purpose: finding the right path and avoiding surprises later.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Reasoning phrase",
        placement: 153.346,
        question:
          "Why does “the reason I ask is because” make a hard financial question easier to answer?",
        reviewTarget: "Ask with a reason",
        options: [
          {
            id: "a",
            text: "It makes the question optional.",
            feedback: "The question still matters; the phrase gives context.",
          },
          {
            id: "b",
            text: "It explains the business reason behind the question before the prospect reacts.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "It avoids talking about financials.",
            feedback:
              "The phrase helps you ask financial questions more clearly.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Vague answer",
        placement: 245.808,
        question:
          "A prospect says, “It is complicated; we are still figuring out cash position.” What should you do?",
        reviewTarget: "Lower the commitment",
        options: [
          {
            id: "a",
            text: "Move on permanently.",
            feedback:
              "The lesson teaches a softer follow-up, not dropping the topic.",
          },
          {
            id: "b",
            text: "Lower the commitment and ask a more answerable follow-up.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "Challenge them for exact numbers immediately.",
            feedback: "That raises pressure before you have context.",
          },
        ],
      },
    ],
    productionNotes: [
      "Audit-ready package generated from module-two/discovery-positioning/part-two/section-timing.json.",
      "Media uses ElevenLabs_M1P1_2.wav, M1P1_2.srt, and ElevenLabs_M1P1_2.aaf.",
      "Skill checks are draft selections for Ray/team quality review before final H5P packaging.",
    ],
  },
  "2-3": {
    objectives: [
      "Make the application feel lightweight before concerns surface.",
      "Separate the Net-1 path from float documentation.",
      "Address PG, credit check, and UCC concerns before they become blockers.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-2/lesson-3/audio.mp3",
      captionsSrc: "/training/underwriting/module-2/lesson-3/captions.vtt",
      timelineSrc: "/training/underwriting/module-2/lesson-3/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "The concern moment",
        start: 0,
        end: 62.323,
        kind: "redFlags",
        stageTitle: "Getting ahead of concerns",
        stageCopy:
          "The first frame is not the document list. It is the predictable concern: financials, credit checks, personal guarantees, and UCC filings.",
      },
      {
        id: "section-2",
        title: "Matthew's concern",
        start: 62.323,
        end: 120.466,
        kind: "underwritingPaths",
        stageTitle: "Start with Net-1",
        stageCopy:
          "When Matthew is not comfortable sharing self-prepared books, Andy keeps Net-1 as the first path and leaves extended terms for underwriting review.",
      },
      {
        id: "section-3",
        title: "Tactic 1: Minimize the ask",
        start: 120.466,
        end: 183.021,
        kind: "tacticPreview",
        stageTitle: "Tactic 1: Minimize the ask",
        stageCopy:
          "Lead with the lightweight next step: the application is quick, non-binding, and does not require the full extended-term packet.",
      },
      {
        id: "section-4",
        title: "Tactic 2: Separate easy from hard",
        start: 183.021,
        end: 231.921,
        kind: "tacticPreview",
        stageTitle: "Tactic 2: Separate easy from hard",
        stageCopy:
          "Put Net-1 first, then explain that extended terms can be explored with underwriting once the heavier document review is relevant.",
      },
      {
        id: "section-5",
        title: "Tactic 3: Say it before they ask",
        start: 231.921,
        end: 301.767,
        kind: "tacticPreview",
        stageTitle: "Tactic 3: Say it before they ask",
        stageCopy:
          "Name PG, credit check, and UCC concerns before they become objections, so the prospect hears confirmation instead of risk.",
      },
      {
        id: "section-6",
        title: "Lesson recap",
        start: 301.767,
        end: 326.515,
        kind: "takeaway",
        stageTitle: "Address the concern before it becomes one",
        stageCopy:
          "Minimize the ask, separate easy from hard, and say the things prospects worry about before they have to ask.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Application framing",
        placement: 114.104,
        question:
          "What makes the application feel lighter before concerns surface?",
        reviewTarget: "Financial documents",
        options: [
          {
            id: "a",
            text: "Lead with every possible document requirement.",
            feedback: "That makes the ask feel heavier than needed.",
          },
          {
            id: "b",
            text: "Frame the first step as quick and separate it from deeper float documentation.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "Avoid mentioning underwriting at all.",
            feedback: "The lesson supports clear, simple framing.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Float requirements",
        placement: 231.921,
        question:
          "True or false: when a prospect asks about float, lead with the full document list before they commit.",
        reviewTarget: "Float requirements",
        options: [
          {
            id: "a",
            text: "True.",
            correct: false,
            feedback:
              "Review this section. The lesson makes a narrower point than that.",
          },
          {
            id: "b",
            text: "False.",
            correct: true,
            feedback:
              "Correct. Keep the ask simple and separate the easy first step from deeper review.",
          },
        ],
      },
    ],
    productionNotes: [
      "Audit-ready package generated from module-two/discovery-positioning/part-three/section-timing.json.",
      "Media uses ElevenLabs_M1P1_3.wav, M1P1_3.srt, and ElevenLabs_M1P1_3.aaf.",
      "Skill checks are draft selections for Ray/team quality review before final H5P packaging.",
    ],
  },
  "2-4": {
    objectives: [
      "Use validate, align, answer to handle underwriting objections.",
      "Distinguish personal discomfort from structural policy constraints.",
      "Redirect identity-verification concerns to the right stakeholder.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-2/lesson-4/audio.mp3",
      captionsSrc: "/training/underwriting/module-2/lesson-4/captions.vtt",
      timelineSrc: "/training/underwriting/module-2/lesson-4/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "Concern pushback",
        start: 0,
        end: 13.003,
        kind: "redFlags",
        stageTitle: "Handling customer concerns",
        stageCopy:
          "Prospects may still push back after you frame the application. Treat the concern as information, not friction.",
      },
      {
        id: "section-2",
        title: "Tactic 1: Validate, align, answer",
        start: 13.003,
        end: 28.931,
        kind: "tacticPreview",
        stageTitle: "Tactic 1: Validate, align, answer",
        stageCopy:
          "When a concern surfaces, make the prospect feel heard before you give the direct answer.",
      },
      {
        id: "section-3",
        title: "The customer concern",
        start: 28.931,
        end: 42.677,
        kind: "underwritingCall",
        stageTitle: "The customer concern",
        stageCopy:
          "Guy asks whether signing up means a massive contract, personal guarantee, or liability exposure.",
      },
      {
        id: "section-4",
        title: "Andy doesn't just say no",
        start: 42.677,
        end: 73.095,
        kind: "underwritingCall",
        stageTitle: "Andy doesn't just say no",
        stageCopy:
          "He validates the founder concern, aligns to Dash.fi's values, then gives the structural answer.",
      },
      {
        id: "section-5",
        title: "Three-step pattern",
        start: 73.095,
        end: 82.615,
        kind: "underwritingCall",
        stageTitle: "Validate. Align. Answer.",
        stageCopy:
          "The prospect feels heard before they get the information: validate the concern, align on values, then answer.",
      },
      {
        id: "section-6",
        title: "Tactic 2: Direct answer, then pivot to simplicity",
        start: 82.615,
        end: 94.875,
        kind: "tacticPreview",
        stageTitle: "Tactic 2: Direct answer, then pivot to simplicity",
        stageCopy:
          "Give the shortest direct answer, then replace concern with a simple next step.",
      },
      {
        id: "section-7",
        title: "Direct answer and simple next step",
        start: 94.875,
        end: 166.114,
        kind: "underwritingCall",
        stageTitle: "Direct answer, then simplicity",
        stageCopy:
          "Kurt and Tim both answer the credit-check concern first, then pivot to how lightweight Net-1 is.",
      },
      {
        id: "section-8",
        title: "Tactic 3: Redirect when you hit a wall",
        start: 166.114,
        end: 193.2,
        kind: "tacticPreview",
        stageTitle: "Tactic 3: Redirect when you hit a wall",
        stageCopy:
          "When the person on the call cannot or will not share personal information, redirect to the right stakeholder.",
      },
      {
        id: "section-9",
        title: "Shop LC identity concern",
        start: 193.2,
        end: 227.6,
        kind: "underwritingCall",
        stageTitle: "Shop LC identity concern",
        stageCopy:
          "Vijay refuses to share personal KYC information, so Cameron stops repeating the explanation and redirects ownership.",
      },
      {
        id: "section-10",
        title: "Company policy vs personal concern",
        start: 227.6,
        end: 253.698,
        kind: "businessLens",
        stageTitle: "Personal concern or structural blocker?",
        stageCopy:
          "Personal discomfort can be redirected. Company policy, governance, or board approval is structural and needs a different path.",
      },
      {
        id: "section-11",
        title: "Focus on personal concerns",
        start: 253.698,
        end: 282.259,
        kind: "redFlags",
        stageTitle: "Not every concern can be resolved",
        stageCopy:
          "Use the three tactics on personal concerns: discomfort with documents, worry about credit checks, and hesitation about personal guarantees.",
      },
      {
        id: "section-12",
        title: "Keep momentum",
        start: 282.259,
        end: 293.776,
        kind: "takeaway",
        stageTitle: "Keep momentum",
        stageCopy:
          "The goal is not to win every concern. It is to choose the right next move: push for float, pivot to Net-1, or flag it for underwriting.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Concern pattern",
        placement: 156.315,
        question:
          "A prospect asks whether there is a personal guarantee. What pattern should you use?",
        reviewTarget: "Company policy",
        options: [
          {
            id: "a",
            text: "Answer defensively and move on.",
            feedback: "The lesson uses a structured concern-handling pattern.",
          },
          {
            id: "b",
            text: "Validate, align, then answer directly.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "Ignore the concern until the application.",
            feedback: "The lesson recommends addressing it clearly.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Structural concern",
        placement: 253.698,
        question:
          "A prospect says their board must approve sharing financial data. What kind of concern is this?",
        reviewTarget: "Confidentiality",
        options: [
          {
            id: "a",
            text: "Personal discomfort only.",
            feedback: "Board approval is a structural/process concern.",
          },
          {
            id: "b",
            text: "Structural concern; align on the process and next stakeholder.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "A reason to disqualify immediately.",
            feedback:
              "The lesson supports routing the concern, not ending the deal.",
          },
        ],
      },
    ],
    productionNotes: [
      "Audit-ready package generated from module-two/discovery-positioning/part-four/section-timing.json.",
      "Media uses ElevenLabs_M1P1_4.wav, M1P1_4.srt, and ElevenLabs_M1P1_4.aaf.",
      "Skill checks are draft selections for Ray/team quality review before final H5P packaging.",
    ],
  },
  "2-5": {
    objectives: [
      "Read discovery signals that point toward Net-1 or float.",
      "Recognize industry patterns that affect underwriting outcomes.",
      "Set product expectations based on the prospect's financial profile.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-2/lesson-5/audio.mp3",
      captionsSrc: "/training/underwriting/module-2/lesson-5/captions.vtt",
      timelineSrc: "/training/underwriting/module-2/lesson-5/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "Reading the Signals",
        start: 0,
        end: 18.948,
        kind: "signalBoard",
        stageTitle: "Fit, Net-1, or stop",
        stageCopy:
          "The goal is to read the signal early: float fit, Net-1 close, or a deal that should not move to underwriting yet.",
      },
      {
        id: "section-2",
        title: "Financial signals",
        start: 18.948,
        end: 19.5,
        kind: "signalBoard",
        stageTitle: "Financial signals",
        stageCopy:
          "Start with the financial signals that tell you whether float is supportable or Net-1 is the cleaner path.",
      },
      {
        id: "section-3",
        title: "Signal 1: Personal credit cards",
        start: 19.5,
        end: 34.738,
        kind: "signalBoard",
        stageTitle: "Signal 1: Personal credit cards are funding ads",
        stageCopy:
          "If the founder is still swiping a personal card for Meta campaigns, the business may not have its own financial infrastructure yet.",
      },
      {
        id: "section-4",
        title: "Signal 2: Burn and runway",
        start: 34.738,
        end: 66.039,
        kind: "signalBoard",
        stageTitle: "Signal 2: Burn exceeds revenue with short runway",
        stageCopy:
          "Burn greater than revenue with a short runway is not always a dead deal, but it is a strong signal that Net-1 may be the only responsible path.",
      },
      {
        id: "section-5",
        title: "Financial signal read",
        start: 66.039,
        end: 76.534,
        kind: "signalBoard",
        stageTitle: "Float off the table is not a dead deal",
        stageCopy:
          "A financial signal can point to a Net-1 close while the company's profile strengthens.",
      },
      {
        id: "section-6",
        title: "Industry signals",
        start: 76.534,
        end: 100.312,
        kind: "signalBoard",
        stageTitle: "Industry signals",
        stageCopy:
          "Revenue is not the only predictor. Some business models create cash-cycle pressure that makes extended terms harder to support.",
      },
      {
        id: "section-7",
        title: "Resellers",
        start: 100.312,
        end: 102.3,
        kind: "signalBoard",
        stageTitle: "Resellers",
        stageCopy:
          "Resellers can move product they do not fully control, which can leave underwriting with less asset support behind float.",
      },
      {
        id: "section-8",
        title: "Distributors",
        start: 102.3,
        end: 104.3,
        kind: "signalBoard",
        stageTitle: "Distributors",
        stageCopy:
          "Distributors can carry stretched supplier and customer-payment cycles, so the cash conversion cycle needs to be flagged early.",
      },
      {
        id: "section-9",
        title: "Dropshippers",
        start: 104.3,
        end: 125.158,
        kind: "signalBoard",
        stageTitle: "Dropshippers",
        stageCopy:
          "Dropshippers may sell before owning or holding inventory. When cash goes out before downstream buyers pay, float support can get thin.",
      },
      {
        id: "section-10",
        title: "Manufacturers",
        start: 125.158,
        end: 151.165,
        kind: "signalBoard",
        stageTitle: "Manufacturers",
        stageCopy:
          "R&D, tooling, production runs, and overseas shipping can make cash conversion lag far behind revenue.",
      },
      {
        id: "section-11",
        title: "Service providers",
        start: 151.165,
        end: 172.62,
        kind: "signalBoard",
        stageTitle: "Service providers",
        stageCopy:
          "Agencies, 3PLs, and staffing companies may pay teams every two weeks while client revenue comes back on Net-30 or Net-60.",
      },
      {
        id: "section-12",
        title: "Pre-revenue DTC brands",
        start: 172.62,
        end: 192.079,
        kind: "signalBoard",
        stageTitle: "Pre-revenue DTC brands",
        stageCopy:
          "A brand can look like an ICP fit, but if ad spend is ahead of profitability, the cash conversion cycle is still negative.",
      },
      {
        id: "section-13",
        title: "Just flag them",
        start: 192.079,
        end: 207.45,
        kind: "signalBoard",
        stageTitle: "None of these are automatic qualifications",
        stageCopy:
          "Just flag them early and set the right expectations before the prospect fills out the application.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Ad funding signal",
        placement: 76.534,
        question:
          "A founder uses a personal Amex for all Meta ads. What does this signal?",
        reviewTarget: "Personal card spend",
        options: [
          {
            id: "a",
            text: "It guarantees extended float.",
            feedback: "A signal is not an underwriting approval.",
          },
          {
            id: "b",
            text: "There may be a strong Dash.fi use case, but underwriting needs the business profile.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "It means the company is not a fit.",
            feedback: "The signal may indicate a pain point Dash.fi can solve.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "Service businesses",
        placement: 192.079,
        question:
          "Why can service companies like agencies or staffing firms struggle with float approval?",
        reviewTarget: "Operational maturity",
        options: [
          {
            id: "a",
            text: "They never use cards.",
            feedback: "The lesson is about repayment profile, not card usage.",
          },
          {
            id: "b",
            text: "Cash conversion and margin timing can make repayment risk harder to support.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "Their industry name alone disqualifies them.",
            feedback: "The issue is the financial and operating signal.",
          },
        ],
      },
    ],
    productionNotes: [
      "Audit-ready package generated from module-two/discovery-positioning/part-five/section-timing.json.",
      "Media uses ElevenLabs_M1P1_5.wav, M1P1_5.srt, and ElevenLabs_M1P1_5.aaf.",
      "Skill checks are draft selections for Ray/team quality review before final H5P packaging.",
    ],
  },
  "2-6": {
    objectives: [
      "Explain the difference between application approval and underwriting approval.",
      "Guide a prospect through the application steps confidently.",
      "Set expectations for bank connection and fallback paths.",
    ],
    media: {
      audioSrc: "/training/underwriting/module-2/lesson-6/audio.mp3",
      captionsSrc: "/training/underwriting/module-2/lesson-6/captions.vtt",
      timelineSrc: "/training/underwriting/module-2/lesson-6/timeline.aaf",
    },
    sections: [
      {
        id: "section-1",
        title: "Application is not underwriting",
        start: 0,
        end: 31.022,
        kind: "applicationProcess",
        stageTitle: "Application is not underwriting",
        stageCopy:
          "The application verifies KYB and KYC. Underwriting is the separate step that determines terms and limits.",
      },
      {
        id: "section-2",
        title: "Step 1: Qualification",
        start: 31.022,
        end: 53.638,
        kind: "applicationProcess",
        stageTitle: "Step 1: Qualification",
        stageCopy:
          "The prospect confirms whether this is a US company with a registration number and legal operating entity.",
      },
      {
        id: "section-3",
        title: "Step 2: Business details",
        start: 53.638,
        end: 102.493,
        kind: "applicationProcess",
        stageTitle: "Step 2: Business details",
        stageCopy:
          "Company details, monthly spend, website, and operating address. EIN and incorporation documents keep this step moving.",
      },
      {
        id: "section-4",
        title: "Step 3: Identity verification",
        start: 102.493,
        end: 133.562,
        kind: "applicationProcess",
        stageTitle: "Step 3: Identity verification",
        stageCopy:
          "Beneficial owners over 25%, or the controlling officer, complete KYC with government ID and selfie verification.",
      },
      {
        id: "section-5",
        title: "Step 4: Terms and conditions",
        start: 133.562,
        end: 140.528,
        kind: "applicationProcess",
        stageTitle: "Step 4: Terms and conditions",
        stageCopy:
          "This is standard legal acceptance, not final underwriting terms.",
      },
      {
        id: "section-6",
        title: "Step 5: Finalize",
        start: 140.528,
        end: 154.5,
        kind: "applicationProcess",
        stageTitle: "Step 5: Finalize",
        stageCopy:
          "The final screen confirms beneficiaries, controlling officer, bank account, and documents.",
      },
      {
        id: "section-7",
        title: "Bank connection: Plaid Connect",
        start: 154.5,
        end: 171.04,
        kind: "applicationProcess",
        stageTitle: "Bank connection: Plaid Connect",
        stageCopy:
          "Fastest path: the prospect authenticates through Plaid and the bank connection verifies instantly.",
      },
      {
        id: "section-8",
        title: "Bank fallback: manual and micro deposit",
        start: 171.04,
        end: 186.69,
        kind: "applicationProcess",
        stageTitle: "If Plaid fails: manual path",
        stageCopy:
          "The prospect enters routing and account numbers, then verifies the account with a micro deposit.",
      },
      {
        id: "section-9",
        title: "Bank fallback: statement upload",
        start: 186.69,
        end: 203.873,
        kind: "applicationProcess",
        stageTitle: "If micro deposit is blocked: upload a bank statement",
        stageCopy:
          "Last path: upload a recent bank statement directly in the application. It must be an actual statement, not a screenshot.",
      },
      {
        id: "section-10",
        title: "Documents",
        start: 203.873,
        end: 221.939,
        kind: "applicationProcess",
        stageTitle: "Documents",
        stageCopy:
          "Net-1 may only need a bank statement. Float review is where 24 months of P&L and balance sheets get attached.",
      },
      {
        id: "section-11",
        title: "After they submit",
        start: 221.939,
        end: 248.875,
        kind: "applicationProcess",
        stageTitle: "After submit: transition to underwriting",
        stageCopy:
          "Operations completes KYB and KYC review. Once approved, the system creates an underwriting request for the separate terms-and-limits decision.",
      },
      {
        id: "section-12",
        title: "Finish Module Two",
        start: 248.875,
        end: 262.899,
        kind: "applicationProcess",
        stageTitle: "Walk them through it with confidence",
        stageCopy:
          "Application approved does not mean the prospect has a card yet. It means the business is verified and ready for underwriting.",
      },
    ],
    checkpoints: [
      {
        id: "checkpoint-1",
        label: "Application vs underwriting",
        placement: 53.638,
        question:
          "True or false: once the application is approved through KYB and KYC business verification, the prospect has final card terms and limits and the card is ready to use.",
        reviewTarget: "Application is not underwriting",
        options: [
          {
            id: "a",
            text: "True.",
            correct: false,
            feedback:
              "Application approval does not mean the prospect has a card yet. It means the business has been verified and is ready for underwriting.",
          },
          {
            id: "b",
            text: "False.",
            correct: true,
            feedback:
              "Correct. Application approval means KYB and KYC passed. Terms, limits, and card availability come after underwriting.",
          },
        ],
      },
      {
        id: "checkpoint-2",
        label: "KYC ownership",
        placement: 133.562,
        question:
          "A company has four equal co-founders at 25% each. Who completes KYC verification?",
        reviewTarget: "Document handoff",
        options: [
          {
            id: "a",
            text: "Only the person on the sales call.",
            feedback:
              "KYC depends on ownership/control, not just meeting attendance.",
          },
          {
            id: "b",
            text: "All four co-founders.",
            correct: true,
            feedback: "Correct. This matches the lesson framing.",
          },
          {
            id: "c",
            text: "No one if the company connects a bank.",
            feedback:
              "Bank connection does not replace required identity verification.",
          },
        ],
      },
      {
        id: "checkpoint-3",
        label: "Plaid fallback",
        placement: 221.939,
        question:
          "A prospect says Plaid cannot connect to their bank. What is the next option?",
        reviewTarget: "Bank fallback: manual and micro deposit",
        options: [
          {
            id: "a",
            text: "Stop the application.",
            feedback: "The lesson includes fallback paths.",
          },
          {
            id: "b",
            text: "Have them use the manual bank connection path: enter routing and account numbers so the account can be verified by micro deposit.",
            correct: true,
            feedback:
              "Correct. If Plaid does not connect, the next path is manual bank entry followed by micro-deposit verification.",
          },
          {
            id: "c",
            text: "Tell them underwriting cannot continue under any circumstances.",
            feedback:
              "The application process has alternatives before that conclusion.",
          },
        ],
      },
    ],
    productionNotes: [
      "Audit-ready package generated from module-two/discovery-positioning/part-six/section-timing.json.",
      "Media uses ElevenLabs_M1P1_6.wav, M1P1_6.srt, and ElevenLabs_M1P1_6.aaf.",
      "Skill checks are draft selections for Ray/team quality review before final H5P packaging.",
    ],
  },
  "3-1": {
    objectives: [
      "Submit an underwriting request from HubSpot.",
      "Identify the fields and gates to check before submission.",
      "Use the recording as the source of truth for this workflow step.",
    ],
    media: {
      videoSrc: "/training/underwriting/module-3/lesson-1/video.mp4",
    },
    sections: [
      {
        id: "section-1",
        title: "Submitting the underwriting request",
        start: 0,
        end: 288.029,
        kind: "workflowVideo",
        stageTitle: "Submitting the underwriting request",
        stageCopy:
          "Watch how the HubSpot request moves from qualified deal to underwriting submission.",
      },
    ],
    productionNotes: [
      "Simplified for launch review: this lesson is the source workflow recording for submitting an underwriting request.",
      "No in-video skill checks for Module 3 during the audit pass.",
    ],
  },
  "3-2": {
    objectives: [
      "Review what happens after the underwriting request is submitted.",
      "Identify where to track status and outcomes.",
      "Use the recording as the source of truth for this workflow step.",
    ],
    media: {
      videoSrc: "/training/underwriting/module-3/lesson-2/video.mp4",
    },
    sections: [
      {
        id: "section-1",
        title: "Reviewing the underwriting request",
        start: 0,
        end: 278,
        kind: "workflowVideo",
        stageTitle: "Reviewing the underwriting request",
        stageCopy:
          "Watch how the request status, review outcome, and deal updates move through HubSpot.",
      },
    ],
    productionNotes: [
      "Simplified for launch review: this lesson is the source workflow recording for reviewing the underwriting request.",
      "No in-video skill checks for Module 3 during the audit pass.",
    ],
  },
  "3-3": {
    objectives: [
      "Create a limit increase request for an existing customer.",
      "Identify what changes when the customer already exists.",
      "Use the recording as the source of truth for this workflow step.",
    ],
    media: {
      videoSrc: "/training/underwriting/module-3/lesson-3/video.mp4",
    },
    sections: [
      {
        id: "section-1",
        title: "When your customer needs a limit increase",
        start: 0,
        end: 123,
        kind: "workflowVideo",
        stageTitle: "When your customer needs a limit increase",
        stageCopy:
          "Watch how to create a manual limit increase request on the existing deal.",
      },
    ],
    productionNotes: [
      "Simplified for launch review: this lesson is the source workflow recording for customer limit increase requests.",
      "No in-video skill checks for Module 3 during the audit pass.",
    ],
  },
  "4-1": {
    objectives: [
      "Review the UW Process/Internal Process job aid.",
      "Identify where the internal process lives in the KB.",
      "Star or save the job aid so it is available during live underwriting work.",
    ],
    sections: [
      {
        id: "section-1",
        title: "Required job aid review",
        start: 0,
        end: 300,
        kind: "takeaway",
        stageTitle: "UW Process/Internal Process",
        stageCopy:
          "Scroll through the required KB job aid. Completion unlocks once you reach the end of the document.",
      },
    ],
    productionNotes: [
      "Required launch job-aid review unit. The document content is loaded from the Outline KB document by urlId.",
    ],
  },
};
