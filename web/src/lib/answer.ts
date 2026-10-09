import { spellings } from './markup'

// Kanji spellings an IME often produces for grammar words. Both the typed answer and the expected
// answer are normalised the same way, so either spelling matches.
const KANA: [RegExp, string][] = [
  [/難(い|く|かっ)/g, 'がた$1'],
  [/共に/g, 'ともに'],
  [/[基元]に/g, 'もとに'],
  [/訳/g, 'わけ'],
  [/様(に|な)/g, 'よう$1'],
  [/位/g, 'くらい'],
  [/所(だっ|で)/g, 'ところ$1'],
  [/堪ら/g, 'たまら'],
  [/轢/g, 'ひ'],
  [/(?:解|判|分)か?り/g, 'わかり'],
  [/出来/g, 'でき'],
  [/て来/g, 'てき'],
  [/込/g, 'こ'],
  [/頃/g, 'ころ'],
  [/子供/g, '子ども'],
]

/** Normalise typed Japanese for comparison: width, spaces, punctuation, common kanji spellings. */
export function norm(s: string): string {
  let t = s
    .normalize('NFKC')
    .replace(/[\s　]/g, '')
    .replace(/[。、．，,.!！?？「」『』…・〜～~]/g, '')
  for (const [re, to] of KANA) t = t.replace(re, to)
  return t
}

export function checkForm(input: string, answers: string[]): boolean {
  const got = norm(input)
  if (!got) return false
  return answers.some((a) => spellings(a).some((s) => norm(s) === got))
}

/** Split a prompt on its blanks. "A＿＿B＿＿C" → ["A", "B", "C"]. */
export function splitBlanks(prompt: string): string[] {
  return prompt.split(/＿{2,}/)
}

export function blankCount(prompt: string): number {
  return splitBlanks(prompt).length - 1
}

/** Insert the learner's fills into the prompt, marking them with ** for display. */
export function compose(prompt: string, fills: string[]): string {
  const parts = splitBlanks(prompt)
  return parts.map((p, i) => (i < parts.length - 1 ? p + '**' + (fills[i]?.trim() || '＿＿') + '**' : p)).join('')
}
