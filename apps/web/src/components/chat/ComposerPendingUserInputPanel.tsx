import { type ApprovalRequestId } from "@t3tools/contracts";
import { memo, useCallback, useEffect, useRef } from "react";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";

import { type PendingUserInput } from "../../session-logic";
import {
  buildPendingUserInputAnswers,
  derivePendingUserInputProgress,
} from "../../pendingUserInput";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { cn } from "~/lib/utils";

interface PendingUserInputPanelProps {
  pendingUserInputs: PendingUserInput[];
  respondingRequestIds: ApprovalRequestId[];
  answers: Record<string, unknown>;
  questionIndex: number;
  onSelectOption: (questionId: string, optionLabel: string) => void;
  onUpdateAnswer: (fieldId: string, value: unknown) => void;
  onAdvance: () => void;
  onSubmit: () => void;
}

export const ComposerPendingUserInputPanel = memo(function ComposerPendingUserInputPanel({
  pendingUserInputs,
  respondingRequestIds,
  answers,
  questionIndex,
  onSelectOption,
  onUpdateAnswer,
  onAdvance,
  onSubmit,
}: PendingUserInputPanelProps) {
  if (pendingUserInputs.length === 0) return null;
  const activePrompt = pendingUserInputs[0];
  if (!activePrompt) return null;

  return (
    <ComposerPendingUserInputCard
      key={activePrompt.requestId}
      prompt={activePrompt}
      isResponding={respondingRequestIds.includes(activePrompt.requestId)}
      answers={answers}
      questionIndex={questionIndex}
      onSelectOption={onSelectOption}
      onUpdateAnswer={onUpdateAnswer}
      onAdvance={onAdvance}
      onSubmit={onSubmit}
    />
  );
});

