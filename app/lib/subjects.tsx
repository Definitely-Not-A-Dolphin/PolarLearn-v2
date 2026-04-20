import { Image, type ImageProps } from "@unpic/react"

import i18n from "../i18n"
import { subjectIcons } from "./subjecticons.ts"
import { SubjectNamesArray, type SubjectNames } from "./subjects.ts"

export type { SubjectNames }
export { SubjectNamesArray }

export type SubjectIconProps = Omit<ImageProps, "src" | "alt" | "layout" | "aspectRatio">

type SubjectMetadata = {
  icon: ImageProps["src"]
  labelKey: string
  defaultLabel: string
}

export const subjects: Record<SubjectNames, SubjectMetadata> = {
  art: {
    icon: subjectIcons.art,
    labelKey: "subjects.art",
    defaultLabel: "Art",
  },
  biology: {
    icon: subjectIcons.biology,
    labelKey: "subjects.biology",
    defaultLabel: "Biology",
  },
  chemistry: {
    icon: subjectIcons.chemistry,
    labelKey: "subjects.chemistry",
    defaultLabel: "Chemistry",
  },
  computerScience: {
    icon: subjectIcons.computerScience,
    labelKey: "subjects.computerScience",
    defaultLabel: "Computer Science",
  },
  dutch: {
    icon: subjectIcons.dutch,
    labelKey: "subjects.dutch",
    defaultLabel: "Dutch",
  },
  economics: {
    icon: subjectIcons.economics,
    labelKey: "subjects.economics",
    defaultLabel: "Economics",
  },
  english: {
    icon: subjectIcons.english,
    labelKey: "subjects.english",
    defaultLabel: "English",
  },
  french: {
    icon: subjectIcons.french,
    labelKey: "subjects.french",
    defaultLabel: "French",
  },
  geography: {
    icon: subjectIcons.geography,
    labelKey: "subjects.geography",
    defaultLabel: "Geography",
  },
  german: {
    icon: subjectIcons.german,
    labelKey: "subjects.german",
    defaultLabel: "German",
  },
  greek: {
    icon: subjectIcons.greek,
    labelKey: "subjects.greek",
    defaultLabel: "Greek",
  },
  history: {
    icon: subjectIcons.history,
    labelKey: "subjects.history",
    defaultLabel: "History",
  },
  latin: {
    icon: subjectIcons.latin,
    labelKey: "subjects.latin",
    defaultLabel: "Latin",
  },
  math: {
    icon: subjectIcons.math,
    labelKey: "subjects.math",
    defaultLabel: "Math",
  },
  music: {
    icon: subjectIcons.music,
    labelKey: "subjects.music",
    defaultLabel: "Music",
  },
  other: {
    icon: subjectIcons.other,
    labelKey: "subjects.other",
    defaultLabel: "Other",
  },
  physics: {
    icon: subjectIcons.physics,
    labelKey: "subjects.physics",
    defaultLabel: "Physics",
  },
  spanish: {
    icon: subjectIcons.spanish,
    labelKey: "subjects.spanish",
    defaultLabel: "Spanish",
  },
} satisfies Record<SubjectNames, SubjectMetadata>

export class Subject {
  public getIcon(subject: SubjectNames, props: SubjectIconProps = {}) {
    const metadata = subjects[subject]

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
    return i18n.t(metadata.labelKey, { defaultValue: metadata.defaultLabel })
  }
}