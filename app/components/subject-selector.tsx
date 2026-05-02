import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { SubjectNamesArray, type SubjectNames } from "~/lib/subjectnames";
import { Subject } from "~/lib/subjects";

export default function SubjectSelector({
  selected,
  onSelect,
  open,
  onOpenChange,
  subjects,
}: {
  selected: SubjectNames;
  onSelect: (id: SubjectNames) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0">
              {subjects.getIcon(selected, { width: 20, height: 20, className: "size-5 rounded-sm" })}
            </span>
            <span className="truncate">{subjects.getSubjectNameById(selected)}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-2" align="start" portalled={false}>
        <div className="px-1 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Kies een vak
        </div>
        <div className="grid max-h-80 gap-1 overflow-y-auto overscroll-contain [touch-action:pan-y]">
          {SubjectNamesArray.map((subjectId) => {
            const isSelected = subjectId === selected;

            return (
              <button
                key={subjectId}
                type="button"
                className={
                  "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-muted" +
                  (isSelected ? " bg-muted font-medium" : "")
                }
                onClick={() => {
                  onSelect(subjectId);
                  onOpenChange(false);
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">
                    {subjects.getIcon(subjectId, { width: 20, height: 20, className: "size-5 rounded-sm" })}
                  </span>
                  <span className="truncate">{subjects.getSubjectNameById(subjectId)}</span>
                </span>
                {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
