import { MultipartFile } from '@adonisjs/core/bodyparser'
import { cuid } from '@adonisjs/core/helpers'
import { HttpContext } from '@adonisjs/core/http'
import fs from 'node:fs'
import * as https from 'node:https'
import env from '#start/env'
import axios from 'axios'
import { PassThrough } from 'node:stream'

export class FileHelper {
  public static async saveFile(file: MultipartFile) {
    const ctx = HttpContext.get()
    const fileName = cuid()
    const fileExtension = file.extname ?? 'png'

    const completeFileName = `${fileName}.${fileExtension}`

    if (file.size > 3 * 1024 * 1024) {
      throw new Error('File size exceeds the limit of 3MB')
    }

    const allowedMime: string[] = ['jpg', 'jpeg', 'png', 'webp']

    if (!file.subtype || !file.type || !allowedMime.includes(file.subtype)) {
      if (ctx) {
        ctx.response.status(422).send({
          message: 'File type is not supported or not provided',
          errors: [
            {
              fieldName: file.fieldName,
              clientName: file.clientName,
              message: 'File type is not supported or not provided',
              provided: `${file.type}/${file.subtype}`,
              type: 'extname',
            },
          ],
        })
        return
      }
      throw new Error('File type is not supported or not provided')
    }
    if (!file.tmpPath) throw new Error('File tmpPath is not provided')

    console.log(file.type)
    console.log(file.subtype)

    // Hacky way ^^
    try {
      await FileHelper.upload(file.tmpPath, completeFileName)
      const filePath = `https://${env.get('CDN_IMAGE_HOST')}/${completeFileName}?class=process`

      const response = await axios.get(filePath, { responseType: 'arraybuffer' })
      const fileBuffer = Buffer.from(response.data)

      await FileHelper.upload(fileBuffer, `${fileName}.webp`)
      console.log(`${fileName}.webp uploaded successfully`)
    } catch (error) {
      throw error
    } finally {
      await FileHelper.deleteFile(completeFileName)
    }
  }

  public static async upload(source: string | Buffer, fileName: string): Promise<string> {
    let readStream

    if (typeof source === 'string') {
      readStream = fs.createReadStream(source)
    } else if (Buffer.isBuffer(source)) {
      readStream = new PassThrough()
      readStream.end(source)
    } else {
      throw new Error('Source must be a file path (string) or a Buffer')
    }

    const options = {
      method: 'PUT',
      host: env.get('CDN_HOST'),
      path: `/${env.get('CDN_ZONE')}/${fileName}`,
      headers: {
        'AccessKey': env.get('CDN_KEY'),
        'Content-Type': 'application/octet-stream',
      },
    }

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = ''

        res.on('data', (chunk) => {
          responseData += chunk.toString('utf8')
        })

        res.on('end', () => {
          resolve(responseData)
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      readStream.pipe(req)
    })
  }

  public static async deleteFile(fileName: string) {
    const url = `https://${env.get('CDN_HOST')}/${env.get('CDN_ZONE')}/${fileName}`

    return axios.delete(url, {
      headers: {
        AccessKey: env.get('CDN_KEY'),
      },
    })
  }
}
