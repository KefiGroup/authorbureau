// ABBY Next Step selector — pure, no DB access.
// Picks the single next decision to surface, given the author's tier,
// node statuses, skipped node ids, and any gate that just fired.
//
// Sequence rules:
//   Brand:  BP-01 → BP-02 → BP-04 → [Gate1] → BP-05 → BP-06 → [Gate2] → BP-03
//          → [Gate3] → BP-07 → BP-08 → BP-09
//   Build:  BA-10 → BA-11 → BA-12 → BA-13 → BA-14 → BA-15 → BA-16 → BA-17 → BA-18
//   Yield:  [Gate4] → YR-19 → YR-20 → YR-21 → YR-23 → YR-24 → YR-22 → YR-25
//          → YR-26 → YR-27 → YR-28
//
// The selector returns ONE of:
//   { kind: "node",   nodeId, plainDescription, revenueLine }
//   { kind: "gate",   gateId, title, message }
//   { kind: "upgrade", from, to, message }
//   { kind: "complete" }

export type SubscriptionTier = "free" | "brand" | "build" | "yield";

export type NodeStatusSimple = "live" | "in-progress" | "todo";

export interface GateState {
  id: 1 | 2 | 3 | 4;
  ready: boolean;
  alreadyFired: boolean;
}

export interface NextStepInput {
  tier: SubscriptionTier;
  /** Map of node_id → simple status. Missing keys treated as "todo". */
  nodeStatus: Record<string, NodeStatusSimple>;
  /** Node ids the author has explicitly skipped (cross-device persisted). */
  skipped: Set<string>;
  /** Latest gate evaluation result. */
  gates: GateState[];
}

export type NextStep =
  | {
      kind: "node";
      nodeId: string;
      plainDescription: string;
      revenueLine: string;
      abbyWillDo: string;
    }
  | {
      kind: "gate";
      gateId: 1 | 2 | 3 | 4;
      title: string;
      message: string;
    }
  | {
      kind: "upgrade";
      from: "brand" | "build";
      to: "build" | "yield";
      message: string;
    }
  | { kind: "complete" };

const BRAND_SEQUENCE: Array<string | "GATE1" | "GATE2" | "GATE3"> = [
  "BP-01", "BP-02", "BP-04", "GATE1",
  "BP-05", "BP-06", "GATE2",
  "BP-03", "GATE3",
  "BP-07", "BP-08", "BP-09",
];

const BUILD_SEQUENCE: string[] = [
  "BA-10", "BA-11", "BA-12", "BA-13", "BA-14", "BA-15", "BA-16", "BA-17", "BA-18",
];

const YIELD_SEQUENCE: Array<string | "GATE4"> = [
  "GATE4",
  "YR-19", "YR-20", "YR-21", "YR-23", "YR-24", "YR-22", "YR-25", "YR-26", "YR-27", "YR-28",
];

interface NodeMeta {
  plain: string;
  abby: string;
  revenue: string;
}

const NODE_COPY: Record<string, NodeMeta> = {
  "BP-01": { plain: "Set up your welcome email sequence.", abby: "ABBY will draft 5 emails. You only approve.", revenue: "Foundation for every revenue stream." },
  "BP-02": { plain: "Choose your lead magnet.", abby: "ABBY will generate 3 options. You pick one.", revenue: "Average +120 leads/month once live." },
  "BP-04": { plain: "Review your author microsite.", abby: "ABBY pre-fills it from your book. You review.", revenue: "Your home base for every funnel." },
  "BP-05": { plain: "Create your signature webinar.", abby: "ABBY drafts the deck and registration page.", revenue: "Webinars convert at 5–15% to paid." },
  "BP-06": { plain: "Publish your companion workbook.", abby: "ABBY builds it from your book chapters.", revenue: "$8–$20K/yr passive income on average." },
  "BP-03": { plain: "Turn on social media campaign.", abby: "ABBY schedules 4 posts/week from your products.", revenue: "Multiplies leads from BP-01 and BP-02." },
  "BP-07": { plain: "Bundle a home-study course.", abby: "ABBY packages your workbook + audio + video.", revenue: "$149–$497 price point." },
  "BP-08": { plain: "Launch a special edition.", abby: "ABBY designs a collector's edition campaign.", revenue: "Premium pricing, gift-giving moments." },
  "BP-09": { plain: "Plan a book sales event.", abby: "ABBY scripts your launch + signing event.", revenue: "Triggers Amazon ranking spikes." },
  "BA-10": { plain: "Build your online course.", abby: "ABBY drafts modules + sales page.", revenue: "$497–$1,997 price point." },
  "BA-11": { plain: "Produce your audiobook.", abby: "ABBY narrates with ElevenLabs and distributes.", revenue: "Reaches 30%+ of book buyers." },
  "BA-12": { plain: "Open a membership.", abby: "ABBY drafts the offer + monthly content plan.", revenue: "$29–$99/mo recurring revenue." },
  "BA-13": { plain: "Launch group coaching.", abby: "ABBY drafts curriculum + sales page.", revenue: "$1K–$5K per cohort seat." },
  "BA-14": { plain: "Pitch yourself for podcasts.", abby: "ABBY writes 10 personalised pitches.", revenue: "Each booked show ≈ 50–200 new leads." },
  "BA-15": { plain: "Set up media & PR.", abby: "ABBY drafts your press kit + outreach list.", revenue: "Authority + speaking opportunities." },
  "BA-16": { plain: "Recruit affiliates.", abby: "ABBY builds the affiliate kit + portal.", revenue: "20–50% revenue lift on existing offers." },
  "BA-17": { plain: "Create product bundles.", abby: "ABBY designs 2–3 bundle tiers.", revenue: "20–35% AOV lift." },
  "BA-18": { plain: "Open JV partnerships.", abby: "ABBY drafts the JV proposal pack.", revenue: "Top-line lever — partner audience access." },
  "YR-19": { plain: "Open 1-on-1 coaching.", abby: "ABBY builds the application funnel.", revenue: "$3K–$10K per client." },
  "YR-20": { plain: "Position big-ticket consulting.", abby: "ABBY drafts the consulting offer + page.", revenue: "$15K–$75K per engagement." },
  "YR-21": { plain: "Build your speaking offer.", abby: "ABBY drafts your speaker one-sheet.", revenue: "$5K–$25K per keynote." },
  "YR-22": { plain: "Package corporate training.", abby: "ABBY builds the curriculum + proposal deck.", revenue: "$10K–$50K per engagement." },
  "YR-23": { plain: "Launch a mastermind.", abby: "ABBY designs the cohort + sales page.", revenue: "$10K–$30K per seat." },
  "YR-24": { plain: "Plan a retreat.", abby: "ABBY drafts venue brief + sales page.", revenue: "$3K–$15K per seat." },
  "YR-25": { plain: "Open certification.", abby: "ABBY designs the certification curriculum.", revenue: "Recurring licensing revenue." },
  "YR-26": { plain: "Plan a conference.", abby: "ABBY drafts agenda + sponsor kit.", revenue: "Sponsorship-funded events." },
  "YR-27": { plain: "Open fundraising.", abby: "ABBY drafts your case + donor kit.", revenue: "Mission-driven capital." },
  "YR-28": { plain: "Recruit sponsors.", abby: "ABBY builds the sponsor proposal pack.", revenue: "$5K–$50K per sponsor." },
};

