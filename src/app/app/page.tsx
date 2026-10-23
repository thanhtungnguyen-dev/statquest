// Keep the original StatQuest application intact at /app.
// src/app/page.tsx remains unchanged so the existing source-inspection tests still work.
import StatQuestApp from "../page";

export default function StatQuestAppRoute() {
  return <StatQuestApp />;
}
