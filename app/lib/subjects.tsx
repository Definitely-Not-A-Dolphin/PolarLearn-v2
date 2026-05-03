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
    return i18n.t(metadata.labelKey)
  }
}
