import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StatQuest — Have goals, but don't know where to start?",
  description: "Turn your learning goals into daily missions, focus sessions, and visible progress. One step at a time.",
};

export default function WelcomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