function status(input: NextStepInput, id: string): NodeStatusSimple {
  return input.nodeStatus[id] ?? "todo";
}

function isComplete(input: NextStepInput, id: string): boolean {
  return status(input, id) === "live";
}

function nextNodeIn(seq: Array<string | string>, input: NextStepInput): string | null {
  for (const id of seq) {
    if (id.startsWith("GATE")) continue;
    if (input.skipped.has(id)) continue;
    if (!isComplete(input, id)) return id;
  }
  return null;
}

export function selectNextStep(input: NextStepInput): NextStep {
  // 1. Any gate just fired (ready & not already fired before this evaluation
  //    pass) → celebrate it. The hook decides "fired now" by passing
  //    alreadyFired=false for gates the engine just reported as fired.
  const justFired = input.gates.find((g) => g.ready && !g.alreadyFired);
  if (justFired) {
    return {
      kind: "gate",
      gateId: justFired.id,
      title: GATE_TITLES[justFired.id],
      message: GATE_MESSAGES[justFired.id],
    };
  }

  // 2. Walk the tier-filtered Brand → Build → Yield sequences.
  const next = nextNodeIn(BRAND_SEQUENCE as string[], input);
  if (next) return nodeStep(next);

  if (input.tier === "free" || input.tier === "brand") {
    return {
      kind: "upgrade",
      from: "brand",
      to: "build",
      message:
        "Brand phase complete 🎉 You're leaving roughly $44K/yr on the table by not building products. Upgrade to Build to unlock the next 9 nodes — courses, audiobook, coaching, podcast, and more.",
    };
  }

  const nextBuild = nextNodeIn(BUILD_SEQUENCE, input);
  if (nextBuild) return nodeStep(nextBuild);

  if (input.tier === "build") {
    return {
      kind: "upgrade",
      from: "build",
      to: "yield",
      message:
        "Build phase complete 🎉 Roughly $158K/yr in high-ticket revenue is still locked. Upgrade to Full Platform to unlock Yield — consulting, keynotes, masterminds, certification, and more.",
    };
  }

  // Yield tier: gate 4 must be ready before we suggest YR work.
  const gate4 = input.gates.find((g) => g.id === 4);
  if (!gate4?.ready) {
    return {
      kind: "node",
      nodeId: "BA-14",
      plainDescription: "Build hot leads first — pitch yourself for podcasts.",
      abbyWillDo: "ABBY won't push high-ticket offers to a cold audience. Get to 5 hot leads (score ≥ 61) by warming up your CRM.",
      revenueLine: "Yield unlocks at 5+ hot leads.",
    };
  }

  const nextYield = nextNodeIn(YIELD_SEQUENCE as string[], input);
  if (nextYield) return nodeStep(nextYield);

  return { kind: "complete" };
}

function nodeStep(nodeId: string): NextStep {
  const meta = NODE_COPY[nodeId] ?? {
    plain: `Build ${nodeId}.`,
    abby: "ABBY will draft the content. You approve.",
    revenue: "",
  };
  return {
    kind: "node",
    nodeId,
    plainDescription: meta.plain,
    abbyWillDo: meta.abby,
    revenueLine: meta.revenue,
  };
}

const GATE_TITLES: Record<1 | 2 | 3 | 4, string> = {
  1: "🎉 Your opt-in funnel is live",
  2: "💰 Sales campaign activated",
  3: "📱 Social campaign live",
  4: "🚀 Yield revenue campaign active",
};

const GATE_MESSAGES: Record<1 | 2 | 3 | 4, string> = {
  1: "ABBY just published your lead-magnet funnel and switched on the welcome email sequence. Forecast: +30–120 new leads in the next 30 days.",
  2: "Your workbook is live and the sales funnel is on. Forecast: $400–$1,800 in the first 30 days.",
  3: "ABBY is now scheduling 4 posts per week. Forecast: 2–4× lead-flow lift in 30 days.",
  4: "ABBY just emailed your hot leads about your Yield offer. Forecast: 1–3 high-ticket conversions in the next 14 days.",
};
