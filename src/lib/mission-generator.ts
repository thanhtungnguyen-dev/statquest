import type {
  DailyMission,
  GoalReferenceFile,
  LearnerMood,
  LearningGoal,
  LearningTopic,
  LocalProfile,
  MissionAdjustment,
  MissionDifficulty,
  MissionKind,
  MissionPace,
  MissionSourceReference,
  MissionWorkload,
  StatQuestState,
  WeeklyReview,
} from "@/lib/types";
import { effectiveMood } from "./progress.ts";
import {
  cognitiveDifficultyForTarget,
  selectNextTargetForGoal,
  type AdaptiveTarget,
} from "./adaptive-learning.ts";
import { missionKindForTopic } from "./learning-map.ts";

export type LearnerContext = Pick<
  LocalProfile,
  "birthYear" | "learningStage" | "careerInterest"
>;

type MissionTemplate = {
  title: string;
  objective: (goal: LearningGoal) => string;
  steps: Array<{ title: string; instruction: string }>;
  evidenceRequirements: string[];
};

export type MissionTimePlan = {
  xp: number;
  workload: MissionWorkload;
};

type MissionBuildContext = {
  id?: string;
  review?: WeeklyReview | null;
  mood?: LearnerMood;
  target?: AdaptiveTarget | null;
  excludedLearningTargetKeys?: string[];
  allowCompletedTarget?: boolean;
};

type GroundedMissionContent = Pick<
  DailyMission,
  | "title"
  | "objective"
  | "evidenceRequirements"
  | "completionCriteria"
  | "sourceReferences"
> & {
  steps: MissionTemplate["steps"];
  explicitRequirement: boolean;
  learningTargetKey: string | null;
};

export class MissionGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissionGenerationError";
  }
}

const WEB_TEMPLATE: MissionTemplate = {
  title: "Finish one focused programming result",
  objective: (goal) =>
    `Choose one current weakness or unfinished result in ${goal.subject} and move it toward: ${goal.desiredOutcome}`,
  steps: [
    {
      title: "Choose the unfinished result",
      instruction:
        "Choose one current weakness or unfinished result. Define the smallest observable outcome you can finish in this session and the checks that will prove it works.",
    },
    {
      title: "Implement or practice",
      instruction:
        "Implement or practice the chosen result. Keep the scope focused, run it as you work, and record decisions or errors instead of adding unrelated features.",
    },
    {
      title: "Test, debug, and verify",
      instruction:
        "Test the result with relevant normal and edge cases, debug failures, review the mistakes, and record the final verified behavior.",
    },
  ],
  evidenceRequirements: [
    "A short build log naming the feature and files changed",
    "Relevant test results and corrections",
    "One screenshot, deployed URL, or commit reference showing the working result",
  ],
};

const PROGRAMMING_TEMPLATE: MissionTemplate = {
  title: "Practice one current programming weakness",
  objective: (goal) =>
    `Complete one focused ${goal.subject} problem that develops the ability to: ${goal.desiredOutcome}`,
  steps: [
    {
      title: "Model the problem",
      instruction:
        "Choose one current weakness or unfinished result. Write the expected input, output, or observable behavior and the checks that will verify it.",
    },
    {
      title: "Implement the algorithm",
      instruction:
        "Translate the plain-language solution into small functions. Trace one example by hand, then compile or run the program and correct logic errors before improving style.",
    },
    {
      title: "Test and explain",
      instruction:
        "Run relevant normal and edge cases, debug failures, review the mistakes, and explain why the final result is correct.",
    },
  ],
  evidenceRequirements: [
    "The written input-output specification and plain-language algorithm",
    "Working source code",
    "Three test cases with expected and actual results",
  ],
};

const MATH_TEMPLATE: MissionTemplate = {
  title: "Strengthen one current course concept",
  objective: (goal) =>
    `Demonstrate one measurable step toward this ${goal.subject} outcome: ${goal.desiredOutcome}`,
  steps: [
    {
      title: "Recall the core idea",
      instruction:
        "Review recent or today's material, then choose the weakest current concept. Recall its definitions, conditions, or method without notes and correct what is missing.",
    },
    {
      title: "Solve progressively harder problems",
      instruction:
        "Practice relevant material for the chosen concept. Show the reasoning, identify the method used, and keep the work appropriate to the current course rather than inventing easier content.",
    },
    {
      title: "Correct and reproduce",
      instruction:
        "Check the work, classify each error, correct it, and reproduce the key reasoning without notes.",
    },
  ],
  evidenceRequirements: [
    "Definitions and conditions reproduced from memory",
    "Completed relevant practice with corrections",
    "A clean retrieval attempt without notes",
  ],
};

const GENERAL_TEMPLATE: MissionTemplate = {
  title: "Complete one learn-apply-verify cycle",
  objective: (goal) =>
    `Create one verifiable result in ${goal.subject} that moves you toward: ${goal.desiredOutcome}`,
  steps: [
    {
      title: "Define today's result",
      instruction:
        "Choose one result small enough to finish today. Write what will exist when it is complete, what knowledge it requires, and three checks that will prove it works.",
    },
    {
      title: "Learn only what the result requires",
      instruction:
        "Study the minimum necessary material, then immediately apply it to produce the result. Keep a short list of mistakes and decisions instead of copying the source.",
    },
    {
      title: "Verify and retrieve",
      instruction:
        "Use the three checks, repair failures, and explain the result from memory. Record the output and the next unresolved obstacle.",
    },
  ],
  evidenceRequirements: [
    "A concrete finished output",
    "Three verification results",
    "A short explanation written without notes",
  ],
};

const LANGUAGE_TEMPLATE: MissionTemplate = {
  title: "Retrieve and apply useful language",
  objective: (goal) =>
    `Build accurate recall and real use in ${goal.subject} toward: ${goal.desiredOutcome}`,
  steps: [
    {
      title: "Retrieve useful vocabulary",
      instruction:
        "Choose vocabulary from your current material or recent weak areas, retrieve it without notes, then check meaning and form.",
    },
    {
      title: "Use it in context",
      instruction:
        "Apply the selected language through speaking, listening, or reading practice and produce a concrete response.",
    },
    {
      title: "Correct and retrieve again",
      instruction:
        "Review errors, correct pronunciation, meaning, or structure, then repeat the hardest items without help.",
    },
  ],
  evidenceRequirements: [
    "The vocabulary or language retrieved",
    "A concrete speaking, listening, or reading result",
    "Corrections and a second retrieval attempt",
  ],
};

