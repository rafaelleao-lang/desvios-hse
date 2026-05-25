import { google } from 'googleapis'

const FOLDER_ID = process.env.GDRIVE_FOLDER_ID!

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GDRIVE_CLIENT_EMAIL!,
      private_key: process.env.GDRIVE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

export async function criarPastaDodia(): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const hoje = new Date()
  const nome = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`

  // Verifica se já existe
  const busca = await drive.files.list({
    q: `name='${nome}' and '${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  })
  if (busca.data.files && busca.data.files.length > 0) {
    return busca.data.files[0].id!
  }

  const criada = await drive.files.create({
    requestBody: {
      name: nome,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [FOLDER_ID],
    },
    fields: 'id',
  })
  return criada.data.id!
}

export async function uploadPDF(pastaId: string, nomeArquivo: string, buffer: Buffer): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)

  const resp = await drive.files.create({
    requestBody: { name: nomeArquivo, parents: [pastaId] },
    media: { mimeType: 'application/pdf', body: stream },
    fields: 'id,webViewLink',
  })
  return resp.data.webViewLink || ''
}
