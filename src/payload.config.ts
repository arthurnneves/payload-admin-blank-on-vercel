import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pt } from '@payloadcms/translations/languages/pt'
import { s3Storage } from '@payloadcms/storage-s3'

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
    // TESTE 3: coleção de upload, como no projeto real.
    {
      slug: 'media',
      upload: {
        staticDir: path.resolve(dirname, '../public/media'),
        mimeTypes: ['image/*'],
        formatOptions: { format: 'webp', options: { quality: 80 } },
        imageSizes: [
          { name: 'miniatura', width: 400, height: 300, position: 'centre' },
          { name: 'card', width: 768 },
          { name: 'capa', width: 1600 },
        ],
      },
      fields: [{ name: 'alt', type: 'text', required: true }],
    },
    // TESTE 4: campo com validação ASSÍNCRONA que consulta o banco, e
    // relacionamento com filterOptions — os dois padrões do projeto real.
    // Validação de campo viaja para o pacote do navegador; se ela quebrar lá,
    // o painel pode parar de montar sem dizer nada.
    {
      slug: 'categorias',
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'slug',
          type: 'text',
          unique: true,
          index: true,
          hooks: {
            beforeValidate: [
              ({ value, data }) => {
                if (typeof value === 'string' && value.trim() !== '') return value.toLowerCase()
                const base = (data as { nome?: unknown } | undefined)?.nome
                return typeof base === 'string' ? base.toLowerCase() : value
              },
            ],
          },
          validate: async (valor: unknown, { req }: { req: { payload: { find: (a: unknown) => Promise<{ docs: unknown[] }> } } }) => {
            if (typeof valor !== 'string' || valor.trim() === '') return 'Informe o slug.'
            const conflito = await req.payload.find({
              collection: 'posts',
              where: { titulo: { equals: valor } },
              limit: 1,
              depth: 0,
            })
            return conflito.docs[0] ? 'Já existe conteúdo com esse slug.' : true
          },
        },
      ],
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
        {
          name: 'autores',
          type: 'relationship',
          relationTo: 'users',
          hasMany: true,
          filterOptions: () => ({ nome: { not_equals: 'ninguem' } }),
        },
      ],
    },
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
  }),
  sharp,
  // TESTE 3: plugin de armazenamento remoto, como no projeto real. As
  // credenciais são falsas de propósito — o que está sendo testado é o efeito
  // do plugin sobre o painel, e a tela de criar usuário não envia arquivo.
  plugins: [
    s3Storage({
      collections: { media: true },
      bucket: 'bucket-de-teste',
      config: {
        endpoint: 'https://exemplo.r2.cloudflarestorage.com',
        region: 'auto',
        credentials: { accessKeyId: 'chave-falsa', secretAccessKey: 'segredo-falso' },
      },
    }),
  ],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
