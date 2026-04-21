import UnknownIcon from "../img/subjects/Unknown.svg"
import Biology from "../img/subjects/Biology.svg"
import Dutch from "../img/subjects/Dutch.svg"
import English from "../img/subjects/English.svg"
import French from "../img/subjects/French.svg"
import Geography from "../img/subjects/Geography.svg"
import German from "../img/subjects/German.svg"
import Greek from "../img/subjects/Greek.svg"
import History from "../img/subjects/History.svg"
import Latin from "../img/subjects/Latin.svg"
import Math from "../img/subjects/Math.svg"
import Physics from "../img/subjects/Physics.svg"
import Spanish from "../img/subjects/Spanish.svg"

import type { SubjectNames } from "./subjectnames"

export const subjectIcons: Record<SubjectNames, string> = {
  art: UnknownIcon,
  biology: Biology,
  computerScience: UnknownIcon,
  dutch: Dutch,
  economics: UnknownIcon,
  english: English,
  french: French,
  geography: Geography,
  german: German,
  greek: Greek,
  history: History,
  latin: Latin,
  math: Math,
  music: UnknownIcon,
  other: UnknownIcon,
  physics: Physics,
  spanish: Spanish,
}