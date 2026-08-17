import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pt } from '@payloadcms/translations/languages/pt'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Minimal reproduction of: the Payload admin panel renders blank when deployed
 * to Vercel, while the very same build renders it correctly with `next start`
 * locally.
 *
 * Deliberately minimal: one auth collection, the default editor, nothing else.
 */
export default buildConfig({
  admin: {
    user: 'users',
    importMap: { baseDir: path.resolve(dirname) },
    // TESTE 2: formato de data e fuso padrão, como no projeto real.
    dateFormat: 'dd/MM/yyyy HH:mm',
    timezones: {
      defaultTimezone: 'America/Sao_Paulo',
    },
  },
  // TESTE 1 do bissecção: idioma do painel em português, como no projeto real.
  i18n: {
    supportedLanguages: { pt },
    fallbackLanguage: 'pt',
  },
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [{ name: 'nome', type: 'text' }],
    },
    {
      slug: 'posts',
      // TESTE 2: rascunhos com publicação agendada, como no projeto real.
      versions: {
        maxPerDoc: 20,
        drafts: { autosave: false, schedulePublish: true },
      },
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'conteudo', type: 'richText' },
      ],
    },
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
  }),
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
