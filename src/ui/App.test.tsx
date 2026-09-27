import { render, screen } from '@testing-library/react'
import App from './App.tsx'

describe('App', () => {
  it('タイトルを表示する', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'MobimonGO' })).toBeInTheDocument()
  })
})
