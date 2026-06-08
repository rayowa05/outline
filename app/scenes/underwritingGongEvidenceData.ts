export type UnderwritingGongEvidenceRange = {
  startTimestamp: string;
  endTimestamp: string;
  approvedText: string;
  mediaSrc?: string;
};

export type UnderwritingGongEvidence = {
  label: string;
  callId: string;
  speaker: string;
  topic?: string;
  prime: string;
  approvedText: string;
  displayMode?: "talkTrack" | "video";
  status: "approved";
  caveat: string;
  lessonStart?: number;
  lessonEnd?: number;
  autoMediaSrc?: string;
  startTimestamp?: string;
  endTimestamp?: string;
  mediaSrc?: string;
  ranges?: UnderwritingGongEvidenceRange[];
};

export type UnderwritingGongNarrationSkip = {
  start: number;
  end: number;
  reason: string;
};

export const underwritingGongNarrationSkipsByLesson: Record<
  string,
  UnderwritingGongNarrationSkip[]
> = {
  "2-1": [
    {
      start: 175.818,
      end: 201,
      reason:
        "Disqualified Kurt Bell MoonBrew Gong marker; Tactic 2 keeps only Tim Jonas before Cameron.",
    },
  ],
  "2-2": [],
  "2-3": [
    {
      start: 259,
      end: 267.415,
      reason:
        "Remove the raw Cameron Healthycell Gong marker while preserving the quote setup that resumes at `that is because`.",
    },
    {
      start: 289.321,
      end: 291,
      reason:
        "Remove the stray `Two words` narration fragment after Cameron's confirmation clip.",
    },
  ],
};

export const underwritingGongEvidenceBySection: Record<
  string,
  UnderwritingGongEvidence[]
