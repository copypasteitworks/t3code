import { describe, expect, it } from "vitest";

import {
  buildPendingUserInputAnswers,
  countAnsweredPendingUserInputQuestions,
  derivePendingUserInputProgress,
  findFirstUnansweredPendingUserInputQuestionIndex,
  resolvePendingUserInputAnswer,
  setPendingUserInputCustomAnswer,
} from "./pendingUserInput";

describe("resolvePendingUserInputAnswer", () => {
  it("prefers a custom answer over a selected option", () => {
    expect(resolvePendingUserInputAnswer("Keep the existing envelope for one release")).toBe(
      "Keep the existing envelope for one release",
    );
  });

  it("falls back to the selected option", () => {
    expect(resolvePendingUserInputAnswer("Scaffold only")).toBe("Scaffold only");
  });

  it("clears the preset selection when a custom answer is entered", () => {
    expect(setPendingUserInputCustomAnswer("Preserve existing tags", "doesn't matter")).toBe(
      "doesn't matter",
    );
  });
});

describe("buildPendingUserInputAnswers", () => {
  it("returns a canonical answer map for complete prompts", () => {
    expect(
      buildPendingUserInputAnswers(
        [
          {
            id: "scope",
            header: "Scope",
            question: "What should the plan target first?",
            options: [
              {
                label: "Orchestration-first",
                description: "Focus on orchestration first",
              },
            ],
          },
          {
            id: "compat",
            header: "Compat",
            question: "How strict should compatibility be?",
            options: [
              {
                label: "Keep current envelope",
                description: "Preserve current wire format",
              },
            ],
          },
        ],
        {
          scope: "Orchestration-first",
          compat: "Keep the current envelope for one release window",
        },
      ),
    ).toEqual({
      scope: "Orchestration-first",
      compat: "Keep the current envelope for one release window",
    });
  });

  it("returns null when any question is unanswered", () => {
    expect(
      buildPendingUserInputAnswers(
        [
          {
            id: "scope",
            header: "Scope",
            question: "What should the plan target first?",
            options: [
              {
                label: "Orchestration-first",
                description: "Focus on orchestration first",
              },
            ],
          },
        ],
        {},
      ),
    ).toBeNull();
  });

  it("returns structured answers for completed form requests", () => {
    expect(
      buildPendingUserInputAnswers(
        {
          kind: "form",
          fields: [
            {
              id: "api_key",
              label: "API key",
              input: "password",
              required: true,
            },
            {
              id: "region",
              label: "Region",
              input: "choice",
              options: [
                {
                  label: "EU",
                  value: "eu",
                },
              ],
            },
            {
              id: "notes",
              label: "Notes",
              input: "textarea",
              required: false,
            },
          ],
        },
        {
          api_key: "secret",
          region: "eu",
        },
      ),
    ).toEqual({
      api_key: "secret",
      region: "eu",
    });
  });

  it("requires required form fields", () => {
    expect(
      buildPendingUserInputAnswers(
        {
          kind: "form",
          fields: [
            {
              id: "api_key",
              label: "API key",
              input: "password",
              required: true,
            },
          ],
        },
        {},
      ),
    ).toBeNull();
  });

  it("returns an empty answer object for url prompts", () => {
    expect(
      buildPendingUserInputAnswers(
        {
          kind: "url",
          url: "https://example.com/device",
        },
        {},
      ),
    ).toEqual({});
  });
});

describe("pending user input question progress", () => {
  const questions = [
    {
      id: "scope",
      header: "Scope",
      question: "What should the plan target first?",
      options: [
        {
          label: "Orchestration-first",
          description: "Focus on orchestration first",
        },
      ],
    },
    {
      id: "compat",
      header: "Compat",
      question: "How strict should compatibility be?",
      options: [
        {
          label: "Keep current envelope",
          description: "Preserve current wire format",
        },
      ],
    },
  ] as const;

  it("counts only answered questions", () => {
    expect(
      countAnsweredPendingUserInputQuestions(questions, {
        scope: "Orchestration-first",
      }),
    ).toBe(1);
  });

  it("finds the first unanswered question", () => {
    expect(
      findFirstUnansweredPendingUserInputQuestionIndex(questions, {
        scope: "Orchestration-first",
      }),
    ).toBe(1);
  });

  it("returns the last question index when all answers are complete", () => {
    expect(
      findFirstUnansweredPendingUserInputQuestionIndex(questions, {
        scope: "Orchestration-first",
        compat: "Keep it for one release window",
      }),
    ).toBe(1);
  });

  it("derives the active question and advancement state", () => {
    expect(
      derivePendingUserInputProgress(
        questions,
        {
          scope: "Orchestration-first",
        },
        0,
      ),
    ).toMatchObject({
      questionIndex: 0,
      activeQuestion: questions[0],
      selectedOptionLabel: "Orchestration-first",
      customAnswer: "",
      resolvedAnswer: "Orchestration-first",
      answeredQuestionCount: 1,
      isLastQuestion: false,
      isComplete: false,
      canAdvance: true,
    });
  });
});
