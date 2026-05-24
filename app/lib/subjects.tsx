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

import { type SubjectNames } from "./subjectnames"
import { subjectIcons } from "./subjecticons"
import i18n from "../i18n"
import { Image, type ImageProps } from "@unpic/react"

export type SubjectIconProps = Omit<ImageProps, "src" | "alt" | "layout" | "aspectRatio">

export type SubjectMetadata = {
  icon: string
  labelKey: string
}

export const subjects: Record<SubjectNames, SubjectMetadata> = {
  art: {
    icon: subjectIcons.art,
    labelKey: "subjects.art",
  },
  biology: {
    icon: subjectIcons.biology,
    labelKey: "subjects.biology",
  },
  computerScience: {
    icon: subjectIcons.computerScience,
    labelKey: "subjects.computerScience",
  },
  dutch: {
    icon: subjectIcons.dutch,
    labelKey: "subjects.dutch",
  },
  economics: {
    icon: subjectIcons.economics,
    labelKey: "subjects.economics",
  },
  english: {
    icon: subjectIcons.english,
    labelKey: "subjects.english",
  },
  french: {
    icon: subjectIcons.french,
    labelKey: "subjects.french",
  },
  geography: {
    icon: subjectIcons.geography,
    labelKey: "subjects.geography",
  },
  german: {
    icon: subjectIcons.german,
    labelKey: "subjects.german",
  },
  greek: {
    icon: subjectIcons.greek,
    labelKey: "subjects.greek",
  },
  history: {
    icon: subjectIcons.history,
    labelKey: "subjects.history",
  },
  latin: {
    icon: subjectIcons.latin,
    labelKey: "subjects.latin",
  },
  math: {
    icon: subjectIcons.math,
    labelKey: "subjects.math",
  },
  music: {
    icon: subjectIcons.music,
    labelKey: "subjects.music",
  },
  other: {
    icon: subjectIcons.other,
    labelKey: "subjects.other",
  },
  physics: {
    icon: subjectIcons.physics,
    labelKey: "subjects.physics",
  },
  chemistry: {
    icon: subjectIcons.chemistry,
    labelKey: "subjects.chemistry",
  },
  spanish: {
    icon: subjectIcons.spanish,
    labelKey: "subjects.spanish",
  }
}

export class Subject {
  public getIcon(subject: SubjectNames, props: SubjectIconProps = {}) {
    const metadata = subjects[subject]

    if (!metadata) {
      return <Image
        src={subjectIcons.other}
        alt={this.getSubjectNameById("other")}
        layout="fixed"
        width={24}
        height={24}
        {...props}
      />
    }
    
    return (
      <Image
        src={metadata.icon}
        alt={this.getSubjectNameById(subject)}
        layout="fixed"
        width={24}
        height={24}
        {...props}
      />
    )
  }

  public getSubjectNameById(id: SubjectNames): string {
    const metadata = subjects[id]
    return i18n.t(metadata.labelKey || id)
  }
}
