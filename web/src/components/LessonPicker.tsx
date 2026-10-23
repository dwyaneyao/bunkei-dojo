import { LESSONS } from '../content'
import { Segmented } from './ui'

/** One lesson or all of them. Hidden while there is only one lesson. */
export default function LessonPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (LESSONS.length < 2) return null
  return (
    <Segmented<string>
      value={value}
      onChange={onChange}
      options={[...LESSONS.map((l) => ({ value: l.id, label: l.title })), { value: 'all', label: '全部' }]}
    />
  )
}
