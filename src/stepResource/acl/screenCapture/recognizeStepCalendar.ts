import { createWorker, PSM, type ImageLike } from 'tesseract.js'
import { parseStepCalendar, type OcrWord, type StepCalendarResult } from './parseStepCalendar.ts'

/**
 * 歩数画面のキャプチャ画像から文字を読み取り、カレンダーとして解釈する。
 * 文字認識は Tesseract.js でブラウザ内で行い、画像は外部に送らない
 * (初回だけ認識用の学習データを取得する)。
 */
export async function recognizeStepCalendar(
  image: ImageLike,
  options: { cachePath?: string } = {},
): Promise<StepCalendarResult> {
  const worker = await createWorker('eng', undefined, options)
  try {
    // 画面のあちこちに散らばった数字を拾うため、まばらな文字の読み取りモードを使う
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    const { data } = await worker.recognize(image, {}, { blocks: true })
    const words: OcrWord[] = (data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.flatMap((line) =>
          line.words.map((word) => ({ text: word.text, bbox: word.bbox })),
        ),
      ),
    )
    return parseStepCalendar(words)
  } finally {
    await worker.terminate()
  }
}
