// Denominaciones de circulación actual en México (familia G de billetes de Banxico).
// Las miniaturas son ilustraciones estilizadas con los colores y motivos de cada billete,
// no reproducciones: la reproducción de billetes está regulada por el Banco de México.

export interface BillSpec {
  kind: 'bill'
  value: number
  /** Degradado principal [oscuro, claro] */
  colors: [string, string]
  /** Motivo del reverso (ecosistema) representado con un ícono */
  motif: string
  motifName: string
  /** Pasaje histórico del anverso */
  theme: string
  /** Proporción relativa de largo (los billetes de mayor valor son más largos) */
  length: number
}

export interface CoinSpec {
  kind: 'coin'
  value: number
  /** bimetal = centro dorado con anillo plateado */
  style: 'bimetal' | 'steel' | 'small'
}

export type MoneySpec = BillSpec | CoinSpec

export const BILLS: BillSpec[] = [
  { kind: 'bill', value: 1000, colors: ['#5b4a86', '#a99ad0'], motif: '🐆', motifName: 'Jaguar · Calakmul', theme: 'Revolución', length: 1.1 },
  { kind: 'bill', value: 500, colors: ['#1f5c9e', '#79b3e6'], motif: '🐋', motifName: 'Ballena gris · El Vizcaíno', theme: 'Reforma', length: 1.08 },
  { kind: 'bill', value: 200, colors: ['#2d6f3b', '#8fcb8a'], motif: '🦅', motifName: 'Águila real · Desierto', theme: 'Independencia', length: 1.05 },
  { kind: 'bill', value: 100, colors: ['#a92a36', '#f08a83'], motif: '🦋', motifName: 'Mariposa monarca', theme: 'Sor Juana', length: 1.02 },
  { kind: 'bill', value: 50, colors: ['#a22c6b', '#ee8fbf'], motif: '🦎', motifName: 'Ajolote · Xochimilco', theme: 'Tenochtitlan', length: 1 },
  { kind: 'bill', value: 20, colors: ['#14705f', '#6ccab7'], motif: '🐊', motifName: 'Cocodrilo · Manglar', theme: 'Consumación de la Independencia', length: 0.96 },
]

export const COINS: CoinSpec[] = [
  { kind: 'coin', value: 10, style: 'bimetal' },
  { kind: 'coin', value: 5, style: 'bimetal' },
  { kind: 'coin', value: 2, style: 'steel' },
  { kind: 'coin', value: 1, style: 'steel' },
  { kind: 'coin', value: 0.5, style: 'small' },
]

export const MONEY: MoneySpec[] = [...BILLS, ...COINS]

export const moneySpec = (value: number): MoneySpec | undefined => MONEY.find((m) => m.value === value)