const ComposerPendingUserInputCard = memo(function ComposerPendingUserInputCard({
  prompt,
  isResponding,
  answers,
  questionIndex,
  onSelectOption,
  onUpdateAnswer,
  onAdvance,
  onSubmit,
}: {
  prompt: PendingUserInput;
  isResponding: boolean;
  answers: Record<string, unknown>;
  questionIndex: number;
  onSelectOption: (questionId: string, optionLabel: string) => void;
  onUpdateAnswer: (fieldId: string, value: unknown) => void;
  onAdvance: () => void;
  onSubmit: () => void;
}) {
  if (prompt.request.kind === "questionnaire") {
    return (
      <QuestionnaireCard
        prompt={prompt}
        isResponding={isResponding}
        answers={answers}
        questionIndex={questionIndex}
        onSelectOption={onSelectOption}
        onAdvance={onAdvance}
      />
    );
  }

  if (prompt.request.kind === "form") {
    const resolvedAnswers = buildPendingUserInputAnswers(prompt.request, answers);
    return (
      <div className="space-y-3 px-4 py-3 sm:px-5">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
            {prompt.request.title ?? "Additional input required"}
          </span>
          {prompt.request.description ? (
            <p className="text-sm text-foreground/90">{prompt.request.description}</p>
          ) : null}
        </div>
        <div className="space-y-3">
          {prompt.request.fields.map((field) => {
            const value = answers[field.id] ?? field.defaultValue;
            return (
              <label key={field.id} className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  {field.label}
                  {field.required ? <span className="text-muted-foreground/60"> *</span> : null}
                </span>
                {field.description ? (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                ) : null}
                {field.input === "textarea" ? (
                  <Textarea
                    value={typeof value === "string" ? value : ""}
                    disabled={isResponding}
                    placeholder={field.placeholder}
                    onChange={(event) => onUpdateAnswer(field.id, event.currentTarget.value)}
                  />
                ) : field.input === "boolean" ? (
                  <span className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2">
                    <Checkbox
                      checked={Boolean(value)}
                      disabled={isResponding}
                      onCheckedChange={(checked) => onUpdateAnswer(field.id, Boolean(checked))}
                    />
                    <span className="text-sm text-foreground/85">Enable</span>
                  </span>
                ) : field.input === "choice" ? (
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none"
                    value={typeof value === "string" ? value : ""}
                    disabled={isResponding}
                    onChange={(event) => onUpdateAnswer(field.id, event.currentTarget.value)}
                  >
                    <option value="">Select an option</option>
                    {(field.options ?? []).map((option) => (
                      <option
                        key={`${field.id}:${String(option.value)}`}
                        value={String(option.value)}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    nativeInput
                    type={field.input === "number" ? "number" : field.input}
                    value={
                      typeof value === "string" || typeof value === "number" ? String(value) : ""
                    }
                    disabled={isResponding}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      onUpdateAnswer(
                        field.id,
                        field.input === "number"
                          ? event.currentTarget.value === ""
                            ? ""
                            : Number(event.currentTarget.value)
                          : event.currentTarget.value,
                      )
                    }
                  />
                )}
              </label>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button disabled={isResponding || resolvedAnswers === null} onClick={onSubmit}>
            {prompt.request.submitLabel ?? "Submit"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-3 sm:px-5">
      <div className="space-y-1">
        <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
          {prompt.request.title ?? "External step required"}
        </span>
        {prompt.request.description ? (
          <p className="text-sm text-foreground/90">{prompt.request.description}</p>
        ) : null}
        {prompt.request.instructions ? (
          <p className="text-xs text-muted-foreground">{prompt.request.instructions}</p>
        ) : null}
      </div>
      <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
        <a
          href={prompt.request.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {prompt.request.openLabel ?? "Open link"}
          <ExternalLinkIcon className="size-3.5" />
        </a>
        <p className="mt-1 break-all text-xs text-muted-foreground">{prompt.request.url}</p>
      </div>
      <div className="flex justify-end">
        <Button disabled={isResponding} onClick={onSubmit}>
          {prompt.request.completionLabel ?? "Continue"}
        </Button>
      </div>
    </div>
  );
});

const QuestionnaireCard = memo(function QuestionnaireCard({
  prompt,
  isResponding,
  answers,
  questionIndex,
  onSelectOption,
  onAdvance,
}: {
  prompt: PendingUserInput;
  isResponding: boolean;
  answers: Record<string, unknown>;
  questionIndex: number;
  onSelectOption: (questionId: string, optionLabel: string) => void;
  onAdvance: () => void;
}) {
  if (prompt.request.kind !== "questionnaire") {
    return null;
  }
  const progress = derivePendingUserInputProgress(prompt.request, answers, questionIndex);
  const activeQuestion = progress.activeQuestion;
  const autoAdvanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current !== null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const selectOptionAndAutoAdvance = useCallback(
    (questionId: string, optionLabel: string) => {
      onSelectOption(questionId, optionLabel);
      if (autoAdvanceTimerRef.current !== null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        onAdvance();
      }, 200);
    },
    [onAdvance, onSelectOption],
  );

  useEffect(() => {
    if (!activeQuestion || isResponding) return;
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      if (
        target instanceof HTMLElement &&
        target.isContentEditable &&
        progress.customAnswer.length > 0
      ) {
        return;
      }
      const digit = Number.parseInt(event.key, 10);
      if (Number.isNaN(digit) || digit < 1 || digit > 9) return;
      const option = activeQuestion.options[digit - 1];
      if (!option) return;
      event.preventDefault();
      selectOptionAndAutoAdvance(activeQuestion.id, option.label);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeQuestion, isResponding, progress.customAnswer.length, selectOptionAndAutoAdvance]);

  if (!activeQuestion) {
    return null;
  }

  return (
    <div className="px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {prompt.request.questions.length > 1 ? (
            <span className="flex h-5 items-center rounded-md bg-muted/60 px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground/60">
              {questionIndex + 1}/{prompt.request.questions.length}
            </span>
          ) : null}
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
            {activeQuestion.header}
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-sm text-foreground/90">{activeQuestion.question}</p>
      <div className="mt-3 space-y-1">
        {activeQuestion.options.map((option, index) => {
          const isSelected = progress.selectedOptionLabel === option.label;
          const shortcutKey = index < 9 ? index + 1 : null;
          return (
            <button
              key={`${activeQuestion.id}:${option.label}`}
              type="button"
              disabled={isResponding}
              onClick={() => selectOptionAndAutoAdvance(activeQuestion.id, option.label)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-150",
                isSelected
                  ? "border-blue-500/40 bg-blue-500/8 text-foreground"
                  : "border-transparent bg-muted/20 text-foreground/80 hover:border-border/40 hover:bg-muted/40",
                isResponding && "cursor-not-allowed opacity-50",
              )}
            >
              {shortcutKey !== null ? (
                <kbd
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-medium tabular-nums transition-colors duration-150",
                    isSelected
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-muted/40 text-muted-foreground/50 group-hover:bg-muted/60 group-hover:text-muted-foreground/70",
                  )}
                >
                  {shortcutKey}
                </kbd>
              ) : null}
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{option.label}</span>
                {option.description && option.description !== option.label ? (
                  <span className="ml-2 text-xs text-muted-foreground/50">
                    {option.description}
                  </span>
                ) : null}
              </div>
              {isSelected ? <CheckIcon className="size-3.5 shrink-0 text-blue-400" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});
