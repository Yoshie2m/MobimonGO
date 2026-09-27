import type { StepImportUseCases } from '../stepResource/application/stepImport.ts'
import StepImportPage from './StepImportPage.tsx'

interface Props {
  stepImport: StepImportUseCases
}

function App({ stepImport }: Props) {
  return (
    <main>
      <h1>MobimonGO</h1>
      <p>歩いてモビモンを集めよう。</p>
      <StepImportPage useCases={stepImport} />
    </main>
  )
}

export default App
