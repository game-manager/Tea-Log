import { Search } from 'lucide-react'
import type { Category } from '../types'

export type ContactSort = 'newest' | 'targetDate'
export type CategoryFilter = 'all' | Category

const categories: Category[] = ['持ち物', '宿題', '提出物', '時間割変更', '行事', '部活動', 'その他']

export function ContactListToolbar({ query, category, sort, onQueryChange, onCategoryChange, onSortChange }: {
  query: string
  category: CategoryFilter
  sort: ContactSort
  onQueryChange: (value: string) => void
  onCategoryChange: (value: CategoryFilter) => void
  onSortChange: (value: ContactSort) => void
}) {
  return (
    <div className="contact-toolbar" aria-label="発言の検索と並び替え">
      <label className="contact-search"><Search size={17} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="タイトル・内容・入力者を検索" /></label>
      <select value={category} onChange={(event) => onCategoryChange(event.target.value as CategoryFilter)} aria-label="カテゴリで絞り込む"><option value="all">すべてのカテゴリ</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={sort} onChange={(event) => onSortChange(event.target.value as ContactSort)} aria-label="並び順"><option value="newest">新しい投稿順</option><option value="targetDate">対象日が近い順</option></select>
    </div>
  )
}
