// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

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
