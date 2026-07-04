import type { QuestionPriority, Week } from "../types";

const week12QuestionPriorities: Record<string, QuestionPriority[]> = {
  "Arrays & Strings": ["High", "High", "High", "High", "Medium", "High", "High"],
  "Linked Lists": ["High", "High", "High", "High", "High", "Medium"],
  "Stacks & Queues": ["High", "Medium", "High", "Medium"],
  "Trees & Binary Search": ["Medium", "High", "High", "High"],
  "Hashmaps & Sets": ["High", "High", "Medium", "High"],
  "JavaScript Array & Object Manipulation": ["Medium", "Medium", "Medium", "High", "Medium"],
  "Recursion & Dynamic Programming": ["High", "High", "Medium", "Medium"],
  Graphs: ["High", "Medium", "Medium", "High"],
  "Frontend Machine Coding": ["High", "High", "High", "High", "Medium", "High"],
};

function withQuestionPriorities(week: Week): Week {
  return {
    ...week,
    topics: week.topics.map((topic) => {
      const priorities = week12QuestionPriorities[topic.title] ?? [];
      return {
        ...topic,
        questions: topic.questions.map((qa, index) => ({
          ...qa,
          priority: priorities[index],
        })),
      };
    }),
  };
}

export const week12: Week = withQuestionPriorities({
  week: 17,
  theme: "Competitive Coding & DSA",
  color: "#FF6B35",
  topics: [
    {
      title: "Arrays & Strings",
      subtopics: ["Two pointers", "Sliding window", "Prefix sum", "Kadane's algorithm", "Frequency map"],
      questions: [
        {
          q: "Find the maximum subarray sum (Kadane's algorithm).",
          answer: `Find the contiguous subarray with the largest sum. Kadane's is the optimal **O(n) time, O(1) space** DP: at each element decide whether to **extend** the current subarray or **start fresh** from this element.

~~~js
function maxSubArray(nums) {
  let cur = nums[0];      // best sum ending at current index
  let best = nums[0];     // global best
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]); // extend or restart
    best = Math.max(best, cur);
  }
  return best;
}
// [-2,1,-3,4,-1,2,1,-5,4] -> 6  (subarray [4,-1,2,1])
~~~

~~~
the insight (DP recurrence):
  cur[i] = max(nums[i], cur[i-1] + nums[i])
  -> if the running sum went negative, drop it and start at nums[i]
  answer = max over all cur[i]
~~~

Why restart when \`cur\` is negative: a negative prefix can only *hurt* any subarray that includes it, so discarding it is always optimal. The genius is reducing an O(n²) "try all subarrays" into one pass.

Edge cases interviewers check: **all negatives** (answer is the largest single element — that's why we init with \`nums[0]\` and use \`max(nums[i], ...)\`, not 0); empty array (clarify). To also return the **indices**, track start/end when you restart and when you update best.

Complexity: **O(n) time, O(1) space.** Follow-up: "Return the subarray, not just the sum" -> track boundaries. "What if all elements negative and they want 0?" Clarify the contract (Kadane variant that allows empty subarray returns 0). Frontend tie-in: a running-max-in-a-window mindset maps to processing streams of events/scroll deltas in a time window.`,
        },
        {
          q: "Longest substring without repeating characters.",
          answer: `Find the length of the longest substring with all unique characters. **Sliding window + a set/map** of the current window's characters: expand the right edge; when a duplicate appears, shrink from the left until the window is valid again. **O(n) time.**

~~~js
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map(); // char -> last index
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (lastSeen.has(c) && lastSeen.get(c) >= left) {
      left = lastSeen.get(c) + 1;   // jump left past the previous occurrence
    }
    lastSeen.set(c, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
// "abcabcbb" -> 3 ("abc");  "bbbbb" -> 1;  "pwwkew" -> 3 ("wke")
~~~

~~~
sliding window:
  [a b c] a b c b b      window unique, best=3
       ^right hits 'a' (dup) -> move left past prev 'a'
  a [b c a] b c b b      still length 3
~~~

The key optimization: store each char's **last index** so on a duplicate you can **jump** \`left\` directly past it (O(n)), rather than incrementing left one at a time (which is still O(n) amortized but the map-jump is cleaner). The \`>= left\` check ensures you only jump for duplicates **inside** the current window (a stale earlier index is ignored).

Variants: with a plain **Set** you shrink left one step at a time (\`while set.has(c) { set.delete(s[left++]) }\`) — also O(n) amortized. Edge cases: empty string (0), all same chars (1), all unique (length).

Complexity: **O(n) time, O(min(n, charset)) space.** This is a canonical **variable-size sliding window** problem — interviewers use it to test whether you can maintain a valid window with two pointers. Follow-up: "Return the substring" -> track the best window's start. "Fixed-size window?" Different template (slide a fixed k). Always ask: fixed or variable window?`,
        },
        {
          q: "Product of array except self — solve it in O(n) without division.",
          answer: `Return an array where each output index is the product of **all other elements** except itself, without using division. The clean solution is **prefix products + suffix products**: in the first pass store the product of everything to the **left** of each index; in the second pass multiply by the product of everything to the **right**. This gives **O(n) time** and **O(1) extra space** if the output array doesn't count.

~~~js
function productExceptSelf(nums) {
  const res = new Array(nums.length).fill(1);

  let prefix = 1;
  for (let i = 0; i < nums.length; i++) {
    res[i] = prefix;          // product of everything LEFT of i
    prefix *= nums[i];
  }

  let suffix = 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    res[i] *= suffix;         // multiply by everything RIGHT of i
    suffix *= nums[i];
  }

  return res;
}
// [1,2,3,4] -> [24,12,8,6]
~~~

~~~
left pass stores:
  nums: [1, 2, 3, 4]
  res : [1, 1, 2, 6]

right pass multiplies suffix:
  suffixes seen from right: 1, 4, 12, 24
  final res -> [24, 12, 8, 6]
~~~

Why it works: for each index \`i\`, the answer is \`(product of everything before i) * (product of everything after i)\`. The first pass fills the "before" part, the second pass folds in the "after" part. This avoids division, so zeros are handled correctly too.

Edge cases interviewers love: **one zero** (only that position gets the non-zero product, all others become 0), **multiple zeros** (everything is 0), negatives (sign flips naturally work), and large products (clarify integer constraints). The common mistake is trying to divide totalProduct / nums[i], which breaks on zeros and violates the prompt.

Complexity: **O(n) time, O(1) extra space** aside from the output. This is one of the most common prefix/suffix interview problems. Follow-up: "Can you do it with separate prefix/suffix arrays?" Yes, O(n) extra space. "Why not division?" Prompt forbids it and zeros make it incorrect.`,
        },
        {
          q: "Best time to buy and sell stock — max profit with one transaction.",
          answer: `Given daily stock prices, choose **one buy day** and **one later sell day** to maximize profit. The optimal pattern is a single pass tracking the **minimum price seen so far** and the **best profit** if you sold today. **O(n) time, O(1) space.**

~~~js
function maxProfit(prices) {
  let minPrice = Infinity;
  let best = 0;

  for (const price of prices) {
    minPrice = Math.min(minPrice, price);   // best day to have bought so far
    best = Math.max(best, price - minPrice); // sell today if it's good
  }

  return best;
}
// [7,1,5,3,6,4] -> 5  (buy at 1, sell at 6)
~~~

~~~
scan left -> right:
  keep cheapest buy seen so far
  every new price asks: "if I sold TODAY, what's my profit?"
  keep the maximum of those profits
~~~

Why it works: at each day, the best valid transaction ending today is "today's price minus the cheapest earlier day." You never need to check all pairs because the only thing that matters from the left side is the smallest value seen so far.

Edge cases: strictly decreasing prices -> answer is **0** (don't trade), single day -> 0, repeated prices -> profit can stay 0. Clarify whether short selling is allowed; in the standard version it's **not**, so buy must happen before sell.

This is a classic "running minimum + current candidate" pattern and appears constantly in interview prep lists because it tests whether you can collapse an O(n^2) brute-force pair search into one pass. Follow-up: "Unlimited transactions?" Greedy sum of every upward slope. "At most two transactions?" DP/state machine variant.`,
        },
        {
          q: "Find the intersection of two arrays without extra space.",
          answer: `"Intersection" = elements present in both. The clarifying questions decide the approach: **unique** intersection or with **duplicates/counts**? Is "no extra space" strict (then sort + two pointers) or do they mean "optimal" (then a hash set, O(n) time but O(n) space)?

**Approach A — sort + two pointers (O(1) extra space if in-place sort allowed):**
~~~js
function intersectionSorted(a, b) {
  a.sort((x, y) => x - y);
  b.sort((x, y) => x - y);
  const res = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      if (res[res.length - 1] !== a[i]) res.push(a[i]); // dedupe
      i++; j++;
    } else if (a[i] < b[j]) i++;
    else j++;
  }
  return res;
}
// O(n log n + m log m) time, O(1) extra (sort in place; output aside)
~~~

**Approach B — hash set (O(n+m) time, O(n) space):** when "no extra space" isn't strict and you want optimal time:
~~~js
function intersectionHash(a, b) {
  const set = new Set(a);
  const out = new Set();
  for (const x of b) if (set.has(x)) out.add(x);
  return [...out];
}
~~~

**With duplicates (intersection counts, LeetCode 350)** — frequency map, take \`min\` count:
~~~js
function intersect(a, b) {
  const count = new Map();
  for (const x of a) count.set(x, (count.get(x) || 0) + 1);
  const res = [];
  for (const x of b) if (count.get(x) > 0) { res.push(x); count.set(x, count.get(x) - 1); }
  return res;
}
~~~

~~~
two-pointer (sorted):   a: 1 2 2 4    b: 2 2 3
  i,j advance: match 2,2 ... -> classic merge-style intersection, O(1) extra
hash set:               trade space for O(n+m) time
~~~

The senior move is **clarifying first** (unique vs counts; is space truly constrained vs "best")** then stating the trade-off: sort+two-pointers = O(1) extra space but O(n log n) time; hash = O(n+m) time but O(n) space. Edge cases: empties, all-overlap, no overlap, duplicates. Follow-up: "Sorted inputs already?" Then two pointers is O(n+m) and O(1) — strictly best. "Truly no extra and can't sort?" Nested loop O(n·m) — only if forced.`,
        },
        {
          q: "Check if two strings are anagrams — optimal time complexity?",
          answer: `Two strings are anagrams if they contain the **same characters with the same frequencies** (just reordered). Optimal is **O(n) time** using a single frequency count — better than the common sort-and-compare (O(n log n)).

**Optimal — frequency count (O(n) time, O(1) space for fixed alphabet):**
~~~js
function isAnagram(s, t) {
  if (s.length !== t.length) return false;   // quick reject
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) || 0) + 1);
  for (const c of t) {
    if (!count.has(c)) return false;
    count.set(c, count.get(c) - 1);
    if (count.get(c) === 0) count.delete(c);
  }
  return count.size === 0;
}
// "anagram","nagaram" -> true;  "rat","car" -> false
~~~

For a **fixed lowercase a–z alphabet**, use an int array of 26 (truly O(1) space, very fast):
~~~js
function isAnagramAZ(s, t) {
  if (s.length !== t.length) return false;
  const c = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    c[s.charCodeAt(i) - 97]++;
    c[t.charCodeAt(i) - 97]--;   // increment for s, decrement for t in one pass
  }
  return c.every((x) => x === 0);
}
~~~

~~~
count approach:  build freq of s, subtract freq of t -> all zero = anagram
  s="aab": {a:2,b:1}   t="aba": subtract -> {a:0,b:0} -> equal
~~~

**Complexity comparison (the "optimal" point):**
~~~
sort + compare:  O(n log n) time, O(n) space  (simple, common)
freq count:      O(n) time, O(1) space (fixed alphabet)  <- OPTIMAL
~~~

Edge cases / clarifications: **length mismatch -> instantly false** (cheap early exit); case sensitivity (normalize if needed); spaces/punctuation (strip if "phrase anagram"); **Unicode** — \`charCode\`/array-of-26 assumes ASCII letters; for full Unicode use the Map (and consider code points / normalization for combined characters). Follow-up: "Group anagrams?" Use a sorted-key or freq-signature as a hash key (covered in the Hashmaps topic). "Why not always sort?" O(n log n) is fine but the freq count is strictly better and shows you reach for hashing on "same elements/frequencies" problems.`,
        },
        {
          q: "Merge overlapping intervals.",
          answer: `Given intervals like \`[[1,3],[2,6],[8,10],[15,18]]\`, merge all overlapping ranges. The standard approach is **sort by start time**, then scan left to right building the merged output. **O(n log n)** from sorting, then a linear pass.

~~~js
function merge(intervals) {
  if (intervals.length <= 1) return intervals;

  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end); // overlap -> extend the current merged range
    } else {
      merged.push([start, end]);        // disjoint -> start a new range
    }
  }

  return merged;
}
// [[1,3],[2,6],[8,10],[15,18]] -> [[1,6],[8,10],[15,18]]
~~~

~~~
sort first:
  [1,3] [2,6] [8,10] [15,18]
    2 <= 3  -> merge into [1,6]
    8 > 6   -> start new interval
~~~

Why sorting is the key: once intervals are ordered by start time, any overlap relevant to the current interval can only happen with the **last merged interval**. Without sorting, you'd need much more bookkeeping.

The overlap check is \`start <= lastEnd\` if touching endpoints count as overlapping. If the problem treats \`[1,4]\` and \`[4,5]\` as separate, the condition becomes \`start < lastEnd\`. Always clarify inclusive/exclusive endpoints.

Complexity: **O(n log n) time, O(n) output space**. This is a very common sorting pattern question because it combines interval reasoning with a simple greedy scan. Follow-up: "Insert interval?" Same idea but you weave one interval into a sorted list. "Meeting rooms?" Sort starts/ends or use a heap.`,
        },
        {
          q: "Write a function that takes an array of numbers and returns a new array with only unique values.",
          answer: `The interview is really testing whether you reach for \`Set\` (the O(n) answer) instead of nested loops (O(n²)).

~~~js
function unique(arr) {
  return [...new Set(arr)];
}
unique([1, 2, 2, 3, 3, 3, 4]); // [1, 2, 3, 4]
~~~

\`Set\` only stores unique values and preserves insertion order, so spreading it back into an array gives you dedup + order preservation for free.

Alternative with \`filter\` + \`indexOf\` (works, but is O(n²) since \`indexOf\` scans linearly for every element):

~~~js
function uniqueFilter(arr) {
  return arr.filter((val, idx) => arr.indexOf(val) === idx);
}
~~~

For objects/arrays (reference types), \`Set\` compares by reference, not by value, so \`unique([{id:1}, {id:1}])\` would NOT dedupe — you'd need a key-based approach:

~~~js
function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
uniqueBy([{id:1},{id:1},{id:2}], x => x.id); // [{id:1},{id:2}]
~~~

~~~text
Set approach:    O(n) time, O(n) space  <- preferred
filter+indexOf:  O(n²) time             <- avoid for large arrays
~~~

Why it matters: \`Set\` is the expected answer at any level; the follow-up that separates seniors is handling **dedup by key** for arrays of objects, since \`Set\` alone only works for primitives. Follow-up: "How would you dedupe case-insensitively?" — normalize the key (\`.toLowerCase()\`) before adding to the Set.`,
        },
        {
          q: "Merge two arrays.",
          answer: `There are two very different meanings of "merge" that interviewers test — clarify which one is being asked before coding.

**1. Simple concatenation** (order doesn't matter, no sorting requirement):

~~~js
const a = [1, 2, 3];
const b = [4, 5, 6];

const merged1 = [...a, ...b];     // spread - most idiomatic
const merged2 = a.concat(b);      // concat - doesn't mutate either array
const merged3 = a.push(...b);     // push with spread - mutates 'a' in place
~~~

**2. Merge two already-sorted arrays into one sorted array** (the actual DSA question, see "Merge Two Sorted Arrays" for the two-pointer O(n) version) — just concatenating and sorting is O(n log n) and misses the point of the question:

~~~js
// naive - works but defeats the purpose of "merge two SORTED arrays"
[...a, ...b].sort((x, y) => x - y);
~~~

~~~text
concat/spread:        O(n + m), no ordering guarantee needed
sort after concat:     O((n+m) log(n+m)) - wasteful if inputs are already sorted
two-pointer merge:     O(n + m) - correct approach when inputs are sorted
~~~

Why it matters: this question is often a "warm-up" before the real one (merging *sorted* arrays/linked lists). Answering with spread/concat for the simple case, but immediately flagging "if these are sorted and you want it to stay sorted, I'd use a two-pointer merge instead of re-sorting" shows you understand when each tool applies.`,
        },
        {
          q: "Reverse a String.",
          answer: `Strings in JS are immutable, so "reversing" always means building a new string.

~~~js
function reverse(str) {
  return str.split("").reverse().join("");
}
reverse("hello"); // "olleh"
~~~

This is the idiomatic one-liner: split into a character array, reverse the array in place, join back into a string.

Manual loop version (shows you understand what's happening under the hood, and handles the interviewer's likely follow-up "do it without built-in reverse()"):

~~~js
function reverseLoop(str) {
  let result = "";
  for (let i = str.length - 1; i >= 0; i--) {
    result += str[i];
  }
  return result;
}
~~~

Two-pointer, in-place-style (works on an array of characters since strings can't be mutated):

~~~js
function reverseTwoPointer(str) {
  const chars = str.split("");
  let left = 0, right = chars.length - 1;
  while (left < right) {
    [chars[left], chars[right]] = [chars[right], chars[left]];
    left++;
    right--;
  }
  return chars.join("");
}
~~~

~~~text
split/reverse/join:  O(n) time, O(n) space, cleanest code
for loop:            O(n) time, O(n) space (string concat creates new strings each time)
two-pointer:         O(n) time, O(n) space (extra array needed since strings are immutable)
~~~

Gotcha to mention: this breaks for strings with surrogate pairs (emoji, some non-Latin scripts) because \`split("")\` splits by UTF-16 code unit, not by actual character. \`[..."👍hi"].reverse().join("")\` (spread uses the iterator, which is code-point aware) handles this correctly where \`.split("")\` would corrupt the emoji.

Why it matters: this is a warm-up question, but the surrogate-pair gotcha and "why not \`for\` loop with string concatenation performance" are what separate a senior answer from a junior one.`,
        },
        {
          q: "Palindrome Check.",
          answer: `Check whether a string reads the same forwards and backwards. Two standard approaches:

**1. Reverse and compare** (simplest, O(n) time and space):

~~~js
function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === cleaned.split("").reverse().join("");
}
isPalindrome("A man, a plan, a canal: Panama"); // true
~~~

Normalizing first (lowercase + strip non-alphanumeric) is what interviewers actually check for — most palindrome questions involve sentences with punctuation and mixed case, not just clean lowercase words.

**2. Two-pointer, no extra string built** (O(n) time, O(1) extra space — the answer that shows algorithmic maturity):

~~~js
function isPalindromeTwoPointer(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  let left = 0, right = cleaned.length - 1;

  while (left < right) {
    if (cleaned[left] !== cleaned[right]) return false;
    left++;
    right--;
  }
  return true;
}
~~~

~~~text
left -> "r a c e c a r" <- right
        r===r  a===a  c===c  (meet in middle) -> true
~~~

Why the two-pointer version matters: it avoids allocating a reversed copy of the string, and it can **short-circuit early** — the reverse-and-compare approach always processes the whole string even if the mismatch is at position 1. Follow-up: "Check if a string can become a palindrome by removing at most one character?" — two-pointer, and on mismatch try skipping either the left or right character and check if the remainder is a palindrome.`,
        },
        {
          q: "Find Maximum & Minimum in an Array.",
          answer: `The naive approach is fine functionally but the interview is testing whether you know the O(n) single-pass vs the "clever but slower" approaches.

~~~js
function findMinMax(arr) {
  let min = arr[0], max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
    if (arr[i] > max) max = arr[i];
  }
  return { min, max };
}
~~~

Built-in shortcuts (fine for small arrays, but risky for large ones):

~~~js
Math.max(...arr);   // spread - throws "Maximum call stack size exceeded" for very large arrays (~100k+ elements)
Math.min(...arr);

arr.reduce((max, n) => Math.max(max, n), -Infinity); // safe for any size, still O(n)
~~~

~~~text
single loop (min+max together):  O(n) time, ONE pass       <- best
Math.max(...arr) + Math.min(...arr):  O(n) time, TWO passes, spread has a call-stack limit
sort()[0] / sort()[length-1]:    O(n log n)                 <- avoid, wastes the sort
~~~

The subtlety worth mentioning out loud: finding both min AND max in the *same loop* (rather than two separate \`.reduce()\` calls) does it in a single pass instead of two — a small but real optimization interviewers listen for. A further optimization exists (pairwise comparison reduces comparisons from 2n to 1.5n) but is rarely expected unless the role is algorithm-heavy.

Why it matters: this looks trivial but interviewers are checking whether you default to \`sort()\` (wasteful — full sort just to read two elements) or \`Math.max(...arr)\` (breaks on huge arrays) without thinking about the tradeoffs.`,
        },
        {
          q: "Merge Two Sorted Arrays.",
          answer: `Given two already-sorted arrays, produce one sorted array. The naive approach (\`[...a, ...b].sort()\`) is O((n+m) log(n+m)) and throws away the fact that the inputs are already sorted. The expected answer is the **two-pointer merge**, O(n+m), the same core idea used in merge sort's merge step.

~~~js
function mergeSorted(a, b) {
  const result = [];
  let i = 0, j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }

  // append whatever is left over (only one of these loops actually runs)
  while (i < a.length) result.push(a[i++]);
  while (j < b.length) result.push(b[j++]);

  return result;
}
mergeSorted([1, 3, 5], [2, 4, 6]); // [1, 2, 3, 4, 5, 6]
~~~

~~~text
a: [1, 3, 5]   b: [2, 4, 6]
    i^              j^
compare 1,2 -> take 1, i++
compare 3,2 -> take 2, j++
compare 3,4 -> take 3, i++
compare 5,4 -> take 4, j++
compare 5,6 -> take 5, i++
i exhausted -> append remaining b: [6]
result: [1,2,3,4,5,6]
~~~

Common follow-up: "Merge in-place into array \`a\` which has extra trailing space" (LeetCode 88 variant) — merge from the **back** to avoid overwriting values in \`a\` you haven't read yet:

~~~js
function mergeInPlace(a, aLen, b, bLen) {
  let i = aLen - 1, j = bLen - 1, k = aLen + bLen - 1;
  while (j >= 0) {
    if (i >= 0 && a[i] > b[j]) a[k--] = a[i--];
    else a[k--] = b[j--];
  }
}
~~~

Why it matters: this is the building block for merge sort, and the "merge from the back" trick for the in-place variant is a very common follow-up that trips people up if they try to merge from the front and overwrite unread data.`,
        },
        {
          q: "Rotate an Array.",
          answer: `Rotate an array right by \`k\` steps, e.g. \`[1,2,3,4,5,6,7]\` rotated right by 3 -> \`[5,6,7,1,2,3,4]\`.

**Simple approach — slice and concat** (O(n) time, O(n) extra space, easiest to write correctly):

~~~js
function rotate(arr, k) {
  k = k % arr.length; // handle k > length
  return [...arr.slice(-k), ...arr.slice(0, -k)];
}
rotate([1,2,3,4,5,6,7], 3); // [5,6,7,1,2,3,4]
~~~

**In-place — the reversal trick** (O(n) time, O(1) extra space — the answer that shows real algorithmic depth): reverse the whole array, then reverse each of the two segments.

~~~js
function rotateInPlace(arr, k) {
  k = k % arr.length;
  reverse(arr, 0, arr.length - 1);   // reverse everything
  reverse(arr, 0, k - 1);            // reverse first k elements
  reverse(arr, k, arr.length - 1);   // reverse the rest
  return arr;
}

function reverse(arr, start, end) {
  while (start < end) {
    [arr[start], arr[end]] = [arr[end], arr[start]];
    start++;
    end--;
  }
}
~~~

~~~text
[1,2,3,4,5,6,7], k=3

reverse all:        [7,6,5,4,3,2,1]
reverse first k=3:  [5,6,7,4,3,2,1]
reverse rest:        [5,6,7,1,2,3,4]  <- done
~~~

Always normalize \`k\` with \`k % arr.length\` first — a rotation of \`k = arr.length\` or more is equivalent to \`k % arr.length\`, and skipping this either wastes work or causes an off-by-one/out-of-bounds bug.

Why it matters: the slice/concat version is fine for most interviews, but the reversal-trick in-place version is the one to mention if asked to optimize space — it's a classic pattern (also used for "rotate a matrix", "reverse words in a sentence") so recognizing it signals pattern-matching skill, not just memorization.`,
        },
        {
          q: "Count character occurrences in a string (using an object).",
          answer: `Build a frequency map — one of the most common building blocks in string/array problems (anagrams, first-non-repeating-char, etc).

~~~js
function countChars(str) {
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}
countChars("hello"); // { h: 1, e: 1, l: 2, o: 1 }
~~~

Same idea with \`reduce\`:

~~~js
function countCharsReduce(str) {
  return [...str].reduce((freq, char) => {
    freq[char] = (freq[char] || 0) + 1;
    return freq;
  }, {});
}
~~~

Using a \`Map\` instead of a plain object avoids prototype-pollution edge cases (a character like \`"toString"\` or \`"__proto__"\` colliding with \`Object.prototype\` members) and preserves insertion order reliably:

~~~js
function countCharsMap(str) {
  const freq = new Map();
  for (const char of str) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  return freq;
}
~~~

~~~text
"hello" ->
h: 1
e: 1
l: 2   <- appeared twice
o: 1
~~~

Why it matters: this frequency-map pattern is the foundation for a huge class of problems — anagram detection, "first unique character", character-frequency-based sliding window. Mentioning the \`Object.prototype\` collision risk (e.g. counting the string \`"constructor"\`) and reaching for \`Map\` or \`Object.create(null)\` is a senior-level detail most candidates miss. Follow-up: "Find the first non-repeating character" — build the frequency map first, then a second pass finds the first key with count 1.`,
        },
        {
          q: "Count occurrences while ignoring spaces.",
          answer: `Same frequency-map pattern as character counting, but filtering out whitespace before (or during) the count — testing whether you handle the "ignoring X" requirement cleanly rather than bolting on a fix afterward.

~~~js
function countIgnoringSpaces(str) {
  const freq = {};
  for (const char of str) {
    if (char === " ") continue; // skip spaces during iteration
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}
countIgnoringSpaces("a b b c"); // { a: 1, b: 2, c: 1 }
~~~

Filter-first approach (arguably more readable — the intent "ignore spaces" is explicit as its own step, not buried in a conditional):

~~~js
function countIgnoringSpacesFilter(str) {
  return [...str]
    .filter(char => char !== " ")
    .reduce((freq, char) => {
      freq[char] = (freq[char] || 0) + 1;
      return freq;
    }, {});
}
~~~

If "ignoring spaces" should really mean "ignoring all whitespace" (tabs, newlines too), use a regex test instead of an exact-match check:

~~~js
function countIgnoringWhitespace(str) {
  const freq = {};
  for (const char of str) {
    if (/\\s/.test(char)) continue;
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}
~~~

~~~text
"a b b c"
skip " " each time it appears
-> a:1, b:2, c:1
~~~

Why it matters: this variant tests attention to the exact requirement ("spaces" vs "all whitespace" vs "punctuation too") — a common interview trap is over-generalizing or under-generalizing the filter condition without asking a clarifying question first.`,
        },
      ],
      tip: "Sliding window = O(n) for contiguous subarray problems. Always ask: fixed or variable window size?",
      rajnishAngle:
        "Sliding window maps to frontend: processing a stream of DOM events or scroll positions in a time window.",
    },
    {
      title: "Linked Lists",
      subtopics: ["Reverse a linked list", "Detect cycle (Floyd's)", "Merge two sorted lists", "Find middle node", "LRU Cache"],
      questions: [
        {
          q: "Reverse a linked list iteratively and recursively.",
          answer: `Reverse the direction of all \`next\` pointers. Two standard approaches; iterative is **O(n) time, O(1) space** (preferred), recursive is elegant but **O(n) stack space**.

**Iterative — three pointers (prev, curr, next):**
~~~js
function reverse(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next; // save next before we overwrite
    curr.next = prev;       // reverse the link
    prev = curr;            // advance prev
    curr = next;            // advance curr
  }
  return prev;              // new head
}
~~~

~~~
null  1 -> 2 -> 3 -> null
prev  curr
step: save next, point curr.next back to prev, slide both forward
result: null <- 1 <- 2 <- 3   (head = 3)
~~~

**Recursive — reverse the rest, then fix the link:**
~~~js
function reverseRec(head) {
  if (head === null || head.next === null) return head; // base case
  const newHead = reverseRec(head.next); // reverse everything after head
  head.next.next = head;  // make the next node point back to head
  head.next = null;       // head becomes the new tail
  return newHead;         // propagated unchanged
}
~~~

~~~
recursion unwinds from the tail:
  reverse(3)=3; back at 2: 3.next=2, 2.next=null; back at 1: 2.next=1, 1.next=null
~~~

Key points: in the **iterative** version, you MUST save \`curr.next\` before overwriting it (or you lose the rest of the list) — that's the classic bug. Return **\`prev\`** (the new head), not \`curr\` (which is null at the end). The **recursive** version's trick is \`head.next.next = head\` (the node after head now points back to head) then \`head.next = null\`.

Complexity: iterative **O(n)/O(1)**, recursive **O(n)/O(n)** stack (risk of stack overflow on very long lists — prefer iterative in production). Follow-up: "Reverse in groups of k" (LeetCode 25 — harder), "reverse a sublist between positions m and n." This is THE most common linked-list warmup; be able to write both fluently and explain the pointer dance.`,
        },
        {
          q: "Detect a cycle — explain Floyd's two-pointer algorithm.",
          answer: `Detect whether a linked list has a cycle using **Floyd's Tortoise and Hare**: two pointers move at different speeds (slow +1, fast +2). If there's a **cycle**, the fast pointer eventually **laps** and meets the slow one inside the loop. If fast reaches \`null\`, there's **no cycle**. **O(n) time, O(1) space** — no extra hash set.

~~~js
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;       // +1
    fast = fast.next.next;  // +2
    if (slow === fast) return true; // they met -> cycle
  }
  return false;             // fast hit null -> no cycle
}
~~~

~~~
no cycle: fast races to null -> false
cycle:    fast laps the loop and lands on slow -> true
  slow:  s s s s
  fast:  f   f   f   (gains 1 step per move -> must collide inside the loop)
~~~

Why they're guaranteed to meet in a cycle: once both are in the loop, the fast pointer gains **one step per iteration** on slow, so the gap shrinks by 1 each move and must reach 0 — they collide (the gap can't "jump over" because it changes by exactly 1).

**Bonus — find the cycle's START node** (Floyd's full algorithm, common follow-up): after they meet, reset one pointer to head and advance **both at speed 1**; they meet at the cycle's entrance (by the math: distance from head to start = distance from meeting point to start, mod loop length):
~~~js
function detectCycleStart(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) {                 // found a cycle
      let p = head;
      while (p !== slow) { p = p.next; slow = slow.next; }
      return p;                          // cycle entry node
    }
  }
  return null;
}
~~~

Complexity: **O(n) time, O(1) space.** The alternative — a **hash set** of visited nodes — is O(n) time but O(n) space; Floyd's is preferred for the constant space. Edge cases: empty list, single node (cycle only if it points to itself), the \`fast && fast.next\` guard prevents null-deref. Follow-up: "Cycle length?" Once they meet, advance one pointer around until it returns. "Why +2 not +3?" Any faster speed works but +2 is simplest and guarantees no "skipping over" the meeting.`,
        },
        {
          q: "Merge two sorted linked lists.",
          answer: `Given two sorted linked lists, merge them into one sorted list by reusing the existing nodes. The cleanest iterative solution uses a **dummy head** plus a moving tail pointer. At each step, attach the smaller node and advance that list. **O(n + m) time, O(1) extra space.**

~~~js
function mergeTwoLists(l1, l2) {
  const dummy = { next: null };
  let tail = dummy;

  while (l1 && l2) {
    if (l1.val <= l2.val) {
      tail.next = l1;
      l1 = l1.next;
    } else {
      tail.next = l2;
      l2 = l2.next;
    }
    tail = tail.next;
  }

  tail.next = l1 || l2; // append the remainder
  return dummy.next;
}
~~~

~~~
dummy -> build result
l1: 1 -> 3 -> 5
l2: 2 -> 4 -> 6
pick smaller each time -> 1 -> 2 -> 3 -> 4 -> 5 -> 6
~~~

Why the dummy node helps: it removes the special case for the very first node of the merged list. \`tail\` always points at the last merged node, so attaching the next smallest node is uniform every iteration.

This is basically the merge step from merge sort, just on linked lists. Since the inputs are already sorted, you never need to look back or insert in the middle.

Complexity: **O(n + m) time, O(1) extra space** if you relink existing nodes. Follow-up: "Recursive version?" Elegant but uses call stack. "Merge k sorted lists?" Usually a min-heap or divide-and-conquer.`,
        },
        {
          q: "Add two numbers represented by linked lists.",
          answer: `Each linked list stores a non-negative integer in **reverse digit order**, so \`2 -> 4 -> 3\` means 342. Add the two numbers the same way you do grade-school addition: walk both lists together, add corresponding digits plus a **carry**, and create result nodes as you go. **O(max(n, m)) time, O(max(n, m)) output space.**

~~~js
function addTwoNumbers(l1, l2) {
  const dummy = { next: null };
  let tail = dummy;
  let carry = 0;

  while (l1 || l2 || carry) {
    const x = l1 ? l1.val : 0;
    const y = l2 ? l2.val : 0;
    const sum = x + y + carry;

    carry = Math.floor(sum / 10);
    tail.next = { val: sum % 10, next: null };
    tail = tail.next;

    if (l1) l1 = l1.next;
    if (l2) l2 = l2.next;
  }

  return dummy.next;
}
// 2->4->3  +  5->6->4  =  7->0->8   (342 + 465 = 807)
~~~

~~~
digit by digit:
  2 + 5 = 7, carry 0
  4 + 6 = 10 -> write 0, carry 1
  3 + 4 + 1 = 8
~~~

The key interview detail is the loop condition: \`while (l1 || l2 || carry)\`. That final \`carry\` check handles cases like 999 + 1 = 1000, where you need one extra node after both lists end.

Why linked lists are used here: you can stream through each number from least-significant digit to most-significant digit without reversing anything. If digits were stored in forward order, you'd either reverse the lists or use stacks.

Complexity: **O(max(n, m)) time** and the result list takes **O(max(n, m)) space**. This is one of the most repeated linked-list interview questions because it checks pointer comfort, carry handling, and edge cases all at once. Follow-up: "Digits stored forward?" Reverse first or use stacks. "Can you modify in place?" Sometimes, but clarify whether mutating inputs is allowed.`,
        },
        {
          q: "Implement an LRU Cache using HashMap + Doubly Linked List.",
          answer: `An **LRU (Least Recently Used) Cache** evicts the least-recently-used item when full. The optimal design gives **O(1) get and put** by combining a **HashMap** (key -> node, for O(1) lookup) with a **doubly linked list** (ordering by recency: most-recent at the head, least-recent at the tail, for O(1) move/evict).

~~~js
class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();                 // key -> node
    this.head = { };                      // dummy head (most recent side)
    this.tail = { };                      // dummy tail (least recent side)
    this.head.next = this.tail; this.tail.prev = this.head;
  }
  _remove(node) { node.prev.next = node.next; node.next.prev = node.prev; }
  _addFront(node) {                       // insert right after head
    node.next = this.head.next; node.prev = this.head;
    this.head.next.prev = node; this.head.next = node;
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node); this._addFront(node); // mark as most recently used
    return node.val;
  }
  put(key, val) {
    if (this.map.has(key)) this._remove(this.map.get(key));
    const node = { key, val };
    this._addFront(node); this.map.set(key, node);
    if (this.map.size > this.cap) {        // evict LRU (just before tail)
      const lru = this.tail.prev;
      this._remove(lru); this.map.delete(lru.key);
    }
  }
}
~~~

~~~
HashMap: key -> node (O(1) find)
DLL:  head <-> [most recent] <-> ... <-> [least recent] <-> tail
  get/put: move/insert node at head (O(1));  evict: remove node before tail (O(1))
~~~

Why this structure: you need **two** O(1) operations — **lookup by key** (HashMap) and **reorder by recency / evict the oldest** (doubly linked list lets you remove/move any node in O(1) given its pointer, and the tail gives instant access to the LRU). A singly linked list can't remove in O(1) (no prev pointer); an array reorders in O(n). Dummy head/tail nodes eliminate null-edge bugs.

**JS shortcut (worth mentioning):** JavaScript's **\`Map\` preserves insertion order**, so you can implement LRU with just a Map — on \`get\`, delete and re-set the key (moves it to the "newest" position); evict via \`map.keys().next().value\` (oldest). But interviewers usually want the **explicit HashMap + DLL** to prove you understand the data structures.

Complexity: **O(1) get and put, O(capacity) space.** This is one of the most common senior frontend DSA questions. Production tie-in: LRU is exactly how browser caches, Next.js in-memory route caches, and image caches decide what to evict. Follow-up: "LFU cache?" (evict least *frequently* used — needs frequency buckets, harder). "Thread-safety/TTL?" Add expiry timestamps + lazy eviction.`,
        },
        {
          q: "Find the kth node from the end in one pass.",
          answer: `Find the kth node from the end **without** first computing the length (which would be two passes). Use the **two-pointer gap technique**: advance a \`fast\` pointer k nodes ahead, then move \`fast\` and \`slow\` together until \`fast\` reaches the end — \`slow\` is now k from the end. **O(n) time, O(1) space, single pass.**

~~~js
function kthFromEnd(head, k) {
  let fast = head, slow = head;
  for (let i = 0; i < k; i++) {           // move fast k steps ahead
    if (!fast) return null;               // k larger than list -> invalid
    fast = fast.next;
  }
  while (fast) { fast = fast.next; slow = slow.next; } // move together
  return slow;                            // k from the end
}
~~~

~~~
list: 1 2 3 4 5,  k=2
  fast jumps ahead 2:   slow=1, fast=3
  move both until fast=null:  slow=4, fast=null
  -> 4 is 2nd from the end ✓
~~~

Why it works: keep a **fixed gap of k** between the two pointers. When \`fast\` (the leader) hits the end, \`slow\` (the follower) is exactly k behind it — i.e., k from the end. The gap is established once, then both move at the same speed.

A common **variant — remove the kth/nth node from the end** (LeetCode 19): use a **dummy node** before head so removing the head is uniform, and stop \`slow\` at the node **before** the target:
~~~js
function removeNthFromEnd(head, n) {
  const dummy = { next: head };
  let fast = dummy, slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next; // gap of n+1 so slow stops BEFORE target
  while (fast) { fast = fast.next; slow = slow.next; }
  slow.next = slow.next.next;            // unlink the nth-from-end node
  return dummy.next;
}
~~~

Complexity: **O(n) time, O(1) space, one pass.** Edge cases: **k > length** (return null / clarify behavior), **k = length** (the head), removing the head (dummy node handles it), empty list. The interviewer's point is proving you can do it in **one pass** with the gap technique rather than length-then-traverse. Follow-up: "Middle node?" Same family — slow/fast where fast moves 2x. "What if k is 1-indexed vs 0-indexed?" Clarify upfront.`,
        },
      ],
      tip: "LRU Cache = O(1) get and put using HashMap + DLL. Very common senior frontend interview question.",
      rajnishAngle:
        "LRU Cache is directly applicable — browser cache eviction, Next.js in-memory route cache.",
    },
    {
      title: "Stacks & Queues",
      subtopics: ["Monotonic stack", "Valid parentheses", "Next greater element", "Sliding window maximum", "Queue using stacks"],
      questions: [
        {
          q: "Validate a string of brackets — (), {}, [].",
          answer: `Check that every opening bracket has a matching, correctly-**nested** closing bracket. The classic **stack** problem: push openers, and on a closer verify it matches the **most recent** opener (top of stack). **O(n) time, O(n) space.**

~~~js
function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') {
      stack.push(c);                 // opener -> push
    } else {
      if (stack.pop() !== pairs[c]) return false; // closer must match top
    }
  }
  return stack.length === 0;          // all openers matched
}
// "()[]{}" -> true;  "(]" -> false;  "([)]" -> false;  "{[]}" -> true
~~~

~~~
why a stack: brackets must close in LIFO order (last opened, first closed)
  "{ [ ( ) ] }"
   push { -> push [ -> push ( -> ) pops ( ✓ -> ] pops [ ✓ -> } pops { ✓ -> empty = valid
  "( [ ) ]"  -> ) tries to pop but top is [ -> mismatch -> invalid
~~~

The two failure modes to handle:
1. **Mismatch** — a closer whose top-of-stack opener doesn't pair (\`([)]\` — the \`)\` finds \`[\` on top). Caught by \`stack.pop() !== pairs[c]\`.
2. **Leftover openers** — string ends with unclosed openers (\`(((\`) -> stack non-empty -> invalid. Caught by the final \`stack.length === 0\`.
3. **Closer with empty stack** — \`)\` when nothing's open -> \`stack.pop()\` returns \`undefined\` !== \`(\` -> false. (Works because pop on empty gives undefined.)

Edge cases: empty string (valid — vacuously), only closers, only openers, single char. Complexity: **O(n) time, O(n) space** (worst case all openers).

This is the foundational stack question; the principle (a stack tracks "what must close next" in LIFO order) generalizes to **matching tags, nested structures, expression parsing**. Follow-up: "Minimum additions to make valid" / "longest valid parentheses" (DP or stack of indices) are harder escalations. "Handle other characters?" Ignore non-bracket chars if the prompt allows mixed input.`,
        },
        {
          q: "Find the next greater element for each element in an array.",
          answer: `For each element, find the **first element to its right that is greater** (or -1 if none). The optimal approach is a **monotonic decreasing stack** — **O(n) time** (each element pushed/popped once) instead of the brute-force O(n²) nested scan.

~~~js
function nextGreater(nums) {
  const res = new Array(nums.length).fill(-1);
  const stack = []; // holds INDICES, values decreasing from bottom to top
  for (let i = 0; i < nums.length; i++) {
    // current element is the "next greater" for everything smaller on the stack
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      res[stack.pop()] = nums[i];
    }
    stack.push(i);
  }
  return res; // indices left on the stack have no greater element -> stay -1
}
// [2,1,2,4,3] -> [4,2,4,-1,-1]
~~~

~~~
monotonic stack (decreasing): we keep indices waiting for their next-greater
  i=0 val2: stack[2]
  i=1 val1: 1<2 keep -> stack[2,1]
  i=2 val2: 2>1 pop idx1 (res=2); 2 not >2 -> stack[2,2]
  i=3 val4: pops idx2(res4), idx0(res4) -> stack[4]
  i=4 val3: 3<4 -> stack[4,3]   (4 and 3 stay -1)
~~~

Why it's O(n): each index is **pushed once and popped at most once**, so total work is linear despite the inner \`while\`. The stack stays **monotonic decreasing** (in values) — when a bigger element arrives, it resolves the "next greater" for all smaller elements waiting below it, then they're popped.

The pattern (memorize): **"next/previous greater/smaller in O(n)" -> monotonic stack.** Store **indices** (so you can fill the result by position and also compute distances). Direction & comparison vary by variant:
- next **greater** -> decreasing stack, pop while top < current.
- next **smaller** -> increasing stack, pop while top > current.
- **previous** greater/smaller -> iterate left-to-right keeping the stack, the remaining top is the answer.

**Circular variant** (LeetCode 503, "next greater in a circular array") — iterate \`2n\` times with \`i % n\`. Complexity: **O(n) time, O(n) space.** Applications: stock span, daily temperatures, largest rectangle in histogram all use monotonic stacks. Follow-up: "Daily temperatures (days until warmer)" -> same template, store index distance. "Why store indices not values?" To write results by position and compute gaps.`,
        },
        {
          q: "Find the maximum in every sliding window of size k.",
          answer: `Given an array and window size k, output the max of each contiguous window. The optimal is a **monotonic deque** (double-ended queue) holding **indices** of useful candidates in **decreasing value order** — **O(n) time** (each index enters/leaves once), beating the naive O(n·k).

~~~js
function maxSlidingWindow(nums, k) {
  const dq = [];       // indices, values DECREASING front->back
  const res = [];
  for (let i = 0; i < nums.length; i++) {
    // 1) drop indices out of the window (front is oldest)
    if (dq.length && dq[0] <= i - k) dq.shift();
    // 2) drop smaller values from the back (they can never be max while this one exists)
    while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
    dq.push(i);
    // 3) once the first window is formed, the front is the max
    if (i >= k - 1) res.push(nums[dq[0]]);
  }
  return res;
}
// nums=[1,3,-1,-3,5,3,6,7], k=3 -> [3,3,5,5,6,7]
~~~

~~~
deque holds indices, values decreasing; FRONT = current window's max
  window [1,3,-1]: deque idx of 3 at front -> max 3
  slide: remove out-of-window from front, pop smaller from back, front stays the max
~~~

Why the deque works (two invariants):
1. **Decreasing values** — before pushing \`i\`, pop all back elements with value ≤ \`nums[i]\`, because while \`nums[i]\` is in the window those smaller earlier elements can **never** be the max (they're older and smaller). This keeps the **front** as the max.
2. **Window validity** — pop from the **front** any index that fell out of the window (\`<= i - k\`).

Each index is added once and removed once -> **O(n) total**, **O(k) space**. The naive approach (scan each window for its max) is O(n·k); a max-heap approach is O(n log k). The deque is optimal.

This is a hard but classic problem demonstrating the **monotonic deque** pattern (a sliding-window variant of the monotonic stack). Edge cases: k=1 (returns the array), k=n (single max), empty input. Frontend tie-in: max/aggregate over a moving time window maps to processing a stream of events/metrics in a rolling window. Follow-up: "Sliding window minimum?" Same with an increasing deque. "Why a deque, not a heap?" Deque gives O(n) by discarding dominated candidates; a heap is O(n log k) and needs lazy deletion of stale entries.`,
        },
        {
          q: "Implement a queue using two stacks.",
          answer: `A queue is **FIFO**; a stack is **LIFO**. Use **two stacks** — an **inbox** (for pushes) and an **outbox** (for pops) — and transfer between them to reverse the order. The trick: only move elements from inbox to outbox when the outbox is **empty**, which gives **amortized O(1)** per operation.

~~~js
class MyQueue {
  constructor() { this.inbox = []; this.outbox = []; }

  push(x) { this.inbox.push(x); }                 // O(1)

  pop() {                                          // amortized O(1)
    this._shift();
    return this.outbox.pop();
  }
  peek() {
    this._shift();
    return this.outbox[this.outbox.length - 1];
  }
  empty() { return this.inbox.length === 0 && this.outbox.length === 0; }

  _shift() {                                       // refill outbox only when empty
    if (this.outbox.length === 0) {
      while (this.inbox.length) this.outbox.push(this.inbox.pop());
    }
  }
}
~~~

~~~
push 1,2,3 -> inbox:[1,2,3]  outbox:[]
pop():  outbox empty -> drain inbox into outbox (reverses): outbox:[3,2,1]
        pop outbox -> 1  (FIFO! first pushed comes out first)
push 4 -> inbox:[4]   pop() -> outbox still [3,2] -> 2 ... drains 4 only when outbox empties
~~~

Why amortized O(1): each element is **moved at most once** from inbox to outbox over its lifetime (pushed to inbox, transferred to outbox, popped). So although a single \`pop\` that triggers a transfer is O(n), each element participates in exactly one transfer — averaged over all operations, it's **O(1) amortized**. The critical rule is **only refill outbox when it's empty** (refilling early would scramble order and break FIFO).

Contrast with the naive "always transfer" approach (transfer to outbox to pop, then transfer back) — that's O(n) **every** operation. The lazy-transfer design is what makes it efficient.

Edge cases: pop/peek on empty (clarify behavior — error or undefined). Complexity: **push O(1), pop/peek amortized O(1), space O(n).**

The reverse problem — **stack using two queues** — is also common (one queue, or rotate on push/pop). This question tests whether you understand FIFO-vs-LIFO and amortized analysis. Follow-up: "Worst-case O(1) per op?" Not with two stacks (some pop is O(n)); requires a different structure. "Why two stacks not one?" One stack can't reverse order for FIFO without auxiliary space.`,
        },
      ],
      tip: "Monotonic stack solves 'next greater/smaller' in O(n). Pattern: push, pop while condition fails.",
      rajnishAngle: "",
    },
    {
      title: "Trees & Binary Search",
      subtopics: ["BFS / DFS traversals", "BST operations", "Level order", "Lowest common ancestor", "Binary search variants"],
      questions: [
        {
          q: "Inorder, preorder, postorder traversal — iterative (no recursion).",
          answer: `Recursion uses the call stack implicitly; iterative versions use an **explicit stack**. The three orders differ in **when** you visit (process) a node relative to its children: **pre** = node before children, **in** = left, node, right, **post** = children before node.

**Preorder (Node -> Left -> Right):** push root; pop and process, then push **right first, left second** (so left is processed next):
~~~js
function preorder(root) {
  const res = [], stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.pop();
    res.push(node.val);                 // process node FIRST
    if (node.right) stack.push(node.right); // right pushed first
    if (node.left) stack.push(node.left);   // left on top -> processed next
  }
  return res;
}
~~~

**Inorder (Left -> Node -> Right):** go left as far as possible pushing nodes, then process and go right:
~~~js
function inorder(root) {
  const res = [], stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; } // dive left
    cur = stack.pop();
    res.push(cur.val);                  // process after left subtree
    cur = cur.right;                    // then go right
  }
  return res;
}
~~~

**Postorder (Left -> Right -> Node):** easiest trick — do a **modified preorder (Node -> Right -> Left)** and **reverse** the result:
~~~js
function postorder(root) {
  const res = [], stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.pop();
    res.push(node.val);
    if (node.left) stack.push(node.left);   // left first
    if (node.right) stack.push(node.right);  // right on top
  }
  return res.reverse();                 // Node->Right->Left reversed = Left->Right->Node
}
~~~

~~~
        1
       / \\
      2   3
     / \\
    4   5
preorder:  1 2 4 5 3   (node, then children)
inorder:   4 2 5 1 3   (left, node, right) — for a BST this is SORTED order
postorder: 4 5 2 3 1   (children, then node)
~~~

Key insights: **inorder of a BST yields sorted values** (a frequent follow-up — validate a BST, find kth smallest). Preorder is used to **serialize/clone** a tree; postorder for **deletion / computing subtree results** (children before parent). All are **O(n) time, O(h) space** (h = height; the stack holds at most a root-to-leaf path).

The postorder "preorder-mirrored-then-reversed" trick is the cleanest; a true single-stack postorder needs tracking the last-visited node (more error-prone). Follow-up: "Why iterative?" Avoids stack-overflow on deep/skewed trees and shows you understand the recursion mechanics. "Morris traversal?" O(1) space inorder using threaded links — advanced.`,
        },
        {
          q: "Find the lowest common ancestor of two nodes in a BST.",
          answer: `The **LCA** of two nodes is the deepest node that is an ancestor of **both**. In a **BST** you can exploit the ordering for an elegant **O(h) time, O(1) space** solution: walk down from the root — if both targets are **smaller** than the current node, go left; if both **larger**, go right; otherwise the current node is the **split point** = LCA.

~~~js
function lowestCommonAncestor(root, p, q) {
  let node = root;
  while (node) {
    if (p.val < node.val && q.val < node.val) {
      node = node.left;        // both in left subtree
    } else if (p.val > node.val && q.val > node.val) {
      node = node.right;       // both in right subtree
    } else {
      return node;             // split point (or one equals node) -> LCA
    }
  }
  return null;
}
~~~

~~~
BST:        6
          /   \\
         2     8
        / \\   / \\
       0   4 7   9
LCA(2,8): 2<6 and 8>6 -> they split at 6 -> LCA = 6
LCA(2,4): both <6 -> go left to 2; 2 is ancestor of 4 (and itself) -> LCA = 2
~~~

Why it works: in a BST, all left-subtree values < node < all right-subtree values. If **both** targets are on the same side, the LCA must be deeper on that side, so descend. The **first** node where the targets **diverge** (one ≤ node ≤ other, i.e., they go to different sides, or one *is* the node) is the lowest node that's an ancestor of both — the LCA.

Complexity: **O(h)** (height — O(log n) balanced, O(n) skewed), **O(1) space** (iterative, no recursion stack). This is much simpler than the **general binary tree** LCA (which has no ordering): there you recurse, returning a node if it equals p or q, and the LCA is where left and right subtrees each return non-null:
~~~js
function lcaGeneral(root, p, q) {           // for a NON-BST binary tree
  if (!root || root === p || root === q) return root;
  const l = lcaGeneral(root.left, p, q);
  const r = lcaGeneral(root.right, p, q);
  if (l && r) return root;                  // p and q on different sides -> LCA
  return l || r;                            // both on one side (or none)
}
~~~

Edge cases: one node is an ancestor of the other (the ancestor is the LCA — handled by the \`else\`/equality), nodes not present (clarify assumption). Follow-up: "Why is the BST version simpler/faster?" The ordering lets you decide direction in O(1) per step without exploring subtrees — O(h) vs the general O(n). "Nodes might not exist?" Add presence checks if not guaranteed.`,
        },
        {
          q: "Level order traversal of a binary tree.",
          answer: `Level order = **breadth-first traversal**, visiting nodes level by level (top to bottom, left to right). Use a **queue (BFS)**, processing one full level per outer iteration by capturing the queue's size at the start of each level. **O(n) time, O(n) space** (queue holds up to the widest level).

~~~js
function levelOrder(root) {
  const res = [];
  if (!root) return res;
  const queue = [root];
  while (queue.length) {
    const levelSize = queue.length;   // nodes in THIS level (snapshot)
    const level = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();     // dequeue
      level.push(node.val);
      if (node.left) queue.push(node.left);   // enqueue children for next level
      if (node.right) queue.push(node.right);
    }
    res.push(level);                  // one array per level
  }
  return res;
}
~~~

~~~
        3
       / \\
      9   20
         /  \\
        15   7
queue BFS by level -> [[3],[9,20],[15,7]]
  loop: snapshot size, drain exactly that many, enqueue their children
~~~

The crucial trick is **\`levelSize = queue.length\` captured before the inner loop** — it freezes how many nodes belong to the current level, so the children enqueued during the loop (the next level) aren't processed until the next outer iteration. This cleanly separates levels.

Complexity: **O(n) time** (each node enqueued/dequeued once), **O(n) space** (queue can hold the widest level, up to ~n/2 leaves). Note: \`Array.shift()\` is O(n); for large inputs use an index pointer or a real queue to keep dequeue O(1).

**Common variants** (all the same BFS skeleton):
- **Zigzag/spiral** order — reverse alternate levels (or push to a deque).
- **Right side view** — take the last node of each level.
- **Level averages / max per level** — aggregate the \`level\` array.
- **Bottom-up level order** — \`res.unshift(level)\` or reverse at the end.

This is THE canonical BFS-on-a-tree question and the basis for many follow-ups. Contrast with DFS (pre/in/post) which goes deep first. Follow-up: "Right side view?" Last element of each level array. "Connect next pointers per level?" Use the level grouping. "Why BFS not DFS here?" Level order is inherently breadth-first — a queue naturally yields it.`,
        },
        {
          q: "Search in a rotated sorted array using binary search.",
          answer: `A sorted array rotated at some pivot (e.g. \`[4,5,6,7,0,1,2]\`) — find a target in **O(log n)** with **modified binary search**. The trick: even after rotation, **at least one half of any \`[lo, hi]\` range is still sorted**; determine which half is sorted, check if the target lies within it, and discard the other half.

~~~js
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);   // avoid overflow
    if (nums[mid] === target) return mid;

    if (nums[lo] <= nums[mid]) {        // LEFT half is sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; // target in left
      else lo = mid + 1;
    } else {                            // RIGHT half is sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; // target in right
      else hi = mid - 1;
    }
  }
  return -1;
}
// [4,5,6,7,0,1,2], target 0 -> index 4
~~~

~~~
[4 5 6 7 | 0 1 2]   mid=7: left [4..7] sorted. target 0 not in [4,7) -> search right
[0 1 2]             standard binary search -> found
key: one side of mid is always sorted; use it to decide where target can be
~~~

The logic per step:
1. Compute mid; if it's the target, done.
2. **Which half is sorted?** If \`nums[lo] <= nums[mid]\`, the **left** half is sorted; else the **right** half is sorted.
3. **Is the target in the sorted half's range?** If yes, search that half; otherwise search the other half. Because one half is guaranteed sorted, the range check is reliable.

This keeps it **O(log n)** — each step halves the search space. Complexity: **O(log n) time, O(1) space.**

Edge cases / pitfalls: use \`lo + (hi-lo)/2\` not \`(lo+hi)/2\` (overflow in languages with fixed ints; good habit). The \`<=\` in \`nums[lo] <= nums[mid]\` matters for handling small ranges/equal elements. **Duplicates** (LeetCode 81) break the "which half is sorted" check when \`nums[lo] == nums[mid] == nums[hi]\` — then you can only shrink \`lo++, hi--\`, degrading to O(n) worst case.

Related variant: **find the minimum / rotation pivot** in a rotated sorted array (binary search comparing \`nums[mid]\` to \`nums[hi]\`). This problem tests whether you can adapt binary search's invariant to a twisted input — a senior favorite. Follow-up: "With duplicates?" Handle the equal-ends case (O(n) worst). "Find pivot first then search?" Works (find min index, then binary search the correct segment) but the one-pass version above is cleaner.`,
        },
      ],
      tip: "Binary search template: lo=0, hi=n-1, mid = lo + (hi-lo)/2. Never (lo+hi)/2 — integer overflow risk.",
      rajnishAngle: "",
    },
    {
      title: "Hashmaps & Sets",
      subtopics: ["Frequency counting", "Two Sum pattern", "Group anagrams", "Subarray sum = k", "Longest consecutive sequence"],
      questions: [
        {
          q: "Two Sum — find indices of two numbers that add to a target.",
          answer: `Find two indices whose values sum to \`target\`. The optimal is a **single-pass hash map**: for each number, check if its **complement** (\`target - num\`) was already seen; if so, you have the pair. **O(n) time, O(n) space** — beats the brute-force O(n²) nested loop.

~~~js
function twoSum(nums, target) {
  const seen = new Map(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];        // the complement
    if (seen.has(need)) return [seen.get(need), i]; // found the pair
    seen.set(nums[i], i);                 // remember this value's index
  }
  return [];                              // no solution
}
// nums=[2,7,11,15], target=9 -> [0,1]  (2 + 7)
~~~

~~~
single pass, remembering what we've seen:
  i=0 num=2, need=7 -> not seen -> store {2:0}
  i=1 num=7, need=2 -> SEEN at 0 -> return [0,1]
~~~

Why one pass works: instead of checking the complement against *future* elements (which would need a second loop), you check against **already-seen** elements stored in the map. By the time the second number of a valid pair is reached, the first is already in the map — so you find it in O(1). Storing *after* the check prevents using the same element twice.

**Complexity comparison (the point of the question):**
~~~
brute force:  two nested loops -> O(n²) time, O(1) space
hash map:     one pass -> O(n) time, O(n) space   <- trade space for time
sort + two ptr: O(n log n), O(1) — but loses original indices (needs index tracking)
~~~

This is the canonical "**O(n) + find a pair/sum -> reach for a HashMap**" pattern. The hash map trades space for time, turning O(n²) into O(n).

Edge cases / clarifications: exactly one solution assumed (else return first found or all pairs); can the same index be reused? (no — store after checking); duplicate values (\`[3,3]\`, target 6 -> the map handles it since you check before overwriting). Follow-up: "Return all pairs / count pairs" -> don't return early; handle duplicates carefully. "Sorted input?" Two-pointer O(n)/O(1) (but indices change after sort). "Three Sum?" Sort + fix one element + two-pointer for the rest, O(n²). Two Sum is the building block for many sum problems.`,
        },
        {
          q: "Group anagrams from a list of strings.",
          answer: `Group strings that are anagrams of each other. The trick: anagrams share a **canonical key** — either the **sorted characters** or a **character-frequency signature**. Use a hash map from that key to the list of strings.

**Approach A — sorted-string key (simplest):**
~~~js
function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = s.split('').sort().join(''); // "eat" -> "aet"
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
}
// ["eat","tea","tan","ate","nat","bat"] -> [["eat","tea","ate"],["tan","nat"],["bat"]]
~~~

**Approach B — frequency-count key (faster for long strings, O(n·k) not O(n·k log k)):**
~~~js
function groupAnagramsFreq(strs) {
  const map = new Map();
  for (const s of strs) {
    const count = new Array(26).fill(0);
    for (const c of s) count[c.charCodeAt(0) - 97]++;
    const key = count.join('#');          // e.g. "1#0#0#...#1" — unique per multiset
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.values()];
}
~~~

~~~
canonical key groups anagrams:
  "eat"-> "aet"     "tea"-> "aet"   "ate"-> "aet"   } same key -> one group
  "tan"-> "ant"     "nat"-> "ant"                   } another group
~~~

Why a canonical key: anagrams are exactly the strings with the **same multiset of characters**. Both sorting and frequency-counting produce an identical key for anagrams and distinct keys otherwise — so a hash map naturally buckets them.

**Complexity:**
~~~
sorted key:  O(n · k log k)   (n strings, k = max length, sort each)
freq key:    O(n · k)          (count chars, no sort) — better for long strings
space:       O(n · k)
~~~
The frequency-count key avoids the per-string sort, so it's asymptotically better when strings are long; the sorted key is simpler to write and fine for short strings.

This is a classic **"group by a computed signature -> HashMap"** problem (same family as Two Sum's hash insight). Edge cases: empty strings (key is empty/all-zeros — they group together), case sensitivity / Unicode (the 26-array assumes lowercase a–z; use the sorted-string or a Map-based count for general input). Follow-up: "Why freq key over sorted?" Skips O(k log k) sorting per string. "Unicode?" Use code-point counts in a Map rather than a 26-length array.`,
        },
        {
          q: "Longest consecutive sequence in unsorted array in O(n).",
          answer: `Find the length of the longest run of **consecutive integers** (e.g. \`[100,4,200,1,3,2]\` -> \`1,2,3,4\` -> 4). Sorting would be O(n log n); the **O(n)** trick uses a **hash set** and only starts counting from numbers that are the **beginning** of a sequence.

~~~js
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (!set.has(n - 1)) {            // n is the START of a sequence
      let cur = n, len = 1;
      while (set.has(cur + 1)) { cur++; len++; } // walk the run upward
      best = Math.max(best, len);
    }
  }
  return best;
}
// [100,4,200,1,3,2] -> 4  (1,2,3,4)
~~~

~~~
set = {100,4,200,1,3,2}
  n=100: 99 not in set -> start. 101 not in set -> len 1
  n=4:   3 IS in set -> NOT a start -> skip (don't recount)
  n=1:   0 not in set -> start. has 2,3,4 -> len 4 ✓
~~~

Why it's **O(n)** despite the inner \`while\`: the inner loop only runs for numbers that are a **sequence start** (where \`n-1\` is absent). Each number is **visited by an inner walk at most once** across the whole algorithm (it belongs to exactly one sequence, walked from that sequence's start). So total inner-loop work is O(n), and with the O(1) set lookups the whole thing is **O(n) time, O(n) space**.

The key insight (and the reason naive "for each n, count up" is O(n²)): **only start counting from sequence beginnings.** The \`if (!set.has(n - 1))\` guard ensures each sequence is counted **once**, from its smallest element — without it, you'd recount overlapping runs repeatedly.

Edge cases: empty array (0), duplicates (the Set dedupes them — they don't extend a run), single element (1), negatives (works — they're just integers). Complexity: **O(n) time, O(n) space.**

This is a great "looks like it needs sorting but a hash set gives O(n)" problem — interviewers use it to see if you avoid the obvious O(n log n) and find the start-only optimization. Follow-up: "Return the actual sequence?" Track the start when you update best. "Why not sort?" Sorting is O(n log n); the set approach is strictly better asymptotically. "Memory concern?" The set is O(n) — the space-for-time trade typical of hashing solutions.`,
        },
        {
          q: "Count subarrays whose sum equals k.",
          answer: `Count contiguous subarrays summing to \`k\`. The optimal is **prefix sums + a hash map** of prefix-sum frequencies — **O(n)**, handling negatives (where sliding window fails). Key identity: a subarray \`(i..j]\` sums to \`k\` iff \`prefix[j] - prefix[i] = k\`, i.e. \`prefix[i] = prefix[j] - k\`. So at each j, count how many earlier prefixes equal \`prefix[j] - k\`.

~~~js
function subarraySum(nums, k) {
  const count = new Map([[0, 1]]); // prefixSum -> how many times seen; 0 seen once (empty prefix)
  let sum = 0, res = 0;
  for (const n of nums) {
    sum += n;                       // running prefix sum
    if (count.has(sum - k)) res += count.get(sum - k); // earlier prefixes that complete a k-sum
    count.set(sum, (count.get(sum) || 0) + 1);
  }
  return res;
}
// nums=[1,1,1], k=2 -> 2  ([1,1] at indices 0-1 and 1-2)
~~~

~~~
prefix sums: P0=0, P1=1, P2=2, P3=3   (k=2)
  at P2=2: need an earlier prefix = 2-2 = 0 -> seen once -> +1  (subarray [1,1])
  at P3=3: need 3-2 = 1 -> seen once -> +1                     (subarray [1,1])
  total = 2
~~~

Why the \`{0: 1}\` seed matters: it represents the **empty prefix** before index 0, so subarrays that start at index 0 and sum to k are counted (when \`sum === k\`, \`sum - k === 0\` is found once). Forgetting this is the classic bug (off-by-one undercount).

Why a hash map of **frequencies** (not just presence): the **same prefix sum can occur multiple times** (especially with negatives/zeros), and each occurrence is a distinct valid starting point — so you add the **count**, not 1.

**Why not a sliding window:** sliding window requires the running sum to be monotonic as you expand/shrink, which holds only for **non-negative** arrays. With **negatives**, shrinking doesn't reliably reduce the sum, so the window approach breaks — the prefix-sum + hashmap method is the general solution.

Complexity: **O(n) time, O(n) space.** Edge cases: negative numbers and zeros (handled — that's the whole point vs sliding window), k = 0, empty array. This is the canonical **prefix-sum + hashmap** pattern, generalizing to "subarray with sum/divisibility/property = X." Follow-up: "All non-negative?" A sliding window is O(1) space then. "Subarray sum divisible by k?" Same idea keyed on \`sum % k\` (counts of remainders). "Longest subarray summing to k?" Store the **first index** each prefix occurs and track max length.`,
        },
      ],
      tip: "When you see O(n) + 'find pair/group/sum' — think HashMap first. Trade space for time.",
      rajnishAngle: "",
    },
    {
      title: "JavaScript Array & Object Manipulation",
      subtopics: [
        "map / filter / reduce",
        "dedupe array of objects",
        "groupBy pattern",
        "flatten nested object",
        "immutable nested updates",
      ],
      questions: [
        {
          q: "Remove duplicates from an array of objects by id.",
          answer: `This is a very common JavaScript interview task. The usual pattern is to keep a \`Set\` of seen ids or a \`Map\` keyed by id. Both give **O(n)** time.

**Keep the first occurrence** (common answer):
~~~js
function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const users = [
  { id: 1, name: "Raj" },
  { id: 2, name: "Aman" },
  { id: 1, name: "Raj Updated" },
];

console.log(uniqueById(users));
// [{ id: 1, name: "Raj" }, { id: 2, name: "Aman" }]
~~~

**Keep the last occurrence** using a Map:
~~~js
function uniqueByIdLast(items) {
  const map = new Map();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}
~~~

~~~
Set + filter -> good when you want first occurrence
Map           -> good when you want last occurrence or key-based lookup
~~~

What interviewers check:
- Do you know that \`Set\` only dedupes primitives directly, not object contents
- Can you dedupe objects by a chosen key like \`id\`
- Can you explain first-vs-last occurrence behavior

Complexity: **O(n) time, O(n) space.** Follow-up: "What if id is nested?" Use a getter like \`item.user.id\`. "What if no id?" Build a composite key such as \`\\\${name}-\\\${age}\` if the prompt allows it.`,
        },
        {
          q: "Group an array of objects by a property, like category or age.",
          answer: `This is a classic **reduce** question. Build an object (or Map) where each key points to an array of matching items.

~~~js
function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const group = item[key];
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
}

const products = [
  { name: "iPhone", category: "mobile" },
  { name: "MacBook", category: "laptop" },
  { name: "Samsung", category: "mobile" },
];

console.log(groupBy(products, "category"));
// {
//   mobile: [{...}, {...}],
//   laptop: [{...}]
// }
~~~

Using a \`Map\` is also nice when keys are not strings:
~~~js
function groupByMap(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}
~~~

~~~
reduce -> build the buckets
key    -> decide which bucket the item belongs to
push   -> append the item into that bucket
~~~

Interview one-liner:
"groupBy is just accumulation: compute a key for each item and collect items under that key."

Complexity: **O(n) time, O(n) space.** Follow-up: "Can you count instead of grouping?" Yes, store a number instead of an array. "Can you group by derived key?" Yes, pass a callback like \`user.age >= 30 ? "30+" : "under-30"\`.`,
        },
        {
          q: "Flatten a nested object into dot notation keys.",
          answer: `This is asked to test recursion and object traversal. Example:

~~~js
{
  user: {
    name: "Raj",
    address: {
      city: "Pune"
    }
  }
}
~~~

becomes:

~~~js
{
  "user.name": "Raj",
  "user.address.city": "Pune"
}
~~~

Implementation:
~~~js
function flattenObject(obj, prefix = "", result = {}) {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? \`\${prefix}.\${key}\` : key;

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}
~~~

~~~
root
 └─ user
     └─ address
         └─ city

path built during recursion:
user -> user.address -> user.address.city
~~~

Important interview points:
- Arrays may need special handling depending on the prompt
- \`null\` must not be treated like a nested object
- The path string is carried through recursion

Complexity: **O(n) time** for n keys, **O(h) recursion stack** where h is nesting depth. Follow-up: "How to unflatten it?" Split each dot path and rebuild nested objects. "Handle arrays too?" Either keep them as values or emit keys like \`items.0.name\`, depending on requirements.`,
        },
        {
          q: "How do you update a deeply nested object immutably in JavaScript?",
          answer: `This is very common in frontend interviews because React state updates depend on **new references**. The rule is: copy every level that changes, and keep untouched branches shared.

~~~js
const state = {
  user: {
    profile: {
      name: "Raj",
      city: "Mumbai",
    },
  },
});

const nextState = {
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      city: "Pune",
    },
  },
};
~~~

Why not mutate directly?
~~~js
state.user.profile.city = "Pune"; // mutation
~~~

Because mutation changes the old object in place. In React and similar systems, that can break change detection and cause hard-to-debug bugs.

~~~
copy outer object
  -> copy changed nested object
    -> copy changed inner object
      -> replace the final field
~~~

Interview summary:
"Immutable update means creating new objects along the modified path, while reusing unchanged branches."

If the structure is very deep, libraries like Immer make this easier:
~~~js
const nextState = produce(state, (draft) => {
  draft.user.profile.city = "Pune";
});
~~~

Complexity: depends on nesting depth, usually **O(depth)** new objects created. Follow-up: "Why is immutability useful?" Predictable updates, undo/history, shallow comparison, React re-render correctness. "How to update arrays immutably?" Use \`map\`, \`filter\`, \`slice\`, or spread instead of \`push\`/direct mutation.`,
        },
        {
          q: "What is the difference between map, filter, and reduce in JavaScript?",
          answer: `This sounds basic, but it is one of the most frequently asked JavaScript array questions.

~~~js
const nums = [1, 2, 3, 4];

const doubled = nums.map((n) => n * 2);      // [2, 4, 6, 8]
const evens = nums.filter((n) => n % 2 === 0); // [2, 4]
const sum = nums.reduce((acc, n) => acc + n, 0); // 10
~~~

Meaning:
- \`map\` transforms each item into another item
- \`filter\` keeps only items that match a condition
- \`reduce\` combines the whole array into one result

~~~
map     : one item -> one transformed item
filter  : one item -> keep or discard
reduce  : many items -> one accumulated result
~~~

Easy analogy:
- \`map\` = rewrite every row
- \`filter\` = remove unwanted rows
- \`reduce\` = summarize all rows into one answer

Why interviewers ask this:
- to check whether you really understand array methods
- to see whether you can pick the right tool instead of overusing \`reduce\`

Good senior answer:
"Use map for transformation, filter for selection, and reduce for aggregation. If reduce starts doing too many jobs at once, readability often suffers."

Follow-up: "Can you implement them manually?" Yes, with loops. "Can reduce replace map and filter?" Technically yes, but that usually hurts clarity.`,
        },
        {
          q: "You need to deeply compare two nested objects for equality. How do you approach it?",
          answer: `\`===\` compares references for objects, so \`{a:1} === {a:1}\` is \`false\` — you need to recursively compare structure and values. There's no built-in \`deepEqual\` in JS, so the interview is testing how carefully you handle the edge cases, not just the happy path.

**Basic recursive comparison:**

~~~js
function deepEqual(a, b) {
  if (a === b) return true; // same reference, or same primitive value

  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false; // different types, or one is null/primitive and they weren't === above
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(key =>
    Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key])
  );
}

deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
deepEqual({ a: 1 }, { a: 1, b: 2 });                      // false - key count differs
~~~

**Edge cases a senior answer should call out:**

~~~js
deepEqual(NaN, NaN);          // false with ===, but semantically these ARE equal
deepEqual(new Date(0), new Date(0)); // false - two different Date objects, same time value
deepEqual([1,2,3], {0:1,1:2,2:3,length:3}); // arrays vs array-likes
deepEqual(new Map([["a",1]]), new Map([["a",1]])); // Object.keys() doesn't work on Map/Set at all
~~~

A more complete version handles \`NaN\`, arrays, \`Date\`, \`Map\`/\`Set\` explicitly:

~~~js
function deepEqualRobust(a, b) {
  if (Object.is(a, b)) return true; // Object.is treats NaN === NaN as true, unlike ===

  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key) || !deepEqualRobust(val, b.get(key))) return false;
    }
    return true;
  }

  const keysA = Object.keys(a), keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqualRobust(a[k], b[k]));
}
~~~

In real projects, prefer a battle-tested library (\`lodash.isEqual\`, or \`fast-deep-equal\`) over hand-rolling this — they've already solved circular references, symbol keys, and typed arrays. Writing it from scratch is an interview exercise, not something to ship without a strong reason.

Why it matters: this question tests whether you reach for \`===\` naively (wrong for objects), and whether you think about \`NaN\`, \`Date\`, circular references, and \`Map\`/\`Set\` — not just plain nested objects. Follow-up: "How would you handle circular references?" — track visited object pairs in a \`WeakSet\`/\`WeakMap\` and short-circuit if you've already compared that pair.`,
        },
        {
          q: "splice() vs slice().",
          answer: `These sound alike but behave completely differently — one of the classic "gotcha" pairs in JS interviews.

~~~js
const arr = [1, 2, 3, 4, 5];

// slice(start, end) - does NOT mutate, returns a shallow copy of a portion
const sliced = arr.slice(1, 3);
console.log(sliced); // [2, 3]
console.log(arr);    // [1, 2, 3, 4, 5]  <- unchanged

// splice(start, deleteCount, ...items) - MUTATES the original array, returns removed items
const removed = arr.splice(1, 2);
console.log(removed); // [2, 3]  <- the removed elements
console.log(arr);      // [1, 4, 5]  <- original array is now changed
~~~

Key differences:

~~~text
              slice                     splice
mutates?      no                        yes
returns       the extracted sub-array   the REMOVED elements (not the new array)
use case      read a portion            insert/remove/replace in place
~~~

\`splice\` can also **insert** and **replace**, not just remove:

~~~js
const arr2 = [1, 2, 5];
arr2.splice(2, 0, 3, 4); // insert 3,4 at index 2, delete 0 elements
console.log(arr2); // [1, 2, 3, 4, 5]

arr2.splice(0, 1, 99); // replace 1 element at index 0 with 99
console.log(arr2); // [99, 2, 3, 4, 5]
~~~

Why it matters: in React/Redux-style state management, mutating state directly (accidentally reaching for \`splice\` instead of \`slice\`) breaks reference-equality checks that React relies on for re-renders — a component won't re-render because the array reference didn't change, even though its contents did. This is a very common real bug, not just a trivia question. Follow-up: "How do you remove an item from an array immutably?" — \`arr.filter((_, i) => i !== indexToRemove)\`, or \`[...arr.slice(0,i), ...arr.slice(i+1)]\`, never \`splice\` on state directly.`,
        },
      ],
      tip: "For JS object/array rounds, first clarify whether you should mutate or return a new structure. In frontend interviews, immutable updates are usually preferred.",
      rajnishAngle:
        "These come up constantly in React interviews: deduping API data, grouping lists for rendering, flattening payloads, and updating nested state safely.",
    },
    {
      title: "Recursion & Dynamic Programming",
      subtopics: ["Memoization vs tabulation", "Climbing stairs", "0/1 Knapsack", "Coin change", "LCS", "Fibonacci"],
      questions: [
        {
          q: "Climbing stairs — how many ways to reach step n using 1 or 2 steps?",
          answer: `Count distinct ways to climb n stairs taking 1 or 2 steps at a time. To reach step n, you arrived either from step **n-1** (a 1-step) or step **n-2** (a 2-step) — so \`ways(n) = ways(n-1) + ways(n-2)\`. That's the **Fibonacci** recurrence. Optimal: **O(n) time, O(1) space** with two rolling variables.

~~~js
function climbStairs(n) {
  if (n <= 2) return n;          // 1 way for n=1, 2 ways for n=2
  let a = 1, b = 2;             // ways(1)=1, ways(2)=2
  for (let i = 3; i <= n; i++) {
    [a, b] = [b, a + b];       // ways(i) = ways(i-1) + ways(i-2)
  }
  return b;
}
// n=5 -> 8   (1+1+1+1+1, 1+1+1+2, ... Fibonacci(n+1))
~~~

~~~
ways(n) = ways(n-1) + ways(n-2)
  n: 1 2 3 4 5
  ways: 1 2 3 5 8   (Fibonacci sequence)
~~~

This problem is the **gateway to DP** — interviewers use it to see if you can: (1) find the recurrence, (2) recognize overlapping subproblems, and (3) optimize space. Show the progression:

**1. Naive recursion** — \`climb(n) = climb(n-1) + climb(n-2)\` -> **O(2^n)** (recomputes the same subproblems exponentially). This is the brute force to mention first.

**2. Memoization (top-down)** — cache results so each subproblem computes once -> **O(n)**:
~~~js
function climb(n, memo = {}) {
  if (n <= 2) return n;
  if (memo[n]) return memo[n];
  return (memo[n] = climb(n - 1, memo) + climb(n - 2, memo));
}
~~~

**3. Tabulation (bottom-up)** — fill an array \`dp[i] = dp[i-1] + dp[i-2]\` -> **O(n) time, O(n) space**.

**4. Space-optimized** — only the last two values matter -> **O(1) space** (the rolling version above). The senior answer arrives here.

~~~
naive recursion  O(2^n)  -> memoize  O(n)/O(n)  -> tabulate  O(n)/O(n)  -> rolling  O(n)/O(1)
~~~

The lesson: **DP = recursion + caching overlapping subproblems**; always write the brute-force recurrence first, then optimize. Edge cases: n=0 (1 way — do nothing), n=1, n=2. Follow-up: "Steps of 1, 2, or 3?" \`dp[i] = dp[i-1]+dp[i-2]+dp[i-3]\`. "Cost to climb (min cost stairs)?" A min-DP variant. "Connect to React?" \`useMemo\` is memoization — caching a computed result keyed by inputs, the same idea as the memo here.`,
        },
        {
          q: "Coin change — minimum coins to make amount.",
          answer: `Given coin denominations and a target \`amount\`, find the **minimum number of coins** that sum to it (or -1 if impossible). This is **unbounded knapsack** DP: \`dp[a]\` = fewest coins to make amount \`a\`, built from smaller amounts. **O(amount × coins) time.**

~~~js
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;                          // 0 coins make amount 0
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && dp[a - coin] !== Infinity) {
        dp[a] = Math.min(dp[a], dp[a - coin] + 1); // use one 'coin' on top of dp[a-coin]
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
// coins=[1,2,5], amount=11 -> 3   (5 + 5 + 1)
~~~

~~~
recurrence: dp[a] = min over coins c of ( dp[a - c] + 1 )
  dp[0]=0
  dp[1]=dp[0]+1=1     dp[2]=dp[0]+1=1 (coin 2)   dp[5]=1 (coin 5)
  dp[11]=min(dp[10],dp[9],dp[6])+1 = 3
~~~

The recurrence reasoning: to make amount \`a\`, the **last** coin used is some \`c\` ≤ \`a\`; the rest is the optimal way to make \`a - c\`, which is \`dp[a-c]\`. Try every coin as the last one and take the minimum, +1 for that coin. \`Infinity\` marks "impossible," and \`dp[0] = 0\` is the base case (the empty solution).

Why **bottom-up tabulation**: every \`dp[a]\` depends only on smaller amounts, so filling 0..amount in order guarantees dependencies are ready. It's **unbounded** knapsack because each coin can be reused (the inner loop over coins, with \`dp[a-coin]\`, allows repeats) — contrast with 0/1 knapsack where each item is used once.

Complexity: **O(amount × number_of_coins) time, O(amount) space.** Top-down memoization is equivalent.

Critical distinction interviewers probe: **min coins** vs **number of ways** (Coin Change 2) — the latter counts combinations and requires a different loop order (iterate coins outer, amount inner) to avoid counting permutations. Also note **greedy fails** for arbitrary denominations (e.g. coins \`[1,3,4]\`, amount 6: greedy 4+1+1=3 coins, but optimal 3+3=2) — that's *why* you need DP. Edge cases: amount 0 (-> 0), no coins, impossible amounts (-> -1). Follow-up: "Why not greedy?" Show the counterexample. "Number of ways instead?" Coin Change 2, sum DP with coin-outer loop. "Which coins were used?" Backtrack through dp / store the choice.`,
        },
        {
          q: "Longest common subsequence of two strings.",
          answer: `The **LCS** is the longest sequence of characters appearing in **both** strings in the **same relative order** (not necessarily contiguous — that's the *substring* problem). E.g. LCS of "abcde" and "ace" is "ace" (length 3). Classic **2D DP**: \`dp[i][j]\` = LCS length of the first \`i\` chars of A and first \`j\` chars of B.

~~~js
function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;        // chars match -> extend diagonal
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); // skip one char from A or B
      }
    }
  }
  return dp[m][n];
}
// lcs("abcde","ace") -> 3
~~~

~~~
recurrence:
  if a[i]==b[j]:  dp[i][j] = dp[i-1][j-1] + 1     (match -> take it, move both back)
  else:           dp[i][j] = max(dp[i-1][j], dp[i][j-1])  (drop a char from one string)

        ""  a  c  e
    ""   0  0  0  0
    a    0  1  1  1
    b    0  1  1  1
    c    0  1  2  2
    d    0  1  2  2
    e    0  1  2  3   <- dp[m][n] = 3
~~~

The recurrence reasoning: comparing the last characters of A[0..i] and B[0..j]:
- **Match** -> that char is part of the LCS; add 1 to the LCS of the strings without those chars (\`dp[i-1][j-1]\`).
- **No match** -> the LCS doesn't use both last chars, so it's the best of dropping A's last char (\`dp[i-1][j]\`) or B's last char (\`dp[i][j-1]\`).
The grid is built bottom-up; \`dp[m][n]\` is the answer.

Complexity: **O(m × n) time, O(m × n) space.** Space can be reduced to **O(min(m,n))** by keeping only the previous row (since \`dp[i][j]\` depends on the previous row and the current row's left neighbor) — mention this optimization. To **reconstruct the actual subsequence**, backtrack from \`dp[m][n]\`: on a match move diagonally and record the char, else move toward the larger neighbor.

LCS is the template for a family of string-DP problems: **edit distance** (Levenshtein), **diff** algorithms, **longest common substring** (contiguous variant — reset to 0 on mismatch, track max). Frontend relevance: **diffing** (React's reconciliation conceptually, text diff tools, version control) builds on LCS-style DP. Follow-up: "Reconstruct the LCS string?" Backtrack the table. "Longest common *substring*?" Contiguous — dp resets on mismatch, answer is the max cell. "Edit distance relation?" Same 2D-DP structure with insert/delete/replace costs.`,
        },
        {
          q: "0/1 Knapsack — write the DP recurrence and table.",
          answer: `**0/1 Knapsack**: given items each with a **weight** and **value**, and a knapsack **capacity** W, maximize total value where each item is taken **at most once** ("0/1" = take it or leave it, no fractions). Classic **2D DP**: \`dp[i][w]\` = max value using the first \`i\` items with capacity \`w\`.

**Recurrence** — for each item, choose to **exclude** or **include** it (if it fits):
~~~
dp[i][w] = max(
  dp[i-1][w],                                  // exclude item i
  dp[i-1][w - weight[i]] + value[i]            // include item i (if weight[i] <= w)
)
base: dp[0][w] = 0  (no items -> 0 value)
~~~

~~~js
function knapsack(weights, values, W) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];                       // exclude
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i][w],
          dp[i - 1][w - weights[i - 1]] + values[i - 1]); // include
      }
    }
  }
  return dp[n][W];
}
// weights=[1,3,4,5], values=[1,4,5,7], W=7 -> 9  (items weight 3+4 -> value 4+5)
~~~

~~~
table (rows=items, cols=capacity 0..W); each cell: best value with those items & capacity
       w: 0 1 2 3 4 5 6 7
  {}      0 0 0 0 0 0 0 0
  +w1v1   0 1 1 1 1 1 1 1
  +w3v4   0 1 1 4 5 5 5 5
  +w4v5   0 1 1 4 5 6 6 9   <- item3 (w4,v5) + item2 (w3,v4) = 9 at cap 7
  +w5v7   0 1 1 4 5 7 8 9
answer dp[n][W] = 9
~~~

The core insight — **the include/exclude choice**: for item \`i\` at capacity \`w\`, either you don't take it (value = best without it, \`dp[i-1][w]\`) or you take it (its value plus the best you can do with the **remaining** capacity \`w - weight[i]\` using prior items, \`dp[i-1][w-weight[i]]\`). Take the max. Using \`dp[i-1][...]\` (the previous row) ensures each item is used **at most once** — that's what makes it 0/1 vs unbounded (which would use \`dp[i][...]\`).

Complexity: **O(n × W) time and space.** Space optimizes to **O(W)** with a 1D array iterated **right-to-left** (so each item isn't reused within its own update):
~~~js
const dp = new Array(W + 1).fill(0);
for (let i = 0; i < n; i++)
  for (let w = W; w >= weights[i]; w--)            // REVERSE -> 0/1 (use each item once)
    dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
~~~

Note: 0/1 knapsack is **pseudo-polynomial** (O(nW) depends on the numeric value W, not just input size) and the problem is NP-hard in general. To **recover which items** were chosen, backtrack the table. Variants: **unbounded knapsack** (items reusable — forward 1D loop, like coin change), **subset sum / partition** (knapsack with value=weight). Follow-up: "Fractional knapsack?" Greedy by value/weight ratio (different problem, not DP). "Why reverse loop in 1D?" Forward would let an item be picked multiple times (turning it into unbounded). "Reconstruct items?" Trace back through dp choices.`,
        },
        {
          q: "Fibonacci Series.",
          answer: `The simplest question that still separates candidates by how they reason about time complexity — there are four meaningfully different implementations.

**1. Naive recursion — O(2ⁿ), exponential, avoid in production:**

~~~js
function fibNaive(n) {
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}
~~~

This recomputes the same subproblems repeatedly — \`fib(5)\` calls \`fib(3)\` twice, \`fib(2)\` three times, etc.

~~~text
                fib(5)
              /        \\
          fib(4)        fib(3)
         /      \\      /      \\
     fib(3)   fib(2) fib(2)  fib(1)
     /    \\
  fib(2) fib(1)
      <- fib(3) and fib(2) are recomputed multiple times, wastefully
~~~

**2. Memoized recursion — O(n) time, O(n) space:** cache each result the first time it's computed.

~~~js
function fibMemo(n, memo = {}) {
  if (n <= 1) return n;
  if (n in memo) return memo[n];
  return memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
}
~~~

**3. Iterative — O(n) time, O(1) space** (the answer to reach for in practice — no call stack overhead, no recursion depth limit):

~~~js
function fibIterative(n) {
  let [prev, curr] = [0, 1];
  for (let i = 0; i < n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return prev;
}
~~~

**4. O(1) closed-form (Binet's formula)** — exists but is rarely expected; floating-point precision breaks down for large \`n\`, so it's a "did you know" footnote, not the practical answer.

~~~text
naive recursion:   O(2ⁿ) time, O(n) stack        <- exponential, bad
memoized:          O(n) time,  O(n) space         <- good
iterative:         O(n) time,  O(1) space         <- best in practice
~~~

Why it matters: this is often used as a warm-up specifically to see whether you *notice* the exponential blowup and fix it, not just produce a correct-looking recursive answer. Follow-up: "What's the recursion depth risk?" — naive/memoized recursion for large \`n\` can hit "Maximum call stack size exceeded"; iterative avoids that entirely.`,
        },
        {
          q: "Factorial.",
          answer: `\`n!\` = product of all positive integers up to \`n\`. Simple on the surface, but the interview checks whether you handle edge cases and overflow correctly.

**Recursive:**

~~~js
function factorial(n) {
  if (n < 0) throw new RangeError("factorial is undefined for negative numbers");
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}
~~~

**Iterative** (avoids recursion depth limits for large \`n\`):

~~~js
function factorialIterative(n) {
  if (n < 0) throw new RangeError("factorial is undefined for negative numbers");
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}
~~~

~~~text
factorial(5) = 5 * 4 * 3 * 2 * 1 = 120

call stack (recursive):
factorial(5)
  -> 5 * factorial(4)
       -> 4 * factorial(3)
            -> 3 * factorial(2)
                 -> 2 * factorial(1)
                      -> 1  (base case)
~~~

**Overflow matters in JS specifically:** \`Number\` loses integer precision above \`Number.MAX_SAFE_INTEGER\` (2^53 - 1). \`factorial(20)\` is already \`2,432,902,008,176,640,000\` — right at the edge — and \`factorial(21)+\` silently becomes imprecise. For exact large factorials, use \`BigInt\`:

~~~js
function factorialBigInt(n) {
  let result = 1n;
  for (let i = 2n; i <= BigInt(n); i++) result *= i;
  return result;
}
factorialBigInt(25); // 15511210043330985984000000n  - exact, wouldn't be with Number
~~~

Why it matters: the base cases (0! = 1, negative input) and the overflow/precision discussion are what interviewers actually listen for — a factorial function that silently returns a wrong (imprecise) answer for large inputs is a real bug class, not just an academic point. Follow-up: "Why is 0! defined as 1?" — it's the empty product (multiplying zero numbers together), consistent with combinatorics formulas like \`nPr\` and \`nCr\` needing it to work for edge cases.`,
        },
      ],
      tip: "DP = recursion + memoization. Always write the brute-force recursive solution first, then identify overlapping subproblems.",
      rajnishAngle:
        "React's useMemo is memoization — connect DP concepts to frontend optimization in your answer.",
    },
    {
      title: "Graphs",
      subtopics: ["Adjacency list", "BFS shortest path", "DFS cycle detection", "Topological sort", "Number of islands"],
      questions: [
        {
          q: "Number of islands — count connected components in a 2D grid.",
          answer: `Given a grid of '1' (land) and '0' (water), count the **islands** (groups of land connected horizontally/vertically). Each island is a **connected component**; traverse the grid and run a **flood fill (DFS or BFS)** from each unvisited land cell, marking the whole island visited, incrementing a counter per new island. **O(rows × cols) time.**

~~~js
function numIslands(grid) {
  if (!grid.length) return 0;
  const rows = grid.length, cols = grid[0].length;
  let count = 0;

  function dfs(r, c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] === '0') return;
    grid[r][c] = '0';            // mark visited (sink the land)
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1); // 4 directions
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {  // unvisited land -> new island
        count++;
        dfs(r, c);               // flood-fill the entire island
      }
    }
  }
  return count;
}
~~~

~~~
grid:  1 1 0 0          scan cells; first '1' -> island #1, flood-fill it to 0
       1 1 0 0          next '1' region elsewhere -> island #2, etc.
       0 0 1 0  -> 3 islands
       0 0 0 1
~~~

How it works: scan every cell; when you hit a **'1' not yet visited**, that's a **new island** (count++), then **flood-fill** (DFS/BFS) from it, converting all connected land to '0' (or a visited set) so it's counted **once**. The outer loop guarantees you find every separate component; the flood fill guarantees each is counted a single time.

**DFS vs BFS:** both work and are O(rows×cols). DFS is shorter to write recursively but risks **stack overflow** on a huge all-land grid (deep recursion) — use an explicit stack or **BFS with a queue** for very large grids:
~~~js
// BFS flood fill
const q = [[r, c]]; grid[r][c] = '0';
while (q.length) {
  const [x, y] = q.shift();
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = x+dx, ny = y+dy;
    if (nx>=0 && ny>=0 && nx<rows && ny<cols && grid[nx][ny]==='1') { grid[nx][ny]='0'; q.push([nx,ny]); }
  }
}
~~~

Complexity: **O(rows × cols)** time (each cell visited a constant number of times), **O(rows × cols)** space worst case (recursion/queue). Modifying the grid in place avoids an extra visited array (mention if mutation is allowed; otherwise use a separate \`visited\` set).

This is the canonical **connected-components / flood-fill on a grid** problem. Variants: **max area of island** (return the largest fill size), **number of distinct islands** (canonical shape hashing), **surrounded regions**, **flood fill (paint bucket)**. Follow-up: "Diagonal connections too?" Add the 4 diagonal directions (8-connectivity). "Don't mutate input?" Use a \`visited\` boolean grid/set. "Union-Find alternative?" DSU also counts components in ~O(rows×cols·α) — good if the grid is dynamic.`,
        },
        {
          q: "Detect a cycle in a directed graph using DFS.",
          answer: `Detect whether a **directed** graph has a cycle using DFS with **3 states (colors)** per node: **white** (unvisited), **gray** (in the current DFS path / recursion stack), **black** (fully processed). A cycle exists iff DFS encounters a **gray** node (a **back edge** to an ancestor still on the recursion stack). **O(V + E) time.**

~~~js
function hasCycle(numNodes, adj) {   // adj: Map node -> [neighbors]
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(numNodes).fill(WHITE);

  function dfs(u) {
    color[u] = GRAY;                 // entering: on the current path
    for (const v of (adj.get(u) || [])) {
      if (color[v] === GRAY) return true;        // back edge -> CYCLE
      if (color[v] === WHITE && dfs(v)) return true;
    }
    color[u] = BLACK;                // done: fully explored, off the path
    return false;
  }

  for (let i = 0; i < numNodes; i++) {
    if (color[i] === WHITE && dfs(i)) return true; // check all components
  }
  return false;
}
~~~

~~~
3-color DFS:
  WHITE: not yet visited
  GRAY:  currently in the recursion stack (on the active path)  <- key
  BLACK: finished (all descendants explored)
  hitting a GRAY neighbor = edge back to an ancestor on the path = cycle
~~~

Why **gray** is the crucial state (and why a plain "visited" set is wrong for *directed* graphs): in a directed graph, reaching an already-visited (**black**) node is **fine** — it can be a cross/forward edge, not a cycle. A cycle specifically means an edge to a node **still on the current DFS path** (gray). Distinguishing "on the current path" (gray) from "fully done" (black) is what makes detection correct. A single visited boolean can't tell these apart and gives false positives.

Complexity: **O(V + E)** time (each node and edge examined once), **O(V)** space (color array + recursion stack).

**Contrast with undirected graphs**: there, a cycle is detected when DFS finds a visited neighbor that **isn't the parent** you came from (or via Union-Find) — the parent check matters because the edge back to the parent isn't a cycle. Different rule than directed.

**Alternative — Kahn's algorithm (BFS topological sort):** if you can't produce a valid topological order (some nodes remain with non-zero in-degree), the directed graph has a cycle. Often used when you also want the ordering.

Applications: detecting **circular dependencies** (module imports, build graphs, task scheduling), deadlock detection, validating DAGs. Follow-up: "Undirected version?" Parent-aware DFS or Union-Find. "Also return the cycle?" Track the recursion path and slice from the gray node. "Iterative to avoid stack overflow?" Explicit stack with state, or Kahn's BFS. Frontend tie-in: circular import / dependency-cycle detection in a bundler is exactly this.`,
        },
        {
          q: "Topological sort using DFS and Kahn's (BFS) algorithm.",
          answer: `**Topological sort** orders the nodes of a **DAG** (directed acyclic graph) so that for every edge u->v, **u comes before v**. It only exists if there's **no cycle**. Two standard algorithms — **DFS-based** and **Kahn's (BFS, in-degree based)** — both **O(V + E)**.

**Kahn's algorithm (BFS, in-degree):** repeatedly remove nodes with **in-degree 0** (no remaining prerequisites):
~~~js
function topoKahn(numNodes, adj) {
  const indeg = new Array(numNodes).fill(0);
  for (const [, vs] of adj) for (const v of vs) indeg[v]++;
  const queue = [];
  for (let i = 0; i < numNodes; i++) if (indeg[i] === 0) queue.push(i);
  const order = [];
  while (queue.length) {
    const u = queue.shift();
    order.push(u);
    for (const v of (adj.get(u) || [])) {
      if (--indeg[v] === 0) queue.push(v); // all prereqs of v satisfied
    }
  }
  return order.length === numNodes ? order : []; // shorter -> CYCLE (no valid topo order)
}
~~~

**DFS-based:** DFS each node; **after** fully exploring a node's descendants, **push it onto a stack**; the **reversed** finish order is the topological order:
~~~js
function topoDFS(numNodes, adj) {
  const visited = new Array(numNodes).fill(false);
  const stack = [];
  function dfs(u) {
    visited[u] = true;
    for (const v of (adj.get(u) || [])) if (!visited[v]) dfs(v);
    stack.push(u);                 // post-order: pushed AFTER its dependents
  }
  for (let i = 0; i < numNodes; i++) if (!visited[i]) dfs(i);
  return stack.reverse();          // reverse finish times = topo order
}
~~~

~~~
DAG:  A -> B -> D
       \\-> C ->/
  valid topo orders: A B C D  or  A C B D  (A before B/C; B,C before D)

Kahn:  start with in-degree 0 (A); remove it, decrement B,C; ... peel off layer by layer
DFS:   finish D, then B/C, then A -> reverse -> A, B/C, D
~~~

Why each works:
- **Kahn's**: a node can be placed once all its prerequisites are placed (in-degree hits 0). Peeling in-degree-0 nodes layer by layer yields a valid order. **Bonus: it detects cycles** — if you can't process all nodes (some never reach in-degree 0), there's a cycle. It's also intuitive for "course schedule / build order" framing.
- **DFS**: a node finishes (post-order) only **after** all nodes reachable from it — so it must come **before** them in topo order; reversing finish order gives that. (Cycle detection needs the 3-color variant.)

Complexity: both **O(V + E)** time, **O(V)** space. Choose **Kahn's** when you want easy **cycle detection** and a natural "process when ready" model (and it can yield lexicographically-smallest order with a min-heap); choose **DFS** when recursion is natural or you're already doing DFS.

Applications: **build systems / task scheduling** (compile order), **course prerequisites** (LeetCode 207/210), dependency resolution (npm/module load order), spreadsheet cell recalculation. Follow-up: "Detect cycle?" Kahn's: \`order.length < numNodes\`; DFS: 3-color. "Multiple valid orders?" Yes — any order respecting edges; use a heap in Kahn's for a deterministic/lexicographic one. "Real-world?" Resolving the order to build/load interdependent modules — directly a topo sort.`,
        },
        {
          q: "Shortest path between two nodes (BFS, unweighted graph).",
          answer: `In an **unweighted** graph, **BFS** finds the shortest path (fewest edges) from a source because it explores nodes in **increasing order of distance** — level by level. The first time BFS reaches the target, it's via a shortest path. **O(V + E) time.**

~~~js
function shortestPath(adj, start, target) {
  const visited = new Set([start]);
  const queue = [[start, 0]];          // [node, distance]
  const parent = new Map([[start, null]]); // for path reconstruction
  while (queue.length) {
    const [node, dist] = queue.shift();
    if (node === target) return { dist, path: rebuild(parent, target) };
    for (const next of (adj.get(node) || [])) {
      if (!visited.has(next)) {
        visited.add(next);             // mark on ENQUEUE (not dequeue) -> avoids dupes
        parent.set(next, node);
        queue.push([next, dist + 1]);
      }
    }
  }
  return { dist: -1, path: [] };        // unreachable
}
function rebuild(parent, target) {
  const path = [];
  for (let n = target; n != null; n = parent.get(n)) path.unshift(n);
  return path;
}
~~~

~~~
BFS expands in rings of equal distance from start:
  dist 0: [start]
  dist 1: neighbors
  dist 2: their neighbors ...
  first time target is dequeued/seen = shortest (fewest edges)
~~~

Why BFS gives the shortest path here: it processes all nodes at distance d before any at distance d+1, so when it first reaches the target, no shorter route exists. Mark nodes **visited when enqueued** (not when dequeued) to avoid adding the same node multiple times. Track \`parent\` pointers to **reconstruct** the actual path by walking back from target to start.

Complexity: **O(V + E)** time, **O(V)** space.

**Crucial caveat — only for UNWEIGHTED (or uniform-weight) graphs.** With **weighted** edges, BFS is wrong (fewest edges ≠ lowest total weight); you need:
~~~
unweighted / equal weights : BFS               O(V + E)
non-negative weights       : Dijkstra (heap)   O((V + E) log V)
weights incl. negatives    : Bellman-Ford      O(V · E)
all-pairs                  : Floyd-Warshall    O(V³)
grid/heuristic available   : A* (Dijkstra + heuristic)
~~~

This question tests whether you know **BFS = shortest path for unweighted** and can name the right algorithm when weights appear (a common follow-up trap). Applications: shortest route in a maze/grid, fewest-hops in a network, degrees of separation, word-ladder. Follow-up: "Weighted edges?" Switch to Dijkstra. "All shortest paths / multiple targets?" Multi-source BFS or BFS storing all parents. "Grid shortest path?" BFS treating cells as nodes with 4/8-neighbor edges. "0/1 weights?" 0-1 BFS with a deque.`,
        },
      ],
      tip: "BFS for shortest path. DFS for connectivity, cycle detection, topo sort. Know both Kahn's and DFS topo sort.",
      rajnishAngle: "",
    },
    {
      title: "Frontend Machine Coding",
      subtopics: ["Debounce / throttle", "Deep clone", "Event emitter", "Promise.all polyfill", "Flatten nested array", "Virtual DOM diff"],
      questions: [
        {
          q: "Implement debounce from scratch.",
          answer: `**Debounce** delays invoking a function until a pause of \`ms\` with no new calls — each call **resets** the timer. Used so an action fires only after the user *stops* (typing, resizing). The mechanism is a **closure** holding the timer id across calls.

~~~js
function debounce(fn, ms) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);                       // cancel the pending call
    timer = setTimeout(() => fn.apply(this, args), ms); // schedule anew
  }
  debounced.cancel = () => clearTimeout(timer); // allow cancellation
  return debounced;
}

const onSearch = debounce((q) => fetchResults(q), 300);
input.addEventListener('input', (e) => onSearch(e.target.value));
~~~

~~~
keystrokes:  r  e  a  c  t              (each within 300ms)
timers:      x  x  x  x  └─ 300ms quiet ─▶ fn("react") fires ONCE
~~~

Key implementation points interviewers check:
- **Closure over \`timer\`** — persists between calls; that's the whole trick.
- **\`clearTimeout\` then re-\`setTimeout\`** on every call — resets the wait window.
- **Preserve \`this\` and \`args\`** — use \`fn.apply(this, args)\` (or an arrow capturing args) so it works as an object method and forwards arguments.
- **\`.cancel()\`** — a nice-to-have to clear a pending invocation (e.g. on unmount).

**Leading-edge / immediate option** (fire on the first call, then suppress) — a common follow-up:
~~~js
function debounce(fn, ms, immediate = false) {
  let timer;
  return function (...args) {
    const callNow = immediate && !timer;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; if (!immediate) fn.apply(this, args); }, ms);
    if (callNow) fn.apply(this, args);
  };
}
~~~

**debounce vs throttle** (always contrast them): debounce waits for a **pause** (fires once after activity stops — good for search input, autosave); throttle fires **at most once per interval** during continuous activity (good for scroll/resize/mousemove).

Complexity: O(1) per call. Edge cases: calling after cancel, rapid bursts, leading vs trailing. Production tie-in: debounced search/autocomplete inputs (paired with request cancellation to fix out-of-order responses). This is one of the **most common machine-coding questions** — write it fluently, then offer the immediate/cancel extensions and the throttle contrast. Follow-up: "Add a maxWait?" (fire at least every maxWait even during continuous calls — like lodash). "Why closure?" The timer must survive between invocations.`,
        },
        {
          q: "Implement throttle from scratch.",
          answer: `**Throttle** ensures a function runs **at most once per \`ms\` interval**, no matter how often it's called — ideal for high-frequency events (scroll, resize, mousemove) where you want regular-but-limited execution. Two common implementations: **timestamp-based** and **timer-based**.

**Timestamp-based (leading edge — fires immediately, then every \`ms\`):**
~~~js
function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {     // enough time passed since last run?
      last = now;
      fn.apply(this, args);
    }
  };
}
~~~

**Timer-based (trailing edge — runs at the end of each interval):**
~~~js
function throttle(fn, ms) {
  let timer = null;
  return function (...args) {
    if (timer) return;          // within the cooldown -> ignore
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;             // open the gate again
    }, ms);
  };
}
~~~

~~~
calls (continuous):  | | | | | | | | | | | |
debounce:                                  └─▶ fires ONCE after they stop
throttle(ms):        ▶───ms───▶───ms───▶   fires at a steady max rate
~~~

The distinction from debounce (state it clearly — interviewers pair them):
- **Throttle** = "at most once per interval" -> **regular** firing during continuous activity. Use for **scroll/resize/mousemove/drag**, rate-limiting API calls, analytics sampling.
- **Debounce** = "fire after a pause" -> fires **once** when activity stops. Use for **search input, autosave, resize-settled**.

Key points: the **timestamp** version fires on the **leading** edge (immediate first call); the **timer** version fires on the **trailing** edge (after the interval). A full implementation (like lodash's) supports **both leading and trailing** options and forwards the latest args for the trailing call:
~~~js
function throttle(fn, ms, { leading = true, trailing = true } = {}) {
  let last = 0, timer = null, lastArgs = null;
  return function (...args) {
    const now = Date.now();
    if (!last && !leading) last = now;
    const remaining = ms - (now - last);
    lastArgs = args;
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now; fn.apply(this, args);
    } else if (trailing && !timer) {
      timer = setTimeout(() => { last = leading ? Date.now() : 0; timer = null; fn.apply(this, lastArgs); }, remaining);
    }
  };
}
~~~

Complexity O(1) per call; closure holds \`last\`/\`timer\`. Production tie-in: throttling scroll handlers on the news feed (e.g. infinite-scroll checks, sticky-header logic) to keep the main thread free and protect INP. Follow-up: "Leading vs trailing?" Explain the edge difference and when each matters. "throttle vs debounce for scroll?" Throttle (you want periodic updates during scroll, not just after it ends). "Use rAF instead?" For visual/scroll work, \`requestAnimationFrame\` throttling aligns updates to frames.`,
        },
        {
          q: "Write a deep clone function (handle circular references).",
          answer: `A **deep clone** recursively copies an object so the copy shares **no references** with the original (mutating one doesn't affect the other) — unlike a shallow copy (\`{...obj}\`/\`Object.assign\`) which copies only the top level. The hard parts: **recursion** for nested structures, **handling special types** (Date, Array, Map, Set), and **circular references** (an object referencing itself -> infinite loop without protection).

~~~js
function deepClone(value, seen = new WeakMap()) {
  // primitives & functions -> return as-is
  if (value === null || typeof value !== 'object') return value;

  // circular reference -> return the already-cloned copy
  if (seen.has(value)) return seen.get(value);

  // special object types
  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof Map) {
    const m = new Map(); seen.set(value, m);
    for (const [k, v] of value) m.set(deepClone(k, seen), deepClone(v, seen));
    return m;
  }
  if (value instanceof Set) {
    const s = new Set(); seen.set(value, s);
    for (const v of value) s.add(deepClone(v, seen));
    return s;
  }

  // array or plain object
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);                 // register BEFORE recursing (handles cycles)
  for (const key of Reflect.ownKeys(value)) {  // include symbol keys
    copy[key] = deepClone(value[key], seen);
  }
  return copy;
}
~~~

~~~
circular ref handling:
  const a = {}; a.self = a;
  deepClone(a):
    register a -> copy in WeakMap (seen)
    cloning a.self -> seen.has(a) -> return the copy  (no infinite loop) ✓
~~~

The crucial mechanisms:
1. **WeakMap of seen objects** — before recursing into an object's properties, **register** the original->copy mapping. If you encounter the same object again (a cycle), return the existing copy instead of recursing forever. (WeakMap so it doesn't leak.)
2. **Register the copy *before* recursing** into children — otherwise a cycle back to the parent wouldn't find the in-progress copy.
3. **Type handling** — Date/RegExp/Map/Set need special construction; \`Reflect.ownKeys\` to include **symbol** keys; arrays vs plain objects.
4. **Primitives/functions** returned as-is (functions are typically shared, not cloned).

**The modern shortcut to mention:** **\`structuredClone(value)\`** is a built-in that deep-clones (and handles cycles, Map/Set/Date/typed arrays) — the idiomatic production choice. But it **can't clone functions, DOM nodes, or symbols** and throws on them; \`JSON.parse(JSON.stringify(x))\` is the naive approach but **loses** functions/undefined/Dates(->string)/Map/Set and **breaks on cycles** — good to cite as what *not* to rely on.

~~~
JSON method:    simple but loses Date/Map/Set/undefined/functions, dies on cycles
structuredClone: built-in deep clone (cycles, Map/Set/Date) — but no functions/DOM
hand-rolled:    full control (this answer) — interview expects you to handle cycles
~~~

Complexity: **O(n)** in the number of properties; WeakMap keeps it linear even with shared/cyclic refs. Follow-up: "Why WeakMap not Map/Set?" Weak refs + keying by object identity to detect revisits without leaking. "structuredClone limitations?" No functions/DOM/symbols. "Getters/prototypes?" This copies own enumerable+symbol keys as data; preserving prototype chain/descriptors needs \`Object.create(Object.getPrototypeOf(value))\` + \`getOwnPropertyDescriptors\`.`,
        },
        {
          q: "Implement Promise.all polyfill.",
          answer: `\`Promise.all\` runs promises concurrently, resolves with an array of results **in input order** when **all** fulfill, and **rejects on the first** rejection. The key tricks: preserve **index order** despite out-of-order settling, and use a **counter** to know when all are done.

~~~js
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) return resolve([]);   // empty -> resolve immediately

    items.forEach((item, i) => {
      Promise.resolve(item).then(              // wrap non-promises too
        (value) => {
          results[i] = value;                  // store by INDEX (preserve order)
          if (--remaining === 0) resolve(results); // last one -> done
        },
        reject                                 // first rejection -> reject all
      );
    });
  });
}

// usage
promiseAll([Promise.resolve(1), 2, Promise.resolve(3)]).then(console.log); // [1,2,3]
~~~

~~~
inputs settle out of order, but results are index-keyed:
  inputs:   [ p0 , p1 , p2 ]
  settle:    p2 , p0 , p1
  results:  results[2], results[0], results[1] -> [r0, r1, r2] (input order)
  counter:  3 -> 2 -> 1 -> 0  => resolve
~~~

Points interviewers verify:
1. **Index storage** (\`results[i] = value\`) — never \`push\`, which would scramble order since promises settle out of order.
2. **Counter** (\`remaining\`) — detect "all done"; you can't rely on the last array slot being filled because completion order is arbitrary. (Don't use \`results.length\` since a slot could hold \`undefined\` legitimately.)
3. **\`Promise.resolve(item)\`** — so non-promise values in the array are handled (\`Promise.all([1, p])\` works).
4. **Empty input** -> resolve with \`[]\` immediately (else \`remaining\` never decrements).
5. **First rejection wins** — pass \`reject\` directly; once the outer promise rejects, later settlements are no-ops (settle-once semantics). Others keep running (no cancellation) — same as native.

This is one of the **top frontend machine-coding questions** — practice until you can write it in a few minutes. Complexity: O(n) to set up; concurrency = all at once.

**Variants you should be ready to add:**
- **\`allSettled\`** — same skeleton, never reject; store \`{status, value/reason}\` and only count down.
- **\`race\`** — attach \`resolve, reject\` to all; first to settle wins (no array/counter).
- **\`any\`** — first to *fulfill* wins; reject with \`AggregateError\` only if all reject.

Follow-up: "Now allSettled" (one-line change to the handlers). "Why index not push?" Out-of-order settling. "What if the iterable is empty?" Resolve \`[]\` immediately — the classic edge case people forget.`,
        },
        {
          q: "Flatten a deeply nested array to any depth.",
          answer: `Flatten an arbitrarily nested array into a single-level array, e.g. \`[1,[2,[3,[4]]]] -> [1,2,3,4]\`. Several clean approaches; know recursion, reduce, and an iterative stack version (to avoid stack overflow on deep nesting).

**Recursive:**
~~~js
function flatten(arr) {
  const result = [];
  for (const item of arr) {
    if (Array.isArray(item)) result.push(...flatten(item)); // recurse into nested arrays
    else result.push(item);
  }
  return result;
}
~~~

**Reduce (concise functional):**
~~~js
const flatten = (arr) =>
  arr.reduce((acc, item) =>
    acc.concat(Array.isArray(item) ? flatten(item) : item), []);
~~~

**Iterative with a stack (no recursion -> safe for very deep nesting):**
~~~js
function flatten(arr) {
  const stack = [...arr];
  const result = [];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) stack.push(...item); // push children back to process
    else result.push(item);
  }
  return result.reverse(); // pop reverses order -> reverse to restore
}
~~~

**Flatten to a specific depth (like native \`Array.prototype.flat(depth)\`):**
~~~js
function flattenDepth(arr, depth = 1) {
  if (depth < 1) return arr.slice();
  return arr.reduce((acc, item) =>
    acc.concat(Array.isArray(item) ? flattenDepth(item, depth - 1) : item), []);
}
~~~

~~~
[1, [2, [3, [4]]]]
  recurse/stack into each nested array until items are non-arrays
  -> [1, 2, 3, 4]
~~~

Key points:
- **Base case** — non-array item gets pushed; array item recurses (or is pushed back on the stack).
- **\`Array.isArray\`** to test nesting (not \`typeof\`, since arrays are objects).
- The **iterative stack** version avoids deep recursion -> no stack overflow on pathologically deep arrays (a thoughtful senior touch). Note it reverses order due to \`pop\`, so reverse at the end (or use an index-based queue).
- The **native** \`arr.flat(Infinity)\` does this in one line — mention it, but interviewers want the from-scratch version.

Complexity: **O(n)** in total elements (each visited once). Edge cases: empty arrays, deeply nested single chains, mixed types, non-array input (guard if needed). Follow-up: "To a given depth?" The \`flattenDepth\` version. "Why iterative?" Avoid call-stack overflow on extreme depth. "Generator version?" Yield items lazily for memory efficiency on huge structures. "Native?" \`flat(Infinity)\` — but know the manual implementation.`,
        },
        {
          q: "Implement a simple EventEmitter (on, off, emit).",
          answer: `An **EventEmitter** implements the **publish/subscribe (Observer)** pattern: components **subscribe** to named events with \`on\`, **unsubscribe** with \`off\`, and a publisher **broadcasts** with \`emit\`, invoking all subscribed callbacks. Store a map of event name -> list of listeners.

~~~js
class EventEmitter {
  constructor() { this.events = new Map(); } // eventName -> Set of listeners

  on(event, listener) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event).add(listener);
    return () => this.off(event, listener);  // return an unsubscribe fn (handy)
  }

  off(event, listener) {
    this.events.get(event)?.delete(listener);
  }

  emit(event, ...args) {
    // copy before iterating so a listener that removes itself doesn't break the loop
    const listeners = this.events.get(event);
    if (!listeners) return false;
    for (const fn of [...listeners]) fn(...args);
    return true;
  }

  once(event, listener) {                    // fire at most once
    const wrapper = (...args) => { this.off(event, wrapper); listener(...args); };
    this.on(event, wrapper);
  }
}

// usage
const bus = new EventEmitter();
const unsub = bus.on('login', (user) => console.log('hi', user));
bus.emit('login', 'Raj');   // "hi Raj"
unsub();                    // or bus.off('login', listener)
~~~

~~~
on('x', fn)  ─▶ register fn under 'x'
emit('x', a) ─▶ call every fn registered for 'x' with (a)
off('x', fn) ─▶ remove fn
   publishers and subscribers are decoupled (Observer pattern)
~~~

Design points interviewers look for:
- **Map of event -> Set of listeners** — Set gives O(1) add/remove and auto-dedupes identical listeners. (A plain object + array also works; Set is cleaner.)
- **\`on\` returns an unsubscribe function** — ergonomic teardown (mirrors modern APIs / React effect cleanup).
- **\`emit\` iterates a *copy*** of the listeners — so a listener that calls \`off\` (removes itself or others) mid-emit doesn't corrupt the iteration. A subtle correctness point.
- **\`once\`** — wrap the listener to remove itself after firing.
- Pass through **\`...args\`** to listeners; consider **error isolation** (try/catch per listener so one throwing listener doesn't stop the rest) in a robust version.

This is the **Observer/PubSub** pattern — the foundation of event systems (DOM events, Node's EventEmitter, Redux subscriptions, analytics buses). Complexity: \`on\`/\`off\` O(1), \`emit\` O(k) for k listeners. Edge cases: emit with no listeners (no-op), removing during emit (handled by the copy), duplicate listeners (Set dedupes). Production tie-in: an analytics/event bus where components publish events and a tracker subscribes — decoupled publishers/subscribers. Follow-up: "Memory leaks?" Listeners not removed pile up (and capture closures) — always provide/use \`off\`/unsubscribe. "Wildcard events / namespaces?" Extend the matching. "Error in a listener?" Wrap each call in try/catch so one failure doesn't block others.`,
        },
      ],
      tip: "These are THE most common frontend machine coding questions. Practice each from scratch — no looking up.",
      rajnishAngle:
        "Debounce on search inputs, throttle on scroll handlers on NBT — you use these in production. Lead with that.",
    },
  ],
});
