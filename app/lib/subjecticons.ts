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