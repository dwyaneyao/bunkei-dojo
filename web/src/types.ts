// Content model. One JSON file per lesson in exam-review/content/.
// Japanese text may use {漢字|かな} for furigana and **text** for emphasis; ＿＿ marks a blank.

/** Why an answer went wrong. Used for self-grading tags, distractor labels and stats. */
export type ErrorTag = 'form' | 'meaning' | 'context' | 'register' | 'word'

export const TAG_LABEL: Record<ErrorTag, string> = {
  form: '接续',
  meaning: '意思·用法',
  context: '上下文',
  register: '语体',
  word: '词汇·搭配',
}

export const TAG_HINT: Record<ErrorTag, string> = {
  form: '接续形式错误（ます形、て形、な／の、だ 等）',
  meaning: '不符合文型的意思或使用限制',
  context: '与上下文不衔接：时态、逻辑有误，或答非所问',
  register: '语体不当（如对老师使用口语）',
  word: '用词或搭配不自然',
}

export interface Trap {
  bad: string
  why: string
  fix?: string
  tag?: ErrorTag
}

export interface Point {
  id: string
  group: string
  pattern: string
  kind: 'grammar' | 'word'
  /** As printed on the class list (原文). */
  list: { form?: string; example?: string }
  meaning: string
  form: string[]
  rules: string[]
  /** Ready-to-use fillers that are safe in an exam. */
  safe: string[]
  traps: Trap[]
  /** Teacher-made examples (自编). */
  examples: string[]
}

interface ItemBase {
  id: string
  point: string
}

/** Type the connected form. Auto-checked. */
export interface FormItem extends ItemBase {
  type: 'form'
  cue: string
  ask?: string
  answers: string[]
  note?: string
}

export interface ChoiceOption {
  text: string
  ok?: boolean
  why: string
  tag?: ErrorTag
}

/** Pick the natural completion; distractors are typical mistakes. Auto-checked. */
export interface ChoiceItem extends ItemBase {
  type: 'choice'
  prompt: string
  /** Instruction shown above the prompt when the default ("pick the best fill") does not fit. */
  ask?: string
  options: ChoiceOption[]
}

/** Exam-style open completion: write, then check against the list and models, then self-grade. */
export interface ProduceItem extends ItemBase {
  type: 'produce'
  prompt: string
  hint: string
  checks: string[]
  models: string[]
}

export type Item = FormItem | ChoiceItem | ProduceItem

export interface Lesson {
  id: string
  title: string
  source: string
  groups: { id: string; title: string }[]
  points: Point[]
  items: Item[]
}
