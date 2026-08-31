import assert from "node:assert/strict";
import test from "node:test";
import {
  createReferenceFileRecord,
  MAX_REFERENCE_FILE_BYTES,
  normalizeExtractedText,
  removeReferenceFileRecord,
  replaceReferenceFileRecord,
  validateReferenceFile,
} from "../src/lib/reference-files.ts";

const TXT_FILE = {
  name: "course-outline.txt",
  size: 2_048,
  type: "text/plain",
};

test("accepts every supported reference format", () => {
  const files = [
    { name: "syllabus.pdf", size: 1, type: "application/pdf" },
    {
      name: "rubric.docx",
      size: 1,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    TXT_FILE,
    { name: "notes.png", size: 1, type: "image/png" },
    { name: "scan.jpg", size: 1, type: "image/jpeg" },
    { name: "scan.jpeg", size: 1, type: "" },
  ];

  for (const file of files) assert.equal(validateReferenceFile(file, 0), null);
});

test("rejects invalid, mismatched, empty, oversized, and excess files", () => {
  assert.match(
    validateReferenceFile({ name: "malware.exe", size: 100, type: "application/octet-stream" }, 0) ?? "",
    /not supported/i,
  );
  assert.match(
    validateReferenceFile({ name: "fake.pdf", size: 100, type: "image/png" }, 0) ?? "",
    /not supported/i,
  );
  assert.match(validateReferenceFile({ ...TXT_FILE, size: 0 }, 0) ?? "", /empty/i);
  assert.match(
    validateReferenceFile({ ...TXT_FILE, size: MAX_REFERENCE_FILE_BYTES + 1 }, 0) ?? "",
    /larger than 10\.0 MB/i,
  );
  assert.match(validateReferenceFile(TXT_FILE, 5) ?? "", /up to 5 files/i);
});

test("creates, replaces, and removes reference records without touching siblings", () => {
  const original = createReferenceFileRecord(TXT_FILE, "old", "2026-08-19T00:00:00.000Z");
  const sibling = createReferenceFileRecord(
    { name: "week-2.pdf", size: 4_096, type: "application/pdf" },
    "sibling",
    "2026-08-19T00:00:00.000Z",
  );
  const replacement = createReferenceFileRecord(
    { name: "revised-outline.txt", size: 3_000, type: "text/plain" },
    "new",
    "2026-08-19T01:00:00.000Z",
  );

  const replaced = replaceReferenceFileRecord([original, sibling], "old", replacement);
  assert.deepEqual(replaced.map((file) => file.id), ["new", "sibling"]);
  assert.equal(replaced[1], sibling);

  const removed = removeReferenceFileRecord(replaced, "new");
  assert.deepEqual(removed, [sibling]);
});

test("normalizes extracted text while preserving useful line boundaries", () => {
  assert.equal(
    normalizeExtractedText("  Lecture 2:\t Quantifiers \r\n\r\n Questions 1–4  "),
    "Lecture 2: Quantifiers\nQuestions 1–4",
  );
});
