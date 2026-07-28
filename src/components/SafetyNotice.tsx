import { ShieldAlert } from 'lucide-react'

export function SafetyNotice() {
  return (
    <aside className="safety-notice" aria-label="ご注意">
      <ShieldAlert size={20} aria-hidden="true" />
      <div>
        <strong>ご注意</strong>
        <p>この連絡は、クラス内の複数の生徒による確認をもとに共有されています。内容の完全性・正確性を保証するものではありません。重要な連絡については、学校からの公式情報も確認してください。</p>
      </div>
    </aside>
  )
}