const CAREER_TEMPLATE: MissionTemplate = {
  title: "Complete one focused career-search cycle",
  objective: (goal) =>
    `Produce one verifiable career result in ${goal.subject} toward: ${goal.desiredOutcome}`,
  steps: [
    {
      title: "Find relevant roles",
      instruction:
        "Choose a focused role type and find current relevant opportunities or representative postings.",
    },
    {
      title: "Inspect requirements and compare fit",
      instruction:
        "Record the repeated requirements, compare them with your current evidence, and identify the most important gap or match.",
    },
    {
      title: "Prepare, apply, or follow up",
      instruction:
        "Take one concrete next action: tailor material, apply, prepare an example, or send a useful follow-up. Verify that the result is ready or sent.",
    },
  ],
  evidenceRequirements: [
    "Relevant roles or requirements inspected",
    "A concise fit comparison",
    "One prepared, submitted, or verified next action",
  ],
};

type MissionDomain =
  | "programming"
  | "math"
  | "language"
  | "career"
  | "general";

function missionDomain(subject: string): MissionDomain {
  const normalized = subject.toLowerCase();
  if (
    /web|full[ -]?stack|next|react|frontend|backend|program|coding|python|javascript|typescript|\bc\b|java|system|software/.test(
      normalized,
    )
  ) {
    return "programming";
  }
  if (
    /math|calculus|algebra|discrete|statistics|logic|proof|geometry|trigonometry/.test(
      normalized,
    )
  ) {
    return "math";
  }
  if (
    /language|english|french|spanish|vocabulary|speaking|listening|reading|writing/.test(
      normalized,
    )
  ) {
    return "language";
  }
  if (
    /career|job|resume|résumé|interview|employment|application/.test(normalized)
  ) {
    return "career";
  }
  return "general";
}

function selectTemplate(subject: string): MissionTemplate {
  const normalized = subject.toLowerCase();

  if (/web|full[ -]?stack|next|react|frontend|backend/.test(normalized)) {
    return WEB_TEMPLATE;
  }

  const domain = missionDomain(subject);
  if (domain === "math") return MATH_TEMPLATE;
  if (domain === "programming") return PROGRAMMING_TEMPLATE;
  if (domain === "language") return LANGUAGE_TEMPLATE;
  if (domain === "career") return CAREER_TEMPLATE;
  return GENERAL_TEMPLATE;
}

function roundToFive(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5);
}

function allocateMinutes(totalMinutes: number, stepCount: number): number[] {
  const weights =
    stepCount === 2 ? [0.78, 0.22] : stepCount === 3 ? [0.25, 0.55, 0.2] : [0.18, 0.47, 0.2, 0.15];
  const minutes = weights.map((weight) => roundToFive(totalMinutes * weight));
  const difference = totalMinutes - minutes.reduce((total, value) => total + value, 0);
  minutes[stepCount - 1] += difference;
  return minutes;
}

export function missionTimePlan(minutesPerDay: number): MissionTimePlan {
  if (minutesPerDay <= 30) {
    return { xp: 10, workload: "easy" };
  }
  if (minutesPerDay < 60) {
    return { xp: 20, workload: "medium" };
  }
  return { xp: 30, workload: "hard" };
}

function workloadSteps(
  steps: MissionTemplate["steps"],
  workload: MissionTimePlan["workload"],
): MissionTemplate["steps"] {
  if (workload === "easy") {
    const preparation = steps[0];
    const execution = steps[1] ?? steps[0];
    const verification = steps[2] ?? steps[steps.length - 1];
    return [
      {
        title: "Prepare and complete one focused result",
        instruction: `${preparation.instruction} Then ${execution.instruction} Keep the scope to one finished result.`,
      },
      {
        ...verification,
        title: "Quick correction and check",
      },
    ];
  }

  if (workload === "medium" && steps.length > 3) {
    return [
      steps[0],
      {
        title: steps[1].title,
        instruction: `${steps[1].instruction} Then ${steps[2].instruction}`,
      },
      steps[steps.length - 1],
    ];
  }

  if (workload === "hard") {
    if (steps.length >= 4) return steps.slice(0, 4);
    return [
      { ...steps[0], title: "Review or learn the needed ideas" },
      { ...steps[1], title: "Complete substantial practice or application" },
      { ...steps[2], title: "Correct mistakes and verify" },
      {
        title: "Retrieve and verify without help",
        instruction:
          "Reproduce the key reasoning, method, or result without notes or hints, then run one final verification and correct any remaining gap.",
      },
    ];
  }

  return steps;
}

function levelGuidance(goal: LearningGoal, domain: MissionDomain): string {
  if (goal.currentLevel === "beginner") {
    const firstExample = {
      programming: "trace one small working example",
      math: "inspect one fully worked example",
      language: "rehearse one accurate model response",
      career: "inspect one strong model response",
      general: "trace one relevant example",
    }[domain];
    return `Break the work into small parts, ${firstExample} before working independently, and use an explicit check after each part.`;
  }
  if (goal.currentLevel === "advanced") {
    return {
      programming:
        "Work independently from retrieval, justify the implementation choice, and test an edge or failure condition.",
      math:
        "Work independently from retrieval, justify each important step, and test a boundary case, counterexample, or alternate method.",
      language:
        "Work without a script, adapt the language to a new context or register, and self-correct for accuracy and clarity.",
      career:
        "Respond independently, support each claim with specific evidence, and handle one realistic follow-up or changed constraint.",
      general:
        "Work independently from retrieval, justify the chosen method, and test one meaningful constraint or alternative.",
    }[domain];
  }
  return "";
}

function learnerContextGuidance(
  goal: LearningGoal,
  domain: MissionDomain,
  learnerContext: LearnerContext | undefined,
  sourceGrounded: boolean,
): string {
  const stageGuidance = {
    elementary:
      "Use concrete language or examples to make each abstract idea visible, and label how each check supports the result.",
    "middle-school":
      "Use concrete examples before abstraction, divide the reasoning into clear parts, and label how each check supports the result.",
    "high-school":
      "Keep any worked example separate from the independent attempt, explain the reasoning, and state how the result was checked.",
    college:
      "State the relevant assumptions or definitions and verify that each important reasoning step satisfies them.",
    professional:
      "Keep execution concise, honor realistic constraints, and record evidence from the final verification.",
    other: "",
  }[learnerContext?.learningStage ?? "other"];

  const normalizedInterest = learnerContext?.careerInterest
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "")
    .slice(0, 80);
  const acceptsContextualExample =
    domain === "career" ||
    (domain === "general" &&
      /communication|presentation|leadership|research|business|project management|design/i.test(
        goal.subject,
      ));
  const careerGuidance =
    !sourceGrounded && normalizedInterest && acceptsContextualExample
      ? `When an application example is useful, use a realistic ${normalizedInterest} context that still fits the goal.`
      : "";

  return [stageGuidance, careerGuidance].filter(Boolean).join(" ");
}

