/** ドメインの不変条件やルールに反する操作をしたときのエラー。 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
