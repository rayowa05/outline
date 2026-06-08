export type UnderwritingQuizOption = {
  id: string;
  label: string;
  text: string;
  feedback: string;
  correct: boolean;
};

export type UnderwritingQuizQuestion = {
  id: string;
  number: number;
  phase: string;
  concept: string;
  hint?: string;
  stem: string;
  options: UnderwritingQuizOption[];
};

export type UnderwritingQuiz = {
  id: string;
  moduleNumber: number;
  lessonNumber: number;
  title: string;
  requiredPercent: 100;
  sourcePath: string;
  questions: UnderwritingQuizQuestion[];
};

export const underwritingQuizzes: UnderwritingQuiz[] = [
  {
    moduleNumber: 1,
    lessonNumber: 5,
    id: "module-1-financials-101-quiz",
    title: "Financials 101 Knowledge Check",
    sourcePath: "scripts/quiz-0-financial-101.md",
    requiredPercent: 100,
    questions: [
      {
        id: "module-1-financials-101-quiz-q1",
        number: 1,
        phase: "Phase 0.1",
        concept: "Limit gap vs. traditional providers",
        stem: "A prospect does $2M per month in revenue. They're running ad spend through an Amex business card with a $100K limit, but need $300K per day to scale their Meta campaigns. What feature of our card makes this prospect a great fit?",
        options: [
          {
            id: "a",
            label: "A",
            text: "Their $2M monthly revenue and high ad spend volume means they'll earn significantly more cashback with our card than with Amex.",
            feedback:
              "Cashback is a benefit, but it's not the feature that solves the prospect's core problem. They need higher limits, not higher rewards.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "Our underwriting is performance-based — we evaluate the business directly, which means we can extend limits that match how the business actually operates.",
            feedback:
              "Correct. Traditional providers issue low limits to avoid exposure. Performance-based underwriting looks at how the business actually operates, which is what allows us to extend limits that fit.",
            correct: true,
          },
          {
            id: "c",
            label: "C",
            text: "Their $2M monthly revenue is high enough that the underwriting team will approve them for the limits they need.",
            feedback:
              "Revenue alone doesn't determine approval. The underwriting team evaluates multiple financial indicators before extending limits.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: "Our card has no preset spending limit, so any prospect with strong revenue can spend as much as they need from day one.",
            feedback:
              "We do set limits — they're determined by the underwriting team based on the prospect's full financial profile. There's no such thing as unlimited spend from day one.",
            correct: false,
          },
        ],
      },
      {
        id: "module-1-financials-101-quiz-q2",
        number: 2,
        phase: "Phase 0.1",
        concept:
          'Risk profile framing — terms reflect risk, not "product versions"',
        stem: 'You\'re explaining underwriting to a prospect. They ask: "So if my financials are strong, I should get 30 days of float on your card no problem?" How do you correct this framing?',
        options: [
          {
            id: "a",
            label: "A",
            text: '"Yes — stronger financials definitely mean you unlock the better version of our product with longer float terms and higher limits."',
            feedback:
              'There aren\'t tiers or "versions." Terms reflect the risk profile the prospect presents, and no single financial signal guarantees a specific outcome.',
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: '"Everyone gets the same product regardless of financials. The only thing that changes is how fast you get approved for the card."',
            feedback:
              "Different financial profiles receive different terms — limits, float, and cashback all vary based on what the underwriting team finds.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: '"Strong financials will qualify you for Net-30 and 3% cashback — that\'s the outcome you should expect."',
            feedback:
              "Stronger financials mean more options, not a guaranteed outcome. The underwriting team evaluates multiple indicators — no single financial profile maps to a fixed set of terms.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: '"While stronger financials may mean more options for you, different financial profiles receive different terms — it\'s all based on what the underwriting team finds."',
            feedback:
              "Correct. It's not about earning a guaranteed outcome — it's about the underwriting team evaluating the full picture. Stronger financials mean more options, not a specific result.",
            correct: true,
          },
        ],
      },
      {
        id: "module-1-financials-101-quiz-q3",
        number: 3,
        phase: "Phase 0.1",
        concept:
          "Calibration, not rejection — and the flexibility of ongoing review",
        stem: "A prospect gets approved for $150K on Net-1. They're disappointed — they originally asked about Net-30. They ask if this means they were rejected. What's the right response?",
        options: [
          {
            id: "a",
            label: "A",
            text: '"This is calibration, not rejection. Net-1 reflects your current financials, and as your profile changes, we revisit terms."',
            feedback:
              "Correct. The approval is real and usable. Net-1 isn't a consolation prize — it's a starting point, and the underwriting team frequently revisits limits as the company's profile evolves.",
            correct: true,
          },
          {
            id: "b",
            label: "B",
            text: '"I\'ll escalate to the underwriting team and ask them to take another look at your application."',
            feedback:
              "Escalating without new financial information wastes the team's time. As the company's financials change, a limit increase review is the right path.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: '"Net-1 is our entry-level tier — come back in six months with stronger financials and reapply."',
            feedback:
              "Net-1 isn't a \"tier.\" The underwriting team doesn't see their work as pass or fail — they match terms to financial profile. And there's no fixed waiting period to request a review.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: '"Let me talk to the underwriting team and see if we can bump you to Net-7 as a compromise."',
            feedback:
              "Terms are set by the underwriting team based on financials, not negotiated by the rep.",
            correct: false,
          },
        ],
      },
      {
        id: "module-1-financials-101-quiz-q4",
        number: 4,
        phase: "Phase 0.2",
        concept: "Current ratio and its impact on float qualification",
        stem: "A prospect tells you their business has $1.2M in current assets and $1.8M in current liabilities. They're asking for Net-60 terms. What does this tell you?",
        options: [
          {
            id: "a",
            label: "A",
            text: "$1.2M in current assets is more than enough to cover the Net-60 terms they're requesting.",
            feedback:
              "Their current ratio is 0.67 — they owe more in near-term bills than they can cover. That's a red flag for float.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "You need to see their P&L statement before drawing conclusions about their ability to qualify.",
            feedback:
              "A current ratio of 0.67 is a standalone red flag. Even strong revenue trajectory can't fully offset near-term liquidity pressure.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: "Their current ratio is 0.67 — they can't cover short-term obligations, so this prospect likely won't qualify for float.",
            feedback:
              "Correct. Below 1.0 means the company can't pay upcoming bills with available assets. The underwriting team has said a weak current ratio is one of the quickest ways a prospect won't qualify for float.",
            correct: true,
          },
          {
            id: "d",
            label: "D",
            text: "Current liabilities include long-term debt, so the gap isn't as bad as it looks.",
            feedback:
              "Current liabilities are specifically short-term — bills due within 12 months. The 0.67 ratio reflects real near-term pressure.",
            correct: false,
          },
        ],
      },
      {
        id: "module-1-financials-101-quiz-q6",
        number: 5,
        phase: "Phase 0.2",
        concept: "Cash runway calculation and the 12-month threshold",
        hint: "Runway is a signal, not an automatic terms decision. Separate what you uncovered from what underwriting will determine.",
        stem: "A prospect has $250K in the bank and burns $25K per month after revenue. They're requesting Net-30 terms. How should you think about this?",
        options: [
          {
            id: "a",
            label: "A",
            text: "$250K in the bank with only $25K/month burn means they're in a strong position — Net-30 should be realistic.",
            feedback:
              "Runway matters more than raw cash, but it is still only one part of the underwriting picture. Do not turn it into a guaranteed Net-30 outcome.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "Their runway calculation alone means they should be routed directly to Net-1 — no need for additional discovery or financial analysis.",
            feedback:
              "Runway does not automatically route the deal. The next step is more discovery and clean context for underwriting.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: "Advise them to increase their bank balance to at least $300K before applying for extended terms with the underwriting team.",
            feedback:
              "You're not their financial advisor. Qualify, frame expectations honestly, and let the underwriting team decide.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: "Runway is 10 months — not terrible, but below the 12-month threshold. Submit it to underwriting with context and set honest expectations with the prospect.",
            feedback:
              "Correct. 10 months is close but below the 12-month target for extended terms. The rep's job is to surface the signal, add financial context, and avoid promising terms before underwriting reviews the application.",
            correct: true,
          },
        ],
      },
      {
        id: "module-1-financials-101-quiz-q7",
        number: 6,
        phase: "Phase 0.3",
        concept:
          'Cash runway as the underwriting team\'s "North Star" — and its relationship to the credit limit requested',
        stem: "A prospect is requesting a $500K daily limit on Net-30. During discovery, they mention they have about $600K in the bank. They seem confident this is enough. What should you be thinking?",
        options: [
          {
            id: "a",
            label: "A",
            text: "$600K in the bank covers the $500K daily limit with room to spare, so the cash position checks out.",
            feedback:
              "$600K against a $500K daily limit on Net-30 means barely more cash than a single day's exposure. The underwriting team wants to see significantly more than the limit in the bank.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "$600K against a $500K daily limit on Net-30 is thin — the underwriting team would need to see significantly more in the bank.",
            feedback:
              "Correct. Cash runway is the underwriting team's North Star. $600K against $500K of daily exposure on 30 business days of float is far below the threshold.",
            correct: true,
          },
          {
            id: "c",
            label: "C",
            text: "Net-30 decisions depend on P&L trajectory and revenue growth, not on how much cash is in the bank.",
            feedback:
              "Cash runway is the underwriting team's North Star for extended terms. While other factors matter, the bank balance relative to the credit limit is the starting point.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: "Suggest the prospect move more cash into their primary operating account before you submit the application.",
            feedback:
              "You're not their financial advisor. Your role is to qualify, set honest expectations, and let the underwriting team make the decision.",
            correct: false,
          },
        ],
      },
      {
        id: "module-1-financials-101-quiz-q8",
        number: 7,
        phase: "Phase 0.3",
        concept:
          "Debt structure — direction of debt matters more than its existence",
        stem: "A prospect has an active line of credit with their business bank. A colleague tells you this will sink the deal in underwriting. Is that correct?",
        options: [
          {
            id: "a",
            label: "A",
            text: "Yes — an existing line of credit is a disqualifier for the underwriting team because it adds exposure.",
            feedback:
              "Having financing isn't a disqualifier. The direction of the debt matters more than the debt itself.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "It depends on how much they owe — under $1M is fine, over $1M is a problem for the underwriting team.",
            feedback:
              "There's no fixed dollar threshold. A company paying down $3M is a better signal than one re-upping $500K.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: "Not necessarily — underwriting will ask whether the debt is being paid down or re-upped. Important to understand the context.",
            feedback:
              "Correct. In one case, a company put 95% of a raise toward paying off existing facilities with no plans to re-up. The underwriting team heard that and it was a green light.",
            correct: true,
          },
          {
            id: "d",
            label: "D",
            text: "Suggest the prospect pay off the line of credit before you submit the application to the underwriting team.",
            feedback:
              "You're not their financial advisor. The underwriting team evaluates the trajectory of debt, not how it's structured.",
            correct: false,
          },
        ],
      },
      {
        id: "module-1-financials-101-quiz-q9",
        number: 8,
        phase: "Phase 0.3",
        concept:
          "Corporate structure — parent guarantee can change the outcome",
        stem: "A prospect's standalone financials show a $10M P&L loss and negative net asset position. During discovery, you learn they're a subsidiary of a larger healthcare company with strong financials. What should you do?",
        options: [
          {
            id: "a",
            label: "A",
            text: "The subsidiary's standalone financials are what matter — submit the application without highlighting the parent relationship.",
            feedback:
              "The underwriting team evaluates corporate structure as one of five categories. When standalone financials are weak, a parent guarantee can change the outcome. Not surfacing the parent means the underwriting team misses a path that has turned similar deals around.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "Flag the parent company to underwriting when you submit — the underwriting team can explore whether a parent guarantee is possible.",
            feedback:
              'Correct. In one real case, a healthcare subsidiary with this exact profile was evaluated because the parent company could provide a guarantee. Asking "Is there a parent company?" in discovery matters.',
            correct: true,
          },
          {
            id: "c",
            label: "C",
            text: "Submit the application using the parent company's financials instead of the subsidiary's standalone numbers since they're stronger.",
            feedback:
              "You can't swap financials. But the underwriting team can ask the parent to provide a guarantee — that's a different path.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: "Advise the prospect to apply under the parent company's name since their financials are stronger and more likely to be approved.",
            feedback:
              "The product relationship is with the subsidiary. Surface the parent in discovery so the underwriting team can explore the guarantee option.",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    moduleNumber: 2,
    lessonNumber: 7,
    id: "module-2-discovery-positioning-quiz",
    title: "Discovery and Positioning Knowledge Check",
    sourcePath: "scripts/quiz-1-discovery.md",
    requiredPercent: 100,
    questions: [
      {
        id: "module-2-discovery-positioning-quiz-q1",
        number: 1,
        phase: "Phase 1.1",
        concept:
          "Three positioning tactics — framing underwriting as performance-based",
        stem: "A prospect says they applied for a business card last year and got a low limit after a credit pull and personal guarantee. They don't want to go through that again. Using the validate, align, answer framework — how should you respond?",
        options: [
          {
            id: "a",
            label: "A",
            text: '"Yeah I get that, but our process is different — we can probably get you Net-30 terms with a much higher limit based on your revenue."',
            feedback:
              'Naming specific terms (Net-30) and implying a specific outcome ("probably get you") skips validation entirely. You\'re creating an anchor the underwriting team may not match.',
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: '"That sounds frustrating. But I have good news. We do performance-based underwriting — we evaluate your revenue and bank balance, not your FICO score, and scale limits as your business grows."',
            feedback:
              'Correct. Validate ("that sounds frustrating"), align ("good news"), then answer with all three positioning elements: names the approach (performance-based), connects to growth (scale with you), and anchors on business performance (revenue and bank balance).',
            correct: true,
          },
          {
            id: "c",
            label: "C",
            text: "\"Hey, as long as you've got a P&L and a balance sheet, then you don't have to worry about us pulling your FICO score or asking for a personal guarantee.\"",
            feedback:
              "The differentiation is partially accurate, but you've skipped validation and jumped to logistics. The prospect needs to feel heard first, then understand why our process is different.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: '"Welcome to the world of credit cards, am I right?"',
            feedback:
              "Dismissing the concern with humor doesn't validate the prospect's experience or position our process as different. The prospect needs to hear that we understand and that our approach is fundamentally different.",
            correct: false,
          },
        ],
      },
      {
        id: "module-2-discovery-positioning-quiz-q2",
        number: 2,
        phase: "Phase 1.1",
        concept:
          "Positioning Net-1 and a general float option without over-committing",
        stem: 'You\'re presenting DashFi to a prospect who runs a supplement brand. They ask, "What kind of payment terms do you offer?" You know from the Financials 101 module that their revenue and cash position would likely qualify them for some level of float. How do you respond?',
        options: [
          {
            id: "a",
            label: "A",
            text: '"We offer a Net-1 option and a float option. The exact float length is determined during underwriting based on your financial profile."',
            feedback:
              "Correct. This positions two clear paths without anchoring the prospect on a specific number. The underwriting process determines the right terms, and whatever they offer will feel like the right fit — not a downgrade from what you promised.",
            correct: true,
          },
          {
            id: "b",
            label: "B",
            text: "\"Based on what you've told me, you'd probably qualify for Net-15. We also have Net-30 for larger companies.\"",
            feedback:
              "You're making an underwriting call you're not qualified to make. If the underwriting team offers Net-7, you've set an expectation you can't meet, and you're reselling from a weaker position.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: '"We offer everything from Net-1 to Net-30. The more revenue you have, the longer the terms we can offer."',
            feedback:
              'Listing the full range creates the same anchoring problem. The prospect hears "Net-30" and anything shorter feels like a consolation prize. Revenue alone doesn\'t determine terms — the underwriting team evaluates the full financial profile.',
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: "\"Let's not worry about terms right now — let me learn more about your business first and then we'll figure out what makes sense.\"",
            feedback:
              "Deflecting a direct question damages trust. The prospect asked a reasonable question and deserves a straightforward answer. You can keep it general without avoiding it.",
            correct: false,
          },
        ],
      },
      {
        id: "module-2-discovery-positioning-quiz-q5",
        number: 3,
        phase: "Phase 1.3",
        concept:
          "Separating easy from hard — leading with Net-1 simplicity before float requirements",
        stem: 'You\'re talking to a bootstrapped e-commerce founder who wants float terms. She asks, "What do I need to provide for the application?" You know float requires 24 months of P&L and balance sheets. How do you frame your answer?',
        options: [
          {
            id: "a",
            label: "A",
            text: 'Start with the float requirements first: "For float, we\'ll need 24 months of P&L and balance sheets — just management accounts from your accounting software."',
            feedback:
              "You're leading with the heavier requirement. Even if the documents are not audited, the prospect's first impression is still the hardest part of the process.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: 'Present the choice upfront: "There are two products — Net-1 and float. Net-1 is lighter on documents, float gives you better terms. Which one do you want to apply for?"',
            feedback:
              "Forcing the prospect to choose before you explain what each requires puts the decision before the information. Start with the simplest path first, then layer in the extra float requirements.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: "Offer to send a checklist: \"I'll send over a complete checklist of everything you'll need to have ready after the call.\"",
            feedback:
              "A checklist over email does not lower the commitment in the moment. The prospect asked you on the call; answer in a way that makes the first step feel easy.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: 'Lower the commitment by starting with Net-1: "Application, EIN, and articles of incorporation — about 10 minutes. For float, add 24 months of P&L and balance sheets."',
            feedback:
              'Correct. You lower the commitment by starting with Net-1. The prospect hears "simple" and "10 minutes" first, then understands that float has a heavier document set.',
            correct: true,
          },
        ],
      },
      {
        id: "module-2-discovery-positioning-quiz-q6",
        number: 4,
        phase: "Phase 1.3",
        concept:
          "Saying it before they ask — proactively addressing personal guarantee and credit check concerns",
        stem: "You're presenting the application process to a prospect. You've covered the time commitment and the document requirements. You haven't mentioned personal guarantees or credit checks yet. Where did you go wrong?",
        options: [
          {
            id: "a",
            label: "A",
            text: "Always wait for the prospect to ask. Surprising and delighting them is the way to go.",
            feedback:
              "The script specifically teaches the opposite. Prospects worry about personal guarantees and credit checks whether or not they voice it. If you don't address it proactively, the concern sits unresolved and may surface later as hesitation or ghosting.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "Never bring it up if it is not a concern for them. You can always include it in a follow-up email after the call.",
            feedback:
              "By the time they read the email, they may have already decided not to move forward because the concern went unaddressed on the call. Address it before they have to ask.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: "Next time, proactively state that we require no personal guarantees or credit checks before the prospect has to ask.",
            feedback:
              "Correct. The tactic is to say it before they ask. When the concern is addressed proactively, the prospect's later question becomes a confirmation, not an objection.",
            correct: true,
          },
          {
            id: "d",
            label: "D",
            text: "Mention it only if the prospect has had prior experience with personal guarantees and credit checks.",
            feedback:
              "All prospects have a reference point from other card applications. You can't know whether they'll ask about personal guarantees until they do. By then, the concern has already formed. Proactive is better than reactive.",
            correct: false,
          },
        ],
      },
      {
        id: "module-2-discovery-positioning-quiz-q7",
        number: 5,
        phase: "Phase 1.4",
        concept:
          "Validate, align, answer — and knowing when to pivot to simplicity",
        stem: 'A prospect on a $2M/month in spend deal asks, "Is there a massive contract with personal guarantees and all that stuff?" He founded the company two years ago and is sensitive about putting personal assets at risk. Using the validate, align, answer framework — what\'s the right response?',
        options: [
          {
            id: "a",
            label: "A",
            text: '"No personal guarantee, no credit check. The application takes 10 minutes and it\'s not a contract."',
            feedback:
              "The answer is accurate, but you skipped validation and alignment. The prospect asked because he's worried — a flat \"no\" doesn't acknowledge that concern. He feels answered but not heard.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: '"That\'s a great question. Let me pull up the specifics on our terms and conditions so I can give you an exact answer."',
            feedback:
              "Stalling to look up details signals uncertainty. The answer is straightforward — no personal guarantee, no fees, no interest. You should know this without needing to look it up.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: "\"That's a concern for a lot of founders. Our founders share that priority — no personal guarantee, no fees, no interest. It's a corporate card issued against your business entity.\"",
            feedback:
              'Correct. Validate ("concern for a lot of founders"), align ("our founders share that priority"), then answer ("no personal guarantee, no fees, no interest"). The prospect feels understood before he gets the information.',
            correct: true,
          },
          {
            id: "d",
            label: "D",
            text: '"I completely understand your concern. Why don\'t we start with Net-1 so you can see how the process works before committing to anything bigger?"',
            feedback:
              "Pivoting to Net-1 before answering the question makes it seem like you're avoiding it. The concern is about personal guarantees, not product choice. Answer the concern directly first.",
            correct: false,
          },
        ],
      },
      {
        id: "module-2-discovery-positioning-quiz-q8",
        number: 6,
        phase: "Phase 1.4",
        concept:
          "Redirecting when a prospect refuses to share personal information (structural vs personal)",
        stem: "You're on a call with the founder and they say they're not comfortable providing the personal information for KYC verification. What should you do?",
        options: [
          {
            id: "a",
            label: "A",
            text: "Explain the regulatory requirement in more detail — they need to understand that identity verification is a federal compliance mandate, not a DashFi policy decision.",
            feedback:
              "Explaining more doesn't address the personal discomfort. The right approach is to first address the concern, then redirect to another authorized person who can complete the verification.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "Pivot the deal to Net-1 since they're clearly not comfortable with the process — start with a lighter product and revisit the conversation later.",
            feedback:
              "KYC verification is required for Net-1 too — product choice doesn't solve the problem. The discomfort is personal, not structural. Redirect to another authorized person instead.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: "Accept the refusal and explain that the application cannot move forward without completing KYC verification — offer to reconnect when they're ready to proceed.",
            feedback:
              "KYC is required, but it doesn't have to be this person. Another beneficial owner or authorized person can complete the verification — the deal doesn't have to end here.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: "Explain that identity verification is standard with any card provider, data is deleted if they don't proceed, then ask if another authorized person can complete it.",
            feedback:
              "Correct. First explain the purpose and data handling, then redirect. The concern is personal — this specific person won't share. Redirecting to someone who will keeps the deal moving.",
            correct: true,
          },
        ],
      },
      {
        id: "module-2-discovery-positioning-quiz-q9",
        number: 7,
        phase: "Phase 1.5",
        concept:
          "Reading financial signals — burn exceeds revenue with short runway",
        stem: "During discovery, a DTC fitness brand tells you they raised a significant amount of money eighteen months ago, they're doing moderate annual revenue, and they currently have low reserves in the bank. They want float terms to fund a major Meta campaign. How should you read this?",
        options: [
          {
            id: "a",
            label: "A",
            text: "The fundraise shows investor confidence — flag the deal for the underwriting team with a positive recommendation for float.",
            feedback:
              "The raise happened 18 months ago and most of it is gone. Investor confidence from a year and a half ago doesn't change today's cash position.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "The fundraise plus current revenue shows momentum. Proceed with float positioning and flag the low cash position in the pre-brief.",
            feedback:
              "Revenue and fundraise history create a growth narrative, but the current cash position is what matters. Low reserves with burn exceeding revenue means very short runway. This is a Net-1 conversation, not a flag-and-hope situation.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: "With such low reserves relative to what they raised, this is likely a Net-1 conversation, not a float opportunity. As with any deal, set expectations accordingly.",
            feedback:
              "Correct. When a company has burned through most of its raise and reserves are low relative to monthly burn, it's a Net-1 conversation. The training says: burn greater than revenue with short runway means Net-1.",
            correct: true,
          },
          {
            id: "d",
            label: "D",
            text: "Ask them to hold off and wait until after the Meta campaign generates returns before applying so the financials look stronger.",
            feedback:
              "You're not their financial advisor. The right move is to set expectations based on the current profile and explain how underwriting will evaluate the application.",
            correct: false,
          },
        ],
      },
      {
        id: "module-2-discovery-positioning-quiz-q11",
        number: 8,
        phase: "Phase 1.6",
        concept: "Application vs underwriting as two separate steps",
        stem: 'Your prospect completes the application on Monday afternoon. On Tuesday morning, she emails you: "Great news — I got the approval notification. When do I get my card and start spending?" How should you respond?',
        options: [
          {
            id: "a",
            label: "A",
            text: '"Congratulations! Your card should be active within 24 to 48 hours — I\'ll follow up with your account login details."',
            feedback:
              "Application approval does not mean the card is ready. The underwriting team still needs to determine terms and limits. Telling her the card is coming sets an expectation that hasn't been earned yet.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: "\"Perfect. Since you're approved, I'll send you the onboarding materials and we can schedule your first campaign this week.\"",
            feedback:
              "Approved on the application does not mean approved for the product. Sending onboarding materials before underwriting is complete sets up a potentially embarrassing correction if the terms aren't what the prospect expects.",
            correct: false,
          },
          {
            id: "c",
            label: "C",
            text: '"Nice work! The approval means you\'re set for Net-1. Float terms require a separate underwriting review with additional documentation."',
            feedback:
              "Application approval doesn't assign any terms — not even Net-1. The application verifies the business (KYB and KYC). All terms and limits — including Net-1 — come from the underwriting team in a separate step. This conflation is one of the most common rep errors.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: "\"That's great — application approval means your business is verified. Terms and limits come from a separate underwriting step, and I'll keep you posted.\"",
            feedback:
              "Correct. Application approval means KYB and KYC passed — the business is verified and the deal is ready for underwriting. But terms and limits come from the underwriting team in a separate step. Setting this expectation correctly prevents the prospect from thinking she's further along than she is.",
            correct: true,
          },
        ],
      },
      {
        id: "module-2-discovery-positioning-quiz-q12",
        number: 9,
        phase: "Phase 1.6",
        concept: "Bank connection fallback paths when Plaid doesn't work",
        stem: 'Your prospect is completing the application on a Friday afternoon before a long weekend. She tries to connect her bank through Plaid, but the connection fails. She texts you: "The bank connection isn\'t working." What guidance do you give her?',
        options: [
          {
            id: "a",
            label: "A",
            text: '"Try logging out and back in, or clear your cache and use a different browser. Plaid connections usually work on the second attempt."',
            feedback:
              "Generic tech troubleshooting may or may not help, and it doesn't address the prospect's real question. If Plaid won't connect, walk them through the manual path instead of hoping a retry works.",
            correct: false,
          },
          {
            id: "b",
            label: "B",
            text: '"There\'s a manual option — routing and account numbers for a micro-deposit. If the weekend delays it, upload a bank statement — not a screenshot — instead."',
            feedback:
              "Correct. You walk her through the fallback paths in order: manual connection via micro-deposit first, with the caveat that the long weekend may delay it. Then the third option — uploading an actual bank statement (not a screenshot, because the partner bank requires the real document). The prospect has a clear next step regardless of timing.",
            correct: true,
          },
          {
            id: "c",
            label: "C",
            text: "\"Don't worry about it — just submit the application without the bank connection for now and we'll figure it out on our end.\"",
            feedback:
              "The bank connection is a required part of the application. It can't be skipped. Telling the prospect to submit without it will either cause the application to stall or require her to come back and redo the step.",
            correct: false,
          },
          {
            id: "d",
            label: "D",
            text: '"Plaid issues happen sometimes — it\'s probably a holiday thing. Try again on Tuesday after the long weekend and it should work then."',
            feedback:
              "Telling a motivated prospect to wait four days risks losing momentum. There are two fallback paths available right now. Use them.",
            correct: false,
          },
        ],
      },
    ],
  },
];

export function getUnderwritingQuizByModule(moduleNumber: number) {
  return underwritingQuizzes.find((quiz) => quiz.moduleNumber === moduleNumber);
}

export function getUnderwritingQuizById(quizId: string) {
  return underwritingQuizzes.find((quiz) => quiz.id === quizId);
}