type SourceFactKind = "question" | "topic" | "outcome" | "requirement";

type SourceCandidate = {
  reference: MissionSourceReference;
  kind: SourceFactKind;
  fact: string;
  score: number;
  index: number;
};

const META_OR_CONVERSATIONAL =
  /^(?:can|could|would) you\b|^give me\b|^here (?:is|are)\b|^please (?:explain|summarize|repeat)\b|^thanks?[.!\s]*$|^thank you[.!\s]*$/i;
const GENERIC_SOURCE_WORDS = new Set([
  "again",
  "assignment",
  "course",
  "document",
  "learning",
  "project",
  "study",
  "topic",
]);

function clipExcerpt(value: string, maximum = 190): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;
  const clipped = normalized.slice(0, maximum - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, Math.max(lastSpace, maximum - 24))}…`;
}

function meaningfulSourceWords(value: string): string[] {
  return (
    value
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).filter((word) => word.length >= 4 && !GENERIC_SOURCE_WORDS.has(word));
}

function cleanSupportedFact(value: string): string {
  return value.replace(/^[\s:–—-]+|[\s.;:]+$/g, "").replace(/\s+/g, " ").trim();
}

function semanticKeyPart(value: string): string {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).join("-").slice(0, 160);
}

function concreteTaskKey(candidate: SourceCandidate): string | null {
  if (candidate.kind !== "question" && candidate.kind !== "requirement") {
    return null;
  }
  return `source:${candidate.reference.fileId}:${candidate.kind}:${semanticKeyPart(candidate.fact)}`;
}

function candidateFromExcerpt(
  reference: MissionSourceReference,
  subjectWords: string[],
  index: number,
): SourceCandidate | null {
  const excerpt = reference.excerpt;
  if (META_OR_CONVERSATIONAL.test(excerpt)) return null;

  const normalized = excerpt.toLowerCase();
  const subjectOverlap = subjectWords.filter((word) => normalized.includes(word)).length;
  const questionRequirement = excerpt.match(
    /\b(?:complete|answer|solve|attempt|work(?:\s+through)?)\s+(?:questions?|problems?|exercises?)\s+(?:\d+(?:\s*[–—-]\s*\d+)?(?:\s*,\s*\d+)*)/i,
  );
  if (questionRequirement) {
    const taskFact = cleanSupportedFact(
      excerpt.slice(questionRequirement.index ?? 0),
    );
    return {
      reference,
      kind: "question",
      fact: taskFact,
      score: 14 + subjectOverlap - index * 0.001,
      index,
    };
  }

  const topic = excerpt.match(
    /^(?:lecture(?:\s+\d+)?(?:\s+topic)?|topic|unit(?:\s+\d+)?|chapter(?:\s+\d+)?|(?:exam|quiz)\s+topics?)\s*:\s*(.+)$/i,
  );
  if (topic) {
    const fact = cleanSupportedFact(topic[1]);
    if (meaningfulSourceWords(fact).length > 0) {
      return {
        reference,
        kind: "topic",
        fact,
        score: 10 + subjectOverlap - index * 0.001,
        index,
      };
    }
  }

  const outcome = excerpt.match(
    /^(?:learning outcome|course objective|learning objective)\s*:\s*(.+)$/i,
  );
  if (outcome) {
    const fact = cleanSupportedFact(outcome[1]);
    if (meaningfulSourceWords(fact).length >= 2) {
      return {
        reference,
        kind: "outcome",
        fact,
        score: 11 + subjectOverlap - index * 0.001,
        index,
      };
    }
  }

  const requirement = excerpt.match(
    /^(?:assignment|homework|project requirement|assessment requirement|rubric item)(?:\s+\d+)?\s*:\s*(.+)$/i,
  );
  if (requirement) {
    const fact = cleanSupportedFact(requirement[1]);
    if (
      /\b(?:analy[sz]e|build|calculate|complete|create|design|implement|prepare|prove|solve|submit|test|write)\b/i.test(fact) &&
      meaningfulSourceWords(fact).length >= 2
    ) {
      return {
        reference,
        kind: "requirement",
        fact,
        score: 12 + subjectOverlap - index * 0.001,
        index,
      };
    }
  }

  return null;
}

function sourceCandidates(
  files: GoalReferenceFile[],
  subject: string,
): SourceCandidate[] {
  const subjectWords = subject
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4 && !GENERIC_SOURCE_WORDS.has(word));
  const candidates = files.flatMap((file) =>
    file.extractedText
      .split(/\n+|(?<=[.!?])\s+/)
      .map((line) => clipExcerpt(line))
      .filter(
        (line) =>
          line.length >= 24 &&
          line.length <= 190 &&
          !/^\[Page \d+\]$/i.test(line),
      )
      .map((excerpt, index) =>
        candidateFromExcerpt(
          { fileId: file.id, fileName: file.name, excerpt },
          subjectWords,
          index,
        ),
      )
      .filter((candidate): candidate is SourceCandidate => candidate !== null),
  );

  const selected: SourceCandidate[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
    const key = candidate.reference.excerpt.toLowerCase();
    if (seen.has(key)) continue;
    selected.push(candidate);
    seen.add(key);
    if (selected.length === 12) break;
  }
  return selected;
}

export function hasRecognizedSourceContext(
  files: GoalReferenceFile[],
  subject: string,
): boolean {
  return sourceCandidates(
    files.filter((file) => file.status === "ready" && file.extractedText.trim()),
    subject,
  ).length > 0;
}

function groundedMissionContent(
  goal: LearningGoal,
  targetTopic?: LearningTopic,
  excludedLearningTargetKeys: string[] = [],
  allowCompletedTarget = false,
): GroundedMissionContent | null {
  if (goal.referenceFiles.some((file) => file.status === "extracting")) {
    throw new MissionGenerationError(
      "Reference files are still being read. Wait for every file to show Ready before generating the mission.",
    );
  }

  const readyFiles = goal.referenceFiles.filter(
    (file) => file.status === "ready" && file.extractedText.trim(),
  );
  if (readyFiles.length === 0) {
    throw new MissionGenerationError(
      "The connected files do not contain enough readable course detail to build an accurate mission. Replace the failed file or add a clearer syllabus, assignment, lecture note, or practice sheet.",
    );
  }

  const extractedCandidates = sourceCandidates(readyFiles, goal.subject);
  const confirmedReferences = goal.courseDetails
    .filter((detail) => detail.confirmed)
    .map((detail) => detail.sourceReference);
  const confirmedCandidates = goal.courseContextReviewed
    ? extractedCandidates.filter((candidate) =>
        confirmedReferences.some(
          (reference) =>
            reference.fileId === candidate.reference.fileId &&
            reference.excerpt === candidate.reference.excerpt,
        ),
      )
    : extractedCandidates;
  const excluded = new Set(excludedLearningTargetKeys);
  const availableCandidates = allowCompletedTarget
    ? confirmedCandidates
    : confirmedCandidates.filter((candidate) => {
        const key = concreteTaskKey(candidate);
        return key === null || !excluded.has(key);
      });
  if (availableCandidates.length === 0) return null;

  const targetFileIds = new Set(
    targetTopic?.sourceReferences.map((reference) => reference.fileId) ?? [],
  );
  const targetWords = targetTopic
    ? meaningfulSourceWords(targetTopic.title)
    : [];
  const targetedCandidates = availableCandidates.filter(
    (candidate) =>
      targetFileIds.has(candidate.reference.fileId) &&
      (targetWords.length === 0 ||
        targetWords.some((word) =>
          `${candidate.fact} ${candidate.reference.excerpt}`
            .toLocaleLowerCase()
            .includes(word),
        )),
  );
  const candidates = targetedCandidates.length > 0
    ? targetedCandidates
    : availableCandidates;

  const primary = candidates[0];
  const contextualCandidates = candidates.filter(
    (candidate) =>
      candidate.reference.fileId === primary.reference.fileId &&
      Math.abs(candidate.index - primary.index) <= 3,
  );
  const supportedTopic = contextualCandidates.find(
    (candidate) => candidate.kind === "topic",
  );
  const sourceReferences = contextualCandidates
    .slice(0, 3)
    .map((candidate) => candidate.reference);
  const topicSuffix =
    supportedTopic && supportedTopic !== primary
      ? ` on ${supportedTopic.fact}`
      : "";

  if (primary.kind === "question") {
    return {
      title: primary.fact,
      objective:
        `${primary.fact}${topicSuffix}. Produce complete, checked answers that move you toward: ` +
        goal.desiredOutcome,
      steps: [
        {
          title: "Plan the required questions",
          instruction:
            "Read each stated question, identify what it asks, and choose the definition, rule, or method needed before solving.",
        },
        {
          title: "Complete the required work",
          instruction:
            `${primary.fact}${topicSuffix}. Show the reasoning for every answer and mark the rule or method used.`,
        },
        {
          title: "Check and correct every answer",
          instruction:
            "Verify each result, correct errors, and redo the hardest answer from a blank page without copying the first attempt.",
        },
      ],
      evidenceRequirements: [
        "Complete answers for every stated question",
        "Visible reasoning and the rule or method used",
        "Corrections plus a clean second attempt for the hardest answer",
      ],
      completionCriteria: [
        "Every stated question has a complete answer.",
        "Each answer shows enough reasoning to check the method and result.",
        "Errors are corrected and the final answers are verified.",
      ],
      sourceReferences,
      explicitRequirement: true,
      learningTargetKey: concreteTaskKey(primary),
    };
  }

  if (primary.kind === "topic") {
    return {
      title: `Practice ${primary.fact}`,
      objective:
        `Build accurate recall and application of ${primary.fact} toward: ` +
        goal.desiredOutcome,
      steps: [
        {
          title: "Recall the key ideas",
          instruction:
            `Write the core definitions and rules for ${primary.fact} from memory, then check and correct them.`,
        },
        {
          title: "Apply the topic",
          instruction:
            `Complete three progressively harder examples or problems on ${primary.fact}. Show the method used at each step.`,
        },
        {
          title: "Verify and reproduce",
          instruction:
            "Check all three results, classify each error, and reproduce the hardest solution without notes.",
        },
      ],
      evidenceRequirements: [
        "Corrected definitions and rules written from memory",
        "Three worked applications with visible reasoning",
        "A clean second solution to the hardest application",
      ],
      completionCriteria: [
        "The key ideas are stated accurately after correction.",
        "All three applications are completed and checked.",
        "The hardest application is reproduced without notes.",
      ],
      sourceReferences,
      explicitRequirement: false,
      learningTargetKey: null,
    };
  }

  const title =
    primary.kind === "outcome"
      ? "Practice one supported learning outcome"
      : "Complete one supported course requirement";
  return {
    title,
    objective: `${primary.fact}. Produce one checked result that moves you toward: ${goal.desiredOutcome}`,
    steps: [
      {
        title: "Define the required result",
        instruction:
          "Break the stated requirement into a small result and three observable checks that can be completed today.",
      },
      {
        title: "Produce the result",
        instruction: `${primary.fact}. Show the decisions, reasoning, or calculations needed to complete it.`,
      },
      {
        title: "Verify the result",
        instruction:
          "Run the three checks, correct every failure, and record the final result plus one remaining question.",
      },
    ],
    evidenceRequirements: [
      "The completed result required by the mission",
      "Reasoning, decisions, or calculations used to produce it",
      "Three verification checks with corrections",
    ],
    completionCriteria: [
      "The stated requirement is completed without adding unsupported constraints.",
      "The result includes enough reasoning or work to verify it.",
      "All three checks pass after corrections.",
    ],
    sourceReferences,
    explicitRequirement: primary.kind === "requirement",
    learningTargetKey: concreteTaskKey(primary),
  };
}

function obstacleStrategy(obstacle: string): string {
  const normalized = obstacle.toLowerCase();
  if (/confused|stuck/.test(normalized)) {
    return "Use an extra review and checking pass before final verification.";
  }
  if (/forgetting|memory/.test(normalized)) {
    return "Use stronger retrieval from memory before checking notes.";
  }
  if (/solutions?|hints?/.test(normalized) && /early|too soon|quick/.test(normalized)) {
    return "Make an independent attempt before using hints or solutions.";
  }
  if (/slow|overwhelm|time/.test(normalized)) {
    return "Narrow the work to the highest-priority result and finish it first.";
  }
  if (/distract/.test(normalized)) {
    return "Use short, focused blocks with distractions removed.";
  }
  return "";
}

function strategyForMission(
  goal: LearningGoal,
  pace: MissionPace,
  review: WeeklyReview | null | undefined,
  mood: LearnerMood,
): string {
  const strategies: string[] = [];
  if (review?.nextFocus.trim()) {
    strategies.push(
      `Focus this session on ${review.nextFocus.trim()} within ${goal.subject}.`,
    );
  }
  if (review) {
    const knownObstacle = obstacleStrategy(review.obstacle);
    if (knownObstacle) strategies.push(knownObstacle);
  }
  if (pace === "light") {
    strategies.push("Keep the scope narrow and prioritize one finished result.");
  } else if (pace === "stretch") {
    strategies.push("Add a deeper verification pass without changing the planned duration.");
  }
  if (mood === "struggling") {
    strategies.push("Use more reinforcement and correction before moving on.");
  } else if (mood === "tired") {
    strategies.push("Use familiar methods, less novelty, and clear smaller blocks.");
  }
  return strategies.join(" ");
}

function fallbackCognitiveDifficulty(goal: LearningGoal): MissionDifficulty {
  return goal.currentLevel === "beginner"
    ? "easy"
    : goal.currentLevel === "advanced"
      ? "hard"
      : "medium";
}

function contentForMissionKind(
  content: GroundedMissionContent,
  kind: MissionKind,
  topic: LearningTopic | undefined,
  domain: MissionDomain,
): GroundedMissionContent {
  const topicTitle = topic?.title ?? "the selected topic";
  const foundation = content.explicitRequirement
    ? content.objective
    : (content.steps[0]?.instruction ?? content.objective);
  const supportedWork = content.steps[1]?.instruction ?? foundation;
  const checking = content.steps.at(-1)?.instruction ?? supportedWork;
  const language = {
    programming: {
      learnLead: `Build an accurate mental model of how ${topicTitle} behaves.`,
      learnExampleTitle: "Trace a working example",
      learnExample: "Trace a minimal working example from the current material and label the state, input, output, and important control flow.",
      guidedTitle: "Implement a guided first version",
      guided: "Work in explicit implementation stages and run a focused check after each stage.",
      independentCheck: "Run the result, inspect the output, and explain the behavior once without notes.",
      practiceLead: `Strengthen independent implementation and debugging of ${topicTitle}.`,
      retrieveTitle: "Recall the implementation plan",
      retrieve: "Write the implementation and verification plan from memory before looking at support.",
      attemptTitle: "Implement independently",
      attempt: "Build the required result before using hints, copied code, or solutions.",
      correction: "Classify each defect by its cause, then verify the correction with a focused test.",
      retryTitle: "Rebuild the hardest part",
      retry: "Rebuild or debug the hardest part from a clean starting point, then run the relevant check again.",
      reviewLead: `Reconstruct and test ${topicTitle} before looking at notes.`,
      recall: "Reconstruct the important behavior, API, or implementation pattern without notes and mark every uncertain point.",
      testRecall: "Implement or trace the supported work while references remain closed.",
      close: "Close the material and reproduce the corrected implementation or explanation once more, then run one focused test.",
      applyLead: `Use ${topicTitle} in a less familiar implementation context while preserving the required work.`,
      planTitle: "Plan the implementation",
      plan: "Identify the unfamiliar constraint, choose an implementation approach, and justify it before coding.",
      executeTitle: "Build the working result",
      execute: "Complete the supported work as stated and record the important implementation decisions.",
      testTitle: "Test an edge or failure case",
      test: "Test one boundary, invalid input, failure condition, or recovery path that matters to the result.",
      explain: "Explain why the result works, which tradeoff remains, and when this implementation would need to change.",
    },
    math: {
      learnLead: `Build a precise first understanding of ${topicTitle}.`,
      learnExampleTitle: "Work through a mathematical example",
      learnExample: "Use a worked example from the current material, or construct one from the stated topic, and label the definition, rule, or theorem used at each step.",
      guidedTitle: "Solve a guided first problem",
      guided: "Show each reasoning step and check its conditions before continuing.",
      independentCheck: "Verify the result and explain the reasoning once without notes.",
      practiceLead: `Strengthen independent problem solving on ${topicTitle}.`,
      retrieveTitle: "Recall the method and conditions",
      retrieve: "Write the relevant definitions, conditions, and solution method from memory before looking at support.",
      attemptTitle: "Solve independently",
      attempt: "Complete the required problems or proof independently before using hints or solutions.",
      correction: "Identify the exact reasoning error behind each correction, not only the changed answer.",
      retryTitle: "Redo the hardest problem",
      retry: "Redo the hardest problem or proof from a blank page, justify each important step, and verify the conclusion.",
      reviewLead: `Retrieve and verify ${topicTitle} before looking at notes.`,
      recall: "Retrieve the definitions, theorem conditions, or solution method without notes and mark every uncertain point.",
      testRecall: "Solve the supported work exactly as stated while notes remain closed.",
      close: "Close the material and reproduce the corrected reasoning or hardest solution once more without help.",
      applyLead: `Use ${topicTitle} in a less familiar mathematical setting while preserving the required work.`,
      planTitle: "Choose and justify the method",
      plan: "Identify the unfamiliar feature, choose a mathematical method, and justify why its conditions hold before solving.",
      executeTitle: "Solve or prove the result",
      execute: "Complete the supported work as stated and show the important reasoning steps.",
      testTitle: "Test a boundary or counterexample",
      test: "Check one boundary case, counterexample, or alternate method that could confirm or challenge the reasoning.",
      explain: "Explain why the result follows, which condition is essential, and how an alternate method would compare.",
    },
    language: {
      learnLead: `Build accurate understanding and usable recall of ${topicTitle}.`,
      learnExampleTitle: "Study a model use",
      learnExample: "Use one accurate sentence, exchange, or passage from the current material and label the meaning, form, and context of each important part.",
      guidedTitle: "Produce a guided response",
      guided: "Build the response in short stages, checking meaning, form, and pronunciation or clarity after each stage.",
      independentCheck: "Produce the result once without notes, then self-correct for meaning and accuracy.",
      practiceLead: `Strengthen independent language production for ${topicTitle}.`,
      retrieveTitle: "Recall the language pattern",
      retrieve: "Write or say the useful words, forms, and response pattern from memory before looking at support.",
      attemptTitle: "Produce independently",
      attempt: "Complete the required speaking or writing without copying the model or using hints first.",
      correction: "Label each correction by meaning, grammar, vocabulary, pronunciation, or register.",
      retryTitle: "Respond again without a script",
      retry: "Repeat the hardest response from a fresh prompt without copying the first attempt, then self-correct it.",
      reviewLead: `Retrieve and use ${topicTitle} before looking at notes.`,
      recall: "Recall the key words, forms, meanings, or response pattern without notes and mark every uncertain point.",
      testRecall: "Use the supported language task exactly as stated while notes remain closed.",
      close: "Close the material and produce the corrected language once more in a new sentence or response.",
      applyLead: `Use ${topicTitle} in a new speaking, writing, or reading context while preserving the required work.`,
      planTitle: "Plan the message and context",
      plan: "Identify the audience, purpose, and unfamiliar part of the context, then choose suitable language before responding.",
      executeTitle: "Produce the response",
      execute: "Complete the supported work as stated without copying a model and preserve the intended meaning.",
      testTitle: "Check accuracy and register",
      test: "Check meaning, grammar, vocabulary, pronunciation or mechanics, and whether the register fits the new context.",
      explain: "Self-correct the response and explain two language choices that made it accurate and appropriate.",
    },
    career: {
      learnLead: `Build a clear first understanding of how to handle ${topicTitle}.`,
      learnExampleTitle: "Inspect a strong model response",
      learnExample: "Use one realistic model response or scenario from the current material and label the evidence, structure, and audience need it addresses.",
      guidedTitle: "Draft a guided response",
      guided: "Build the response in explicit stages and check its relevance, evidence, and clarity after each stage.",
      independentCheck: "Deliver the response once without notes and check whether every claim has specific support.",
      practiceLead: `Strengthen independent performance for ${topicTitle}.`,
      retrieveTitle: "Recall the response structure",
      retrieve: "Write the response structure and evidence you will use from memory before looking at support.",
      attemptTitle: "Respond independently",
      attempt: "Complete the required response or scenario independently before using prompts or model answers.",
      correction: "Critique each weak point for relevance, evidence, clarity, or delivery, then refine it.",
      retryTitle: "Deliver the response again",
      retry: "Repeat the hardest response from a fresh prompt without copying the first attempt, then assess it against the criteria.",
      reviewLead: `Retrieve and rehearse ${topicTitle} before looking at notes.`,
      recall: "Recall the key criteria, examples, and response structure without notes and mark every uncertain point.",
      testRecall: "Complete the supported response or scenario while notes remain closed.",
      close: "Close the material and deliver the corrected response once more in your own words.",
      applyLead: `Use ${topicTitle} in a new professional scenario while preserving the required work.`,
      planTitle: "Analyze the new scenario",
      plan: "Identify the audience, goal, and changed constraint, then choose a response structure and supporting evidence.",
      executeTitle: "Deliver the response",
      execute: "Complete the supported work as stated and make each important choice specific to the scenario.",
      testTitle: "Handle a realistic follow-up",
      test: "Answer one changed constraint, skeptical follow-up, or audience concern without abandoning the main evidence.",
      explain: "Critique the response for relevance, evidence, clarity, and delivery, then name the most useful refinement.",
    },
    general: {
      learnLead: `Establish an accurate first understanding of ${topicTitle}.`,
      learnExampleTitle: "Inspect a concrete example",
      learnExample: "Use a concrete example from the current material, or construct one from only the stated topic, and label how each part demonstrates the main idea.",
      guidedTitle: "Complete a guided first attempt",
      guided: "Work in explicit stages and check each stage before continuing.",
      independentCheck: "Verify the result and explain it once without notes.",
      practiceLead: `Strengthen independent performance on ${topicTitle}.`,
      retrieveTitle: "Retrieve the method",
      retrieve: "Write the method or decision process from memory before looking at support.",
      attemptTitle: "Make an independent attempt",
      attempt: "Complete the required work independently before using hints or solutions.",
      correction: "Name the cause of each correction instead of only replacing the answer.",
      retryTitle: "Retry the hardest part",
      retry: "Redo the hardest part from a blank starting point without copying the first attempt, then verify the result.",
      reviewLead: `Retrieve and check ${topicTitle} before looking at notes.`,
      recall: "Retrieve the concept, conditions, or method without notes and mark every uncertain point.",
      testRecall: "Use the supported work exactly as stated while notes remain closed.",
      close: "Close the material and reproduce the corrected concept, method, or hardest result once more without help.",
      applyLead: `Use ${topicTitle} in a less familiar context while preserving the required work.`,
      planTitle: "Choose and justify the method",
      plan: "Identify the unfamiliar part of the work, choose a method, and justify why it fits before starting.",
      executeTitle: "Complete the result",
      execute: "Complete the supported work as stated and record the important decisions.",
      testTitle: "Test a meaningful constraint",
      test: "Test one boundary, alternative interpretation, or changed condition that matters to the result.",
      explain: "Explain why the result works, which limitation remains, and when the chosen method would not be appropriate.",
    },
  }[domain];
  const approaches: Record<MissionKind, {
    lead: string;
    steps: MissionTemplate["steps"];
  }> = {
    learn: {
      lead: language.learnLead,
      steps: [
        {
          title: "Define and retrieve the main idea",
          instruction: `${foundation} State the main idea in your own words before checking it.`,
        },
        {
          title: language.learnExampleTitle,
          instruction: language.learnExample,
        },
        {
          title: language.guidedTitle,
          instruction: `${supportedWork} ${language.guided}`,
        },
        {
          title: "Check independently",
          instruction: `${checking} ${language.independentCheck}`,
        },
      ],
    },
    practice: {
      lead: language.practiceLead,
      steps: [
        {
          title: language.retrieveTitle,
          instruction: `${foundation} ${language.retrieve}`,
        },
        {
          title: language.attemptTitle,
          instruction: `${supportedWork} ${language.attempt}`,
        },
        {
          title: "Correct the mistakes",
          instruction: `${checking} ${language.correction}`,
        },
        {
          title: language.retryTitle,
          instruction: language.retry,
        },
      ],
    },
    review: {
      lead: language.reviewLead,
      steps: [
        {
          title: "Begin closed-book",
          instruction: `${foundation} ${language.recall}`,
        },
        {
          title: "Test recall",
          instruction: `${supportedWork} ${language.testRecall}`,
        },
        {
          title: "Check and correct gaps",
          instruction: `${checking} Compare against known material only after the recall attempt, then correct every gap.`,
        },
        {
          title: "Retrieve again",
          instruction: language.close,
        },
      ],
    },
    apply: {
      lead: language.applyLead,
      steps: [
        {
          title: language.planTitle,
          instruction: `${foundation} ${language.plan}`,
        },
        {
          title: language.executeTitle,
          instruction: `${supportedWork} ${language.execute}`,
        },
        {
          title: language.testTitle,
          instruction: `${checking} ${language.test}`,
        },
        {
          title: "Explain the result",
          instruction: language.explain,
        },
      ],
    },
  };
  const approach = approaches[kind];
  return {
    ...content,
    title: content.explicitRequirement || !topic
      ? content.title
      : `${kind[0].toUpperCase()}${kind.slice(1)} ${topic.title}`,
    objective: `${approach.lead} ${content.objective}`,
    steps: approach.steps,
  };
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateDailyMission(
  goal: LearningGoal,
  pace: MissionPace = "standard",
  dateKey = getLocalDateKey(),
  learnerContext?: LearnerContext,
  rewardEligible = true,
  buildContext: MissionBuildContext = {},
): DailyMission {
  const domain = missionDomain(goal.subject);
  const template = selectTemplate(goal.subject);
  const timePlan = missionTimePlan(goal.minutesPerDay);
  const target = buildContext.target ?? null;
  const topic = (goal.learningTopics ?? []).find(
    (candidate) => candidate.id === target?.topicId,
  );
  const kind = target?.kind ?? (topic ? missionKindForTopic(topic, dateKey) : "learn");
  const cognitiveDifficulty =
    target?.difficulty ?? fallbackCognitiveDifficulty(goal);
  const grounded =
    goal.referenceFiles.length > 0
      ? groundedMissionContent(
          goal,
          topic,
          buildContext.excludedLearningTargetKeys,
          buildContext.allowCompletedTarget === true || kind === "review",
        )
      : null;
  const baseContent = grounded ?? {
    title: template.title,
    objective: template.objective(goal),
    steps: template.steps,
    evidenceRequirements: template.evidenceRequirements,
    completionCriteria: [
      "Complete every mission step within the planned session.",
      "Submit a concrete deliverable that matches the mission objective.",
      "Provide relevant evidence that passes the mission-specific relevance check.",
    ],
    sourceReferences: [],
    explicitRequirement: false,
    learningTargetKey: null,
  };
  const strategy = strategyForMission(
    goal,
    pace,
    buildContext.review,
    buildContext.mood ?? "moderate",
  );
  const scaffolding = levelGuidance(goal, domain);
  const learnerGuidance = learnerContextGuidance(
    goal,
    domain,
    learnerContext,
    grounded !== null,
  );
  const kindContent = contentForMissionKind(baseContent, kind, topic, domain);
  const content = {
    ...kindContent,
    steps: workloadSteps(kindContent.steps, timePlan.workload),
  };
  const minutes = allocateMinutes(goal.minutesPerDay, content.steps.length);
  const missionId = buildContext.id ?? `${goal.id}:${dateKey}:1`;

  return {
    id: missionId,
    goalId: goal.id,
    subject: goal.subject,
    date: dateKey,
    title: content.title,
    objective: content.objective,
    kind,
    topicId: topic?.id ?? null,
    difficulty: cognitiveDifficulty,
    workload: timePlan.workload,
    pace,
    xp: rewardEligible ? timePlan.xp : 0,
    rewardEligible,
    steps: content.steps.map((step, index) => ({
      id: `${missionId}:step-${index + 1}`,
      ...step,
      instruction:
        index === 0
          ? [step.instruction, scaffolding, learnerGuidance, strategy]
              .filter(Boolean)
              .join(" ")
          : step.instruction,
      minutes: minutes[index],
      completed: false,
    })),
    evidenceRequirements: content.evidenceRequirements,
    completionCriteria: content.completionCriteria,
    sourceReferences: content.sourceReferences,
    learningTargetKey:
      content.learningTargetKey ?? (topic ? `topic:${topic.id}` : null),
    recommendationReasons: target?.reasons ?? [],
    status: "active",
    evidence: null,
    feedback: null,
    xpAwarded: false,
    rewardOpportunityId: missionId,
    rewardDate: dateKey,
    replacementOf: null,
    carryoverDecision: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function addMissionIfAbsent(
  state: StatQuestState,
  mission: DailyMission,
): StatQuestState {
  const exists = state.missions.some(
    (current) =>
      current.id === mission.id ||
      (current.goalId === mission.goalId && current.status === "active"),
  );
  return exists ? state : { ...state, missions: [mission, ...state.missions] };
}

export const MAX_ACTIVE_MISSIONS = 5;
export const MAX_REWARDED_MISSIONS_PER_DATE = 5;

export function nextMissionId(
  missions: DailyMission[],
  goalId: string,
  dateKey: string,
): string {
  const prefix = `${goalId}:${dateKey}:`;
  let highest = 0;
  for (const mission of missions) {
    if (!mission.id.startsWith(prefix)) continue;
    const suffix = mission.id.slice(prefix.length);
    if (/^\d+$/.test(suffix)) highest = Math.max(highest, Number(suffix));
  }

  let ordinal = highest + 1;
  let candidate = `${prefix}${ordinal}`;
  const ids = new Set(missions.map((mission) => mission.id));
  while (ids.has(candidate)) {
    ordinal += 1;
    candidate = `${prefix}${ordinal}`;
  }
  return candidate;
}

export function missionGenerationIssue(
  state: StatQuestState,
  goalId: string,
): string | null {
  const goal = state.goals.find(
    (candidate) => candidate.id === goalId && candidate.status === "active",
  );
  if (!goal) return "This goal is no longer active.";
  if (state.missions.some((mission) => mission.goalId === goalId && mission.status === "active")) {
    return "Complete the active mission for this goal before generating another.";
  }
  if (state.missions.filter((mission) => mission.status === "active").length >= MAX_ACTIVE_MISSIONS) {
    return "You already have 5 active missions. Complete one before generating another.";
  }
  return null;
}

function completedConcreteTaskKeys(
  state: StatQuestState,
  goalId: string,
): string[] {
  return state.missions
    .filter(
      (mission) =>
        mission.goalId === goalId &&
        mission.status === "completed" &&
        mission.learningTargetKey?.startsWith("source:"),
    )
    .map((mission) => mission.learningTargetKey!);
}

export function generateMissionForGoal(
  state: StatQuestState,
  goalId: string,
  dateKey = getLocalDateKey(),
  learnerContext?: LearnerContext,
): StatQuestState {
  if (
    state.missions.some(
      (mission) => mission.goalId === goalId && mission.status === "active",
    )
  ) {
    return state;
  }
  const issue = missionGenerationIssue(state, goalId);
  if (issue) throw new MissionGenerationError(issue);
  const goal = state.goals.find((candidate) => candidate.id === goalId)!;
  const rewardedOpportunities = new Set(
    state.missions
      .filter(
        (mission) =>
          (mission.rewardDate ?? mission.date) === dateKey &&
          mission.rewardEligible,
      )
      .map((mission) => mission.rewardOpportunityId ?? mission.id),
  );
  const rewardEligible =
    rewardedOpportunities.size < MAX_REWARDED_MISSIONS_PER_DATE;
  const latestReview = latestReviewForGoal(state.weeklyReviews, goalId);
  const pace = latestReview?.nextMissionPace ?? "standard";
  const target = selectNextTargetForGoal(state, goalId, dateKey);
  const mission = generateDailyMission(
    goal,
    pace,
    dateKey,
    learnerContext,
    rewardEligible,
    {
      id: nextMissionId(state.missions, goalId, dateKey),
      review: latestReview,
      mood: effectiveMood(state, dateKey),
      target,
      excludedLearningTargetKeys: completedConcreteTaskKeys(state, goalId),
      allowCompletedTarget: target?.kind === "review",
    },
  );
  return addMissionIfAbsent(state, mission);
}

function raiseDifficulty(difficulty: MissionDifficulty): MissionDifficulty {
  return difficulty === "easy" ? "medium" : "hard";
}

function targetFromMission(
  goal: LearningGoal,
  mission: DailyMission,
  kind: MissionKind = mission.kind,
): AdaptiveTarget | null {
  const topic = (goal.learningTopics ?? []).find(
    (candidate) => candidate.id === mission.topicId,
  );
  if (!topic) return null;
  return {
    goalId: goal.id,
    topicId: topic.id,
    topicTitle: topic.title,
    kind,
    difficulty: mission.difficulty,
    estimatedMinutes: goal.minutesPerDay,
    reasons: mission.recommendationReasons,
  };
}

export function replaceActiveMissionInState(
  state: StatQuestState,
  missionId: string,
  dateKey: string,
  adjustment?: MissionAdjustment,
): StatQuestState {
  const original = state.missions.find((mission) => mission.id === missionId);
  if (!original || original.status !== "active" || original.xpAwarded) return state;
  const goal = state.goals.find(
    (candidate) => candidate.id === original.goalId && candidate.status === "active",
  );
  if (!goal) return state;

  const topic = (goal.learningTopics ?? []).find(
    (candidate) => candidate.id === original.topicId,
  );
  let target = targetFromMission(
    goal,
    original,
    adjustment === "review" ? "review" : original.kind,
  );
  if (adjustment === "different-topic" || adjustment === undefined) {
    target =
      selectNextTargetForGoal(state, goal.id, dateKey, original.topicId ?? undefined) ??
      target;
  }
  if (adjustment === "more-challenge" && target && topic) {
    target = {
      ...target,
      difficulty: cognitiveDifficultyForTarget(
        goal,
        topic,
        target.kind,
        effectiveMood(state, dateKey),
        true,
      ),
      reasons: ["You asked for more challenge", ...target.reasons].slice(0, 3),
    };
  }
  if (adjustment === "review" && target) {
    target = {
      ...target,
      kind: "review",
      reasons: ["You chose a deliberate review", ...target.reasons].slice(0, 3),
    };
  }

  const adjustedMinutes =
    adjustment === "less-time"
      ? Math.max(15, Math.round((goal.minutesPerDay * 0.6) / 5) * 5)
      : goal.minutesPerDay;
  const nextId = nextMissionId(state.missions, goal.id, dateKey);
  const generated = generateDailyMission(
    { ...goal, minutesPerDay: adjustedMinutes },
    original.pace,
    dateKey,
    state.profile ?? undefined,
    original.rewardEligible,
    {
      id: nextId,
      review: latestReviewForGoal(state.weeklyReviews, goal.id),
      mood: effectiveMood(state, dateKey),
      target,
      excludedLearningTargetKeys:
        adjustment === undefined || adjustment === "different-topic"
          ? [
              ...completedConcreteTaskKeys(state, goal.id),
              ...(original.learningTargetKey?.startsWith("source:")
                ? [original.learningTargetKey]
                : []),
            ]
          : completedConcreteTaskKeys(state, goal.id),
      allowCompletedTarget: adjustment === "review",
    },
  );
  const replacement: DailyMission = {
    ...generated,
    difficulty:
      adjustment === "more-challenge"
        ? raiseDifficulty(original.difficulty)
        : generated.difficulty,
    xp: original.xp,
    rewardEligible: original.rewardEligible,
    rewardOpportunityId: original.rewardOpportunityId ?? original.id,
    rewardDate: original.rewardDate ?? original.date,
    replacementOf: original.id,
  };

  return {
    ...state,
    missions: [
      replacement,
      ...state.missions.map((mission) =>
        mission.id === original.id
          ? {
              ...mission,
              status: "abandoned" as const,
              carryoverDecision: "replaced" as const,
              evidence: null,
              completedAt: null,
            }
          : mission,
      ),
    ],
  };
}

export function latestReviewForGoal(
  reviews: WeeklyReview[],
  goalId: string,
): WeeklyReview | undefined {
  return reviews
    .filter((review) => review.goalId === goalId)
    .sort((left, right) => {
      const createdOrder = right.createdAt.localeCompare(left.createdAt);
      return createdOrder || right.weekStart.localeCompare(left.weekStart);
    })[0];
}
