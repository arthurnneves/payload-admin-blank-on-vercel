import fs from 'fs'
import path from 'path'

/**
 * TESTE 6: módulo que importa `fs` e `path` no topo e é alcançado a partir de
 * um campo de coleção — exatamente o padrão do projeto real
 * (`src/lib/rotasReservadas.ts`, importado por `slugUnicoField`).
 *
 * A configuração das coleções é serializada para o navegador, que monta os
 * formulários do painel. Um módulo de Node no meio desse caminho é candidato a
 * pacote quebrado sem erro visível.
 */
export const ROTAS_RESERVADAS = ['busca', 'ir', 'autor', 'admin', 'api'] as const

export function rotasReservadas(): string[] {
  return [...ROTAS_RESERVADAS]
}

export function lerRotasReservadasDoDisco(): string[] {
  const raiz = path.resolve(process.cwd(), 'src/app')
  if (!fs.existsSync(raiz)) return []
  return fs
    .readdirSync(raiz, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}
