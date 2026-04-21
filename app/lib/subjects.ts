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
  "chemistry",
  "physics",
  "greek",
  "latin",
  "other",
  "dutch",
  "french",
  "spanish",
] as const

export type SubjectNames = (typeof SubjectNamesArray)[number]
