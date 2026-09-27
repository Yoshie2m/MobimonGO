// デザインシステム「Mobimon」の tokens.json から、CSS 変数と文字スタイルのクラスを生成する。
// 使い方: npm run design:tokens(src/ui/design-system/tokens.json → tokens.css)
import { readFileSync, writeFileSync } from 'node:fs'

const dir = new URL('../src/ui/design-system/', import.meta.url)
const tokens = JSON.parse(readFileSync(new URL('tokens.json', dir), 'utf8'))
const theme = tokens.color.themes[0].id

const vars = []
for (const t of tokens.color.tokens) {
  const value = typeof t.value === 'string' ? t.value : t.value[theme]
  vars.push(`  --${t.name}: ${value}; /* ${t.usage} */`)
}
for (const family of ['spacing', 'radius', 'shadow']) {
  for (const t of tokens[family]?.tokens ?? [])
    vars.push(`  --${t.name}: ${t.value}; /* ${t.usage} */`)
}
for (const [name, value] of Object.entries(tokens.type.families))
  vars.push(`  --font-${name}: ${value};`)

const styles = tokens.type.groups.flatMap((group) =>
  group.styles.map(
    (s) =>
      `/* ${s.usage} */\n.${s.name} {\n  font-family: var(--font-${group.family});\n  font-size: ${s.fontSize};\n  line-height: ${s.lineHeight};\n  font-weight: ${s.fontWeight};\n}`,
  ),
)

const css = `/* このファイルは scripts/generate-design-tokens.mjs が tokens.json から生成する。直接編集しない。 */\n:root {\n${vars.join('\n')}\n}\n\n${styles.join('\n\n')}\n`
writeFileSync(new URL('tokens.css', dir), css)
console.log('generated src/ui/design-system/tokens.css')
