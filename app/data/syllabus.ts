import type { Week } from "./types";
import { week01 } from "./weeks/week-01";
import { week02 } from "./weeks/week-02";
import { week03 } from "./weeks/week-03";
import { week04 } from "./weeks/week-04";
import { week05 } from "./weeks/week-05";
import { week06 } from "./weeks/week-06";
import { week07 } from "./weeks/week-07";
import { week08 } from "./weeks/week-08";
import { week09 } from "./weeks/week-09";
import { week10 } from "./weeks/week-10";
import { week11 } from "./weeks/week-11";
import { week12 } from "./weeks/week-12";
import { week13 } from "./weeks/week-13";
import { week16 } from "./weeks/week-16";
import { week17 } from "./weeks/week-17";
import { week18 } from "./weeks/week-18";
import { week19 } from "./weeks/week-19";
import { week20 } from "./weeks/week-20";

// Weeks are added here as each is authored. The component renders whatever is present,
// so the app stays runnable while content is filled in week-by-week.
// Weeks 14, 15, 21 are intentionally out of scope.
export const syllabus: Week[] = [
  week01,
  week20,
  week06,
  week02,
  week13,
  week03,
  week04,
  week10,
  week05,
  week11,
  week07,
  week09,
  week08,
  week16,
  week17,
  week19,
  week12,
  week18,
];
