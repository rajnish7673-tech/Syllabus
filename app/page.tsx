import type { Metadata } from "next";
import InterviewSyllabus from "./components/InterviewSyllabus";

export const metadata: Metadata = {
  title: "Senior Frontend Interview Syllabus",
  description: "21-week senior frontend interview prep with detailed answers.",
};

export default function Home() {
  return <InterviewSyllabus />;
}