> = {
  "2-1:section-1-tactic-1": [
    {
      label: "Heather performance-based framing",
      callId: "2581306818756135749",
      speaker: "Heather Wilming",
      topic: "Performance-based underwriting",
      prime:
        "Heather names the underwriting model, ties it to growth, and makes limits feel scalable.",
      lessonStart: 45.418,
      lessonEnd: 69.287,
      startTimestamp: "3:15.8",
      endTimestamp: "3:42.6",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l1-s2-heather-performance-audio.mp3",
      approvedText:
        "That said a couple of different features with our card. I know I mentioned corporate liability. We do cash based or performance based underwriting, meaning we can scale with you when you are in your busy seasons or as you grow, because ultimately we give you access to a quarter of what's in your bank account on a daily basis.",
      displayMode: "talkTrack",
      status: "approved",
      caveat: "Positioning technique only.",
    },
    {
      label: "Nick performance-based framing",
      callId: "9201381074804595595",
      speaker: "Nick Erdman",
      topic: "Revenue and bank balance",
      prime:
        "A second phrasing reinforces why business performance changes the limit conversation.",
      lessonStart: 107.413,
      lessonEnd: 131.376,
      startTimestamp: "43:28.1",
      endTimestamp: "43:47.4",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l1-s2-nick-performance.mp4",
      approvedText:
        "We underwrite a lot differently too. It doesn't sound like you guys are running into a limits issue, but we do what we call performance based underwriting where we're looking at your quite frankly just your revenue and bank balance and we associate, you know, that enables us to get you guys limits that are five to 10 X higher than the traditional card companies.",
      status: "approved",
      caveat: "Positioning technique only.",
    },
  ],
  "2-1:section-2": [
    {
      label: "Tim business health / no PG / no FICO",
      callId: "8926940788782277265",
      speaker: "Tim Jonas",
      topic: "Company health, not personal credit",
      prime:
        "Tim differentiates Dash.fi by saying underwriting is based on the business, not a founder's personal credit.",
      lessonStart: 160.261,
      lessonEnd: 198.713,
      startTimestamp: "13:59.5",
      endTimestamp: "14:12.3",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l1-s4-tim-business-no-pg-fico.mp4",
      approvedText:
        "And then from there that's it, we just do underwriting strictly based off like the business, no personal guarantee, no FICO score, anything like that.",
      status: "approved",
      caveat:
        "Positioning technique only. Tim intentionally replaces the disqualified Kurt Bell MoonBrew marker in this tactic.",
    },
  ],
  "2-1:section-3": [
    {
      label: "Cameron limits / no UCC / no PG",
      callId: "8366932099231919914",
      speaker: "Cameron Baker",
      topic: "No UCC, no personal guarantee",
      prime: "Cameron turns underwriting differentiation into plain language.",
      lessonStart: 201,
      lessonEnd: 215.385,
      startTimestamp: "15:09.4",
      endTimestamp: "15:50.6",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l1-s4-cameron-limits-final.mp4",
      ranges: [
        {
          startTimestamp: "15:09.4",
          endTimestamp: "15:32.1",
          approvedText:
            "What, how do you determine limits? Yeah. So, limits are quite easy. I mean, it's in the application. It'll ask you to link your underwriting bank account basically just for us to have visibility into your cash standing.",
        },
        {
          startTimestamp: "15:45.7",
          endTimestamp: "15:50.6",
          approvedText:
            "We don't require any UCCs or liens on the business or even personal guarantees.",
        },
      ],
      approvedText:
        "What, how do you determine limits? Yeah. So, limits are quite easy. I mean, it's in the application. It'll ask you to link your underwriting bank account basically just for us to have visibility into your cash standing. We don't require any UCCs or liens on the business or even personal guarantees.",
      status: "approved",
      caveat: "Closed-won proof where used for Healthycell.",
    },
  ],
  "2-2:section-3": [
    {
      label: "Cameron profitability ask",
      callId: "5373682642290921255",
      speaker: "Cameron Baker",
      topic: "Ask profitability as fit",
      prime:
        "Listen for how Cameron moves from product fit into profitability without making it feel like an interrogation.",
      lessonStart: 133.377,
      lessonEnd: 153.346,
      startTimestamp: "11:32.7",
      endTimestamp: "11:57.7",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l2-s3-cameron-profitability.mp4",
      approvedText:
        "It's more optimized for businesses that are massively in their profitability, their cash conversion cycles in check, and overall, they're just optimizing specifically for cashback. So, there's two different sides of the coin here. Got it. Yeah. Where do you guys fall with profitability? What do you mean? Are you guys profitable today? Oh, yeah. Okay. Got it. Cool.",
      status: "approved",
      caveat: "Closed-won proof.",
    },
  ],
  "2-2:section-4": [
    {
      label: "Ciaran profitability follow-up",
      callId: "8360920588809456671",
      speaker: "Ciaran Lynch",
      topic: "Lower the commitment",
      prime:
        "Ciaran narrows a vague profitability answer into a more useful follow-up.",
      lessonStart: 204.43,
      lessonEnd: 223.749,
      startTimestamp: "3:37.0",
      endTimestamp: "5:43.0",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l2-s4-ciaran-profitability.mp4",
      approvedText:
        "OK. And you generally don't max that out on a month by month basis or you do max out that 250? We have not maxed out our meta line. I think the meta line is 400,000. OK. So your line is 400 and you're spending 250? Now, contrary, our Amex went from unlimited and they did put a cap on us of 200 several months ago. So that one does cap out. And so we got to pay it down mid month to open up some availability because we use Amex for a lot of things as you can imagine. Yeah, absolutely. And did they give any particular reasoning around capping you guys at the 200? Well, I mean, we were a startup not long ago. I don't consider us a startup anymore. They require quarterly financials, and we were not profitable until last quarter for the first time. I think they were getting a little nervous and I think a lot of credit card companies are tightening their belts a little bit. Yeah, based on our financials? OK. Makes sense. And in relation then to the profitability, was that like one month profitability or are you guys consistently profitable month on month now? Where does it move with the seasonality of the business?",
      status: "approved",
      caveat: "Technique example only; do not present as success proof.",
    },
  ],
  "2-3:section-2": [
    {
      label: "Andrew / Matthew document exchange",
      callId: "1466287213352583441",
      speaker: "Andrew Murphy / Matthew Krick",
      topic: "Separate Net-1 from float documents",
      prime:
        "This source range supports the play-by-play on separating Net-1 from deeper float documents.",
      lessonStart: 24.8,
      lessonEnd: 62.323,
      startTimestamp: "21:40.3",
      endTimestamp: "24:18.4",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l3-s2-andrew-matthew-documents.mp4",
      approvedText:
        "We'd love to map out next steps if you like. We typically have a signup link where you would connect your bank either via Plaid or micro deposit, fill out entity details, and do KYC verification. We don't do hard credit pulls or credit checks. For longer repayment terms like Net-7 or Net-15, we do require 24 months of P&L and balance sheet in monthly Excel format. If you just want Net-1, we don't require financials. We can always start with Net-1, detail what we need in the email, and if you're able to submit by tomorrow, I could probably have limits underwritten Thursday and an onboarding call Friday.",
      status: "approved",
      caveat: "Technique example; approved as one large source exchange.",
    },
  ],
  "2-3:section-3": [
    {
      label: "Tim Net-1 simple path",
      callId: "2837304471949473982",
      speaker: "Tim Jonas",
      topic: "Net-1 feels simple",
      prime:
        "Tim makes the first step feel small, specific, and easy to complete.",
      lessonStart: 130.85,
      lessonEnd: 153,
      startTimestamp: "8:24.5",
      endTimestamp: "8:40.6",
      mediaSrc: "/training/underwriting/gong-clips/m2l3-s3-tim-net1-simple.mp4",
      approvedText:
        "What would we need to get going? Yeah. So for Net-1, super simple, just need you to fill out the application. Takes five, 10 minutes and then email me your EIN document and articles of incorporation and that's literally it for Net-1.",
      status: "approved",
      caveat: "Closed-won proof.",
    },
    {
      label: "Dave application not a contract",
      callId: "1362291467292119481",
      speaker: "Dave Beddingfield",
      topic: "Application, not a contract",
      prime:
        "Dave lowers commitment risk by clarifying the application is not a contract.",
      lessonStart: 159.15,
      lessonEnd: 173.65,
      startTimestamp: "25:30.4",
      endTimestamp: "26:23.5",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l3-s3-dave-application-final.mp4",
      approvedText:
        "If you can knock out the application, it takes 10 minutes. It's not a legal contract or binding you to any type of spend. There's no credit check, there's no pull. It really just connects to Plaid through the bank account. Then we see how much funds are in the operating account. Then we can say, hey Glenn, we're able to give you 100K a day, 200K a day, so that's all it really does, but that will be able to determine where we're gonna sit.",
      status: "approved",
      caveat: "Technique example; custom-stage caveat.",
    },
  ],
  "2-3:section-4": [
    {
      label: "Andrew Net-1 no financials",
      callId: "6460699201974536354",
      speaker: "Andrew Murphy",
      topic: "Net-1 does not require financials",
      prime:
        "Andrew separates the Net-1 path from the extended-term financial packet.",
      lessonStart: 198,
      lessonEnd: 209.1,
      startTimestamp: "26:44.6",
      endTimestamp: "27:25.3",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l3-s4-andrew-net1-no-financials.mp4",
      approvedText:
        "If you're able to get that done, that's really all we need. We don't require financials for the Net-1 product. If you're open to sharing 24 months of P&L and balance sheets, it will just help with the underwriting to make it smooth. Typically we need a full day to underwrite and then usually we can do an onboarding call the following business day.",
      status: "approved",
      caveat: "Pipeline monitor.",
    },
  ],
  "2-3:section-5": [
    {
      label: "Cameron proactive no UCC / no PG",
      callId: "8366932099231919914",
      speaker: "Cameron Baker / prospect confirmation",
      topic: "Confirm no PG and no UCC",
      prime: "Cameron handles the PG/UCC concern before it becomes a blocker.",
      lessonStart: 278.65,
      lessonEnd: 291.321,
      startTimestamp: "27:20.9",
      endTimestamp: "27:28.9",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l3-s5-cameron-no-pg-confirmation.mp4",
      approvedText:
        "So, no personal guarantees and no UCC? Yeah. No personal guarantee. No UCC.",
      status: "approved",
      caveat: "Closed-won proof where used for Healthycell.",
    },
  ],
  "2-4:section-3": [
    {
      label: "Andrew / GovPlus validate-align-answer",
      callId: "6642923582306595449",
      speaker: "Andrew Murphy / Guy Lelouch",
      topic: "Validate, align, answer",
      prime:
        "Listen to Guy name the liability concern before Andrew answers it.",
      lessonStart: 28.931,
      lessonEnd: 42.677,
      startTimestamp: "10:58.2",
      endTimestamp: "11:05.2",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l4-s2-andrew-govplus-part-1.mp4",
      approvedText:
        "So what does it take to sign up? Is it like a massive contract with personal guarantee and all that stuff? What's the liability for me to sign up for that?",
      status: "approved",
      caveat: "Pipeline monitor.",
    },
  ],
  "2-4:section-4": [
    {
      label: "Andrew / GovPlus validate-align-answer",
      callId: "6642923582306595449",
      speaker: "Andrew Murphy",
      topic: "Validate, align, answer",
      prime:
        "Andrew validates the founder concern, aligns to the business pain point, then gives the direct no-PG answer.",
      lessonStart: 55.081,
      lessonEnd: 73.095,
      startTimestamp: "11:08.7",
      endTimestamp: "11:49.2",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l4-s2-andrew-govplus-part-2.mp4",
      approvedText:
        "Yeah. That's obviously a concern for a lot of founders, that a lot of their risk for these capital programs is tied up in personal liability. That's what myself, Mike and our founders are very aligned on. The pain point we're looking to solve is around digital advertising, stability of payments, and credit limits offered against the business. So there's no personal guarantee. We don't charge interest and it really is a corporate card issued against your LLC or C corp.",
      status: "approved",
      caveat: "Pipeline monitor.",
    },
  ],
  "2-4:section-7": [
    {
      label: "Kurt no PG / no credit check",
      callId: "5316951652869483732",
      speaker: "Kurt Bell",
      topic: "No PG, no credit check",
      prime:
        "Kurt gives a direct answer and pivots back to a simple next step.",
      lessonStart: 94.875,
      lessonEnd: 125.897,
      startTimestamp: "21:15.9",
      endTimestamp: "21:48.7",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l4-s3-kurt-no-pg-credit-check.mp4",
      approvedText:
        "Do you need to run a credit check? Do you need to do anything like that to get the Dash.fi card? Great question. No personal guarantee, no credit check, which is a thing founders appreciate as well. Application is super lightweight, probably takes you 10, 15 minutes, just KYC verification for beneficial owners, controlling officer, connected bank account. So, very simple.",
      status: "approved",
      caveat: "Technique example only; closed-lost caveat.",
    },
    {
      label: "Tim business underwriting",
      callId: "1559269850314078756",
      speaker: "Tim Jonas",
      topic: "Business underwriting",
      prime:
        "Tim keeps the answer focused on business underwriting, not personal credit.",
      lessonStart: 128,
      lessonEnd: 156.315,
      startTimestamp: "14:32.7",
      endTimestamp: "14:59.1",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l4-s3-tim-business-underwriting-final.mp4",
      approvedText:
        "As far as how credit checks and that sort of thing work? Yeah. So we underwrite completely on the business. No personal guarantee or personal credit check for you basically. And then just send me your EIN document and articles of organization and that's all we need for Net-1.",
      status: "approved",
      caveat: "Technique example; no deal match.",
    },
  ],
  "2-4:section-9": [
    {
      label: "Cameron / Shop LC KYC redirect",
      callId: "382876495130782244",
      speaker: "Cameron Baker / Vijay Sankar",
      topic: "Redirect identity-verification concerns",
      prime:
        "Listen for the wall Cameron is running into before he changes the next step.",
      displayMode: "talkTrack",
      lessonStart: 193.2,
      lessonEnd: 208.885,
      startTimestamp: "22:35.9",
      endTimestamp: "23:30.3",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l4-s5-cameron-shoplc-part-1.mp4",
      approvedText:
        "Vijay: I don't want to share my information because I don't know why my personal information is being asked here.\n\nCameron: This is just for identity verification. If you don't move forward with us, your account is deleted and we don't hold any of your data. We're not going to do any credit checks on you.\n\nVijay: Still, I don't want to share my information.",
      status: "approved",
      caveat: "Closed-won proof.",
    },
    {
      label: "Cameron / Shop LC KYC redirect",
      callId: "382876495130782244",
      speaker: "Cameron Baker / Vijay Sankar",
      topic: "Redirect identity-verification concerns",
      prime:
        "Cameron stops repeating the same explanation and redirects to an authorized identity-verification path.",
      displayMode: "talkTrack",
      lessonStart: 220.216,
      lessonEnd: 227.6,
      startTimestamp: "23:33.3",
      endTimestamp: "24:26.0",
      mediaSrc:
        "/training/underwriting/gong-clips/m2l4-s5-cameron-shoplc-part-2.mp4",
      approvedText:
        "Cameron: Is there maybe a business owner that you'd prefer to do identity verification with?\n\nVijay: I can check what information we provided for another credit card and I can fill in later. Let me check with my team and get back to you via email to see if this is required or not.",
      status: "approved",
      caveat: "Closed-won proof.",
    },
  ],
};
