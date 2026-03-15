import type { ProviderUserInputRequest, UserInputQuestion } from "@t3tools/contracts";

export interface PendingUserInputProgress {
  questionIndex: number;
  activeQuestion: UserInputQuestion | null;
  activeAnswer: unknown;
  selectedOptionLabel: string | undefined;
  customAnswer: string;
  resolvedAnswer: string | null;
  usingCustomAnswer: boolean;
  answeredQuestionCount: number;
  isLastQuestion: boolean;
  isComplete: boolean;
  canAdvance: boolean;
}

function normalizeDraftAnswer(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolvePendingUserInputAnswer(draft: unknown): string | null {
  return typeof draft === "string" ? normalizeDraftAnswer(draft) : null;
}

export function setPendingUserInputCustomAnswer(_draft: unknown, customAnswer: string): string {
  return customAnswer;
}

function normalizeQuestionnaireRequest(
  requestOrQuestions: ProviderUserInputRequest | ReadonlyArray<UserInputQuestion>,
): ProviderUserInputRequest {
  return Array.isArray(requestOrQuestions)
    ? { kind: "questionnaire", questions: [...requestOrQuestions] }
    : (requestOrQuestions as ProviderUserInputRequest);
}

export function buildPendingUserInputAnswers(
  requestOrQuestions: ProviderUserInputRequest | ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, unknown>,
): Record<string, unknown> | null {
  const request = normalizeQuestionnaireRequest(requestOrQuestions);
  if (request.kind === "url") {
    return {};
  }

  const answers: Record<string, unknown> = {};
  if (request.kind === "questionnaire") {
    for (const field of request.questions) {
      const answer = resolvePendingUserInputAnswer(draftAnswers[field.id]);
      if (!answer) {
        return null;
      }
      answers[field.id] = answer;
    }
    return answers;
  }

  for (const field of request.fields) {
    const answer = draftAnswers[field.id];
    if (answer === undefined || answer === null || answer === "") {
      if (field.required) {
        return null;
      }
      continue;
    }
    answers[field.id] = answer;
  }

  return answers;
}

export function countAnsweredPendingUserInputQuestions(
  questions: ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, unknown>,
): number {
  return questions.reduce((count, question) => {
    return resolvePendingUserInputAnswer(draftAnswers[question.id]) ? count + 1 : count;
  }, 0);
}

export function findFirstUnansweredPendingUserInputQuestionIndex(
  questions: ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, unknown>,
): number {
  const unansweredIndex = questions.findIndex(
    (question) => !resolvePendingUserInputAnswer(draftAnswers[question.id]),
  );

  return unansweredIndex === -1 ? Math.max(questions.length - 1, 0) : unansweredIndex;
}

export function derivePendingUserInputProgress(
  requestOrQuestions:
    | Extract<ProviderUserInputRequest, { kind: "questionnaire" }>
    | ReadonlyArray<UserInputQuestion>,
  draftAnswers: Record<string, unknown>,
  questionIndex: number,
): PendingUserInputProgress {
  const request = normalizeQuestionnaireRequest(requestOrQuestions);
  if (request.kind !== "questionnaire") {
    throw new Error("derivePendingUserInputProgress only supports questionnaire requests.");
  }
  const questions = request.questions;
  const normalizedQuestionIndex =
    questions.length === 0 ? 0 : Math.max(0, Math.min(questionIndex, questions.length - 1));
  const activeQuestion = questions[normalizedQuestionIndex] ?? null;
  const activeAnswer = activeQuestion ? draftAnswers[activeQuestion.id] : undefined;
  const resolvedAnswer = resolvePendingUserInputAnswer(activeAnswer);
  const selectedOptionLabel =
    activeQuestion && resolvedAnswer
      ? activeQuestion.options.find((option) => option.label === resolvedAnswer)?.label
      : undefined;
  const customAnswer =
    typeof resolvedAnswer === "string" && selectedOptionLabel === undefined ? resolvedAnswer : "";
  const answeredQuestionCount = countAnsweredPendingUserInputQuestions(questions, draftAnswers);
  const isLastQuestion =
    questions.length === 0 ? true : normalizedQuestionIndex >= questions.length - 1;

  return {
    questionIndex: normalizedQuestionIndex,
    activeQuestion,
    activeAnswer,
    selectedOptionLabel,
    customAnswer,
    resolvedAnswer,
    usingCustomAnswer: customAnswer.trim().length > 0,
    answeredQuestionCount,
    isLastQuestion,
    isComplete: buildPendingUserInputAnswers(request, draftAnswers) !== null,
    canAdvance: Boolean(resolvedAnswer),
  };
}
