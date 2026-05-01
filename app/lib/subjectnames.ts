// In environments where React is not available (e.g Vitest) and we need the subject names you can import them from this file instead of subjects.tsx, else it will error

export const SubjectNamesArray = [
  "math",
  "english",
  "german",
  "history",
  "geography",
  "art",
  "music",
  "computerScience",
  "economics",
  "biology",
  "physics",
  "greek",
  "latin",
  "other",
  "dutch",
  "french",
  "spanish",
  "chemistry"
] as const

export type SubjectNames = (typeof SubjectNamesArray)[number]
