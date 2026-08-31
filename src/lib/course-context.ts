import type {
  CourseDetail,
  CourseDetailKind,
  GoalReferenceFile,
  MissionSourceReference,
} from "./types.ts";

type ParsedDetail = {
  kind: CourseDetailKind;
  title: string;
  date: string | null;
};

function clean(value: string): string {
  return value.replace(/^[\s:–—-]+|[\s.;:]+$/g, "").replace(/\s+/g, " ").trim();
}

function clip(value: string, maximum = 190): string {
  const normalized = clean(value);
  return normalized.length <= maximum
    ? normalized
    : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function explicitDateKey(value: string): string | null {
  const iso = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const named = value.match(
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s+20\d{2}\b/i,
  );
  if (!named) return null;
  const parsed = new Date(named[0].replace(/(st|nd|rd|th)/i, ""));
  if (!Number.isFinite(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseStructuredLine(line: string): ParsedDetail | null {
  const assessmentDate = explicitDateKey(line);
  if (
    assessmentDate &&
    /\b(?:quiz|exam|test|midterm|final|assignment|project)\b/i.test(line)
  ) {
    return { kind: "assessment", title: clip(line), date: assessmentDate };
  }

  const topic = line.match(
    /^(?:lecture(?:\s+\d+)?(?:\s+topic)?|topic|unit(?:\s+\d+)?|chapter(?:\s+\d+)?|(?:exam|quiz)\s+topics?)\s*:\s*(.+)$/i,
  );
  if (topic && clean(topic[1]).length >= 3) {
    return { kind: "topic", title: clean(topic[1]), date: null };
  }

  const outcome = line.match(
    /^(?:learning outcome|course objective|learning objective)\s*:\s*(.+)$/i,
  );
  if (outcome && clean(outcome[1]).length >= 8) {
    return { kind: "outcome", title: clean(outcome[1]), date: null };
  }

  const questions = line.match(
    /\b(?:complete|answer|solve|attempt|work(?:\s+through)?)\s+(?:questions?|problems?|exercises?)\s+(?:\d+(?:\s*[–—-]\s*\d+)?(?:\s*,\s*\d+)*)[^.]{0,120}/i,
  );
  if (questions) {
    return { kind: "task", title: clean(questions[0]), date: null };
  }

  const requirement = line.match(
    /^(?:assignment|homework|project requirement|assessment requirement|rubric item)(?:\s+\d+)?\s*:\s*(.+)$/i,
  );
  if (
    requirement &&
    /\b(?:analy[sz]e|build|calculate|complete|create|design|implement|prepare|prove|solve|submit|test|write)\b/i.test(requirement[1])
  ) {
    return { kind: "task", title: clean(requirement[1]), date: null };
  }

  return null;
}

function sourceReference(
  file: GoalReferenceFile,
  excerpt: string,
): MissionSourceReference {
  return { fileId: file.id, fileName: file.name, excerpt: clip(excerpt) };
}

export function extractCourseDetails(
  files: GoalReferenceFile[],
): CourseDetail[] {
  const details: CourseDetail[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    if (file.status !== "ready" || !file.extractedText.trim()) continue;
    const lines = file.extractedText
      .split(/\n+|(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 12 && line.length <= 360);

    for (const [index, line] of lines.entries()) {
      const parsed = parseStructuredLine(line);
      if (!parsed) continue;
      const key = `${file.id}:${parsed.kind}:${parsed.title.toLocaleLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      details.push({
        id: `course-detail:${file.id}:${index}:${parsed.kind}`,
        ...parsed,
        confirmed: false,
        sourceReference: sourceReference(file, line),
      });
    }
  }

  return details;
}

export function mergeExtractedCourseDetails(
  current: CourseDetail[],
  files: GoalReferenceFile[],
  replacedFileId?: string,
): CourseDetail[] {
  const refreshedFileIds = new Set(files.map((file) => file.id));
  const retained = current.filter(
    (detail) =>
      detail.sourceReference.fileId !== replacedFileId &&
      !refreshedFileIds.has(detail.sourceReference.fileId),
  );
  const extracted = extractCourseDetails(files);
  const currentById = new Map(current.map((detail) => [detail.id, detail]));
  return [
    ...retained,
    ...extracted.map((detail) => currentById.get(detail.id) ?? detail),
  ];
}
