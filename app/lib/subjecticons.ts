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

import UnknownIcon from "../img/subjects/Other.svg"
import Biology from "../img/subjects/Biology.svg"
import Dutch from "../img/subjects/Dutch.svg"
import English from "../img/subjects/English.svg"
import French from "../img/subjects/French.svg"
import Geography from "../img/subjects/Geography.svg"
import German from "../img/subjects/German.svg"
import Greek from "../img/subjects/Greek.svg"
import History from "../img/subjects/History.svg"
import Latin from "../img/subjects/Latin.svg"
import Math from "../img/subjects/Mathematics.svg"
import Physics from "../img/subjects/Physics.svg"
import Spanish from "../img/subjects/Spanish.svg"
import Chemistry from "../img/subjects/Chemistry.svg"
import Art from "../img/subjects/Art.svg?inline"
import ComputerScience from "../img/subjects/ComputerScience.svg"
import Economics from "../img/subjects/Economics.svg"
import Music from "../img/subjects/Music.svg"

import type { SubjectNames } from "./subjectnames"

export const subjectIcons: Record<SubjectNames, string> = {
  art: Art,
  biology: Biology,
  computerScience: ComputerScience,
  dutch: Dutch,
  economics: Economics,
  english: English,
  french: French,
  geography: Geography,
  german: German,
  greek: Greek,
  history: History,
  latin: Latin,
  math: Math,
  music: Music,
  other: UnknownIcon,
  physics: Physics,
  spanish: Spanish,
  chemistry: Chemistry,
}