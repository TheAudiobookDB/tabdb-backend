import { MultipartFile } from '@adonisjs/core/bodyparser'
import { HttpContext } from '@adonisjs/core/http'
import fs from 'node:fs'
import * as https from 'node:https'
import env from '#start/env'
import axios from 'axios'
import { PassThrough, Readable } from 'node:stream'
import app from '@adonisjs/core/services/app'
import { cloudflareClient, imageTypes, nanoid } from '#config/app'
import logger from '@adonisjs/core/services/logger'
import ImageTemp from '#models/image_temp'

const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB
const ALLOWED_MIME = ['jpg', 'jpeg', 'png', 'webp']

export class FileHelper {
  /**
   * Save file either as a MultipartFile or a Buffer.
   * For Buffer input, all file validation is skipped.
   *
   * @param file - The file as a MultipartFile or Buffer.
   * @param subDirectory - One of: 'covers', 'contributors', or 'users'.
   * @param prefix - A prefix for the file name.
   * @param useRandomName
   * @param previousUrl
   */
  public static async saveFile(
    file: MultipartFile | string,
    subDirectory: 'covers' | 'contributors' | 'users' | 'series' | 'temp',
    prefix: string,
    useRandomName: boolean = true,
    previousUrl?: string | null | undefined
  ): Promise<string | undefined> {
    const fileName = useRandomName ? `${prefix}-${nanoid(6)}` : prefix
    console.log(fileName)
    const ctx = HttpContext.get()

    let validatedFile: MultipartFile | Buffer
    let completeFileName: string

    if (file instanceof MultipartFile) {
      const fileExtension = file.extname ?? 'png'
      completeFileName = `${fileName}.${fileExtension}`

      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds the limit of 3MB')
      }

      if (!file.subtype || !file.type || !ALLOWED_MIME.includes(file.subtype)) {
        const errorObj = {
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
        }

        if (ctx) {
          ctx.response.status(422).send(errorObj)
          return undefined
        }
        throw new Error(errorObj.message)
      }

      if (!file.tmpPath) throw new Error('File tmpPath is not provided')

      validatedFile = file
    } else {
      const parsedUrl = new URL(file)
      let extractedFileName = parsedUrl.pathname.split('/').pop()
      if (!extractedFileName) {
        throw new Error('Unable to extract the file name from the provided URL.')
      }
      completeFileName = decodeURIComponent(extractedFileName)
      validatedFile = await FileHelper.downloadFile(file)
    }

    const experimentalDownload = env.get('EXPERIMENTAL_DOWNLOAD', false)
    try {
      if (!experimentalDownload) {
        await FileHelper.upload(
          (validatedFile instanceof MultipartFile ? validatedFile.tmpPath : validatedFile)!,
          completeFileName
        )
        const fileBuffer = await FileHelper.downloadFile(
          `https://${env.get('CDN_IMAGE_HOST')}/${completeFileName}?class=p`
        )
        if (previousUrl) await FileHelper.deleteOldFile(previousUrl)
        await FileHelper.upload(fileBuffer, `${subDirectory}/${fileName}.webp`)
      } else {
        const uploadPath = app.makePath('storage/uploads')
        if (validatedFile instanceof MultipartFile) {
          await validatedFile.move(uploadPath, {
            name: completeFileName,
            overwrite: true,
          })
        } else {
          const filePath = app.makePath(uploadPath, completeFileName)
          fs.writeFileSync(filePath, validatedFile)
        }

        const fileBuffer = await FileHelper.downloadFile(
          `${env.get('CDN_PROCESS_HOST')}/${completeFileName}?class=p`,
          {
            'CF-Access-Client-Id': env.get('CDN_IMAGE_CLIENT_ID'),
            'CF-Access-Client-Secret': env.get('CDN_IMAGE_SECRET'),
          }
        )
        if (previousUrl) await FileHelper.deleteOldFile(previousUrl)
        await FileHelper.upload(fileBuffer, `${subDirectory}/${fileName}.webp`)
      }

      return `${subDirectory}/${fileName}.webp`
    } catch (error) {
      throw error
    } finally {
      try {
        if (!experimentalDownload) {
          await FileHelper.deleteRemoteFile(completeFileName)
        } else {
          await FileHelper.deleteLocalFile(completeFileName)
        }
      } catch (e) {
        if (ctx) {
          ctx.logger.error(e)
        } else {
          logger.error(e)
        }
      }
    }
  }

  public static async uploadFromTemp(
    imageId: string,
    subDirectory: 'covers' | 'contributors' | 'users' | 'series',
    modelId: string,
    suffix: boolean = true,
    previousUrl?: string | null
  ): Promise<string | null> {
    const imageTemp = await ImageTemp.query().where('publicId', imageId).first()

    if (!imageTemp) return null

    const fileBuffer = await FileHelper.downloadFile(
      `${env.get('CDN_PROCESS_HOST')}/temp/${imageId}.${imageTemp.extension}?class=p`,
      {
        'CF-Access-Client-Id': env.get('CDN_IMAGE_CLIENT_ID'),
        'CF-Access-Client-Secret': env.get('CDN_IMAGE_SECRET'),
      }
    )
    const suffixStr = suffix ? `_${nanoid(6)}` : ''
    await FileHelper.upload(fileBuffer, `${subDirectory}/${modelId}${suffixStr}.webp`)

    const uploadPath = app.makePath('storage/uploads/temp', `${imageId}.${imageTemp.extension}`)
    if (fs.existsSync(uploadPath)) {
      fs.unlinkSync(uploadPath)
    }

    if (previousUrl)
      await FileHelper.deleteOldFile(
        previousUrl.startsWith(env.get('CDN_SERVE_HOST'))
          ? `${previousUrl}}`
          : `${env.get('CDN_SERVE_HOST')}/${previousUrl}`
      )

    await imageTemp.delete()

    return `${subDirectory}/${modelId}${suffixStr}.webp`
  }

  /**
   * Download file from a remote URL and return as Buffer.
   */
  private static async downloadFile(
    url: string,
    headers: Record<string, string> = {}
  ): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer', headers })
    return Buffer.from(response.data)
  }

  /**
   * Upload a file or Buffer content to the remote CDN.
   *
   * @param source - File path (string) or Buffer to be uploaded.
   * @param fileName - Destination file name/path in the CDN.
   */
  public static async upload(source: string | Buffer, fileName: string): Promise<string> {
    let readStream: Readable

    if (typeof source === 'string') {
      readStream = fs.createReadStream(source)
    } else if (Buffer.isBuffer(source)) {
      readStream = new PassThrough()
      // @ts-ignore
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
        res.on('end', () => resolve(responseData))
      })

      req.on('error', (error) => reject(error))
      readStream.pipe(req)
    })
  }

  /**
   * Delete a remote file on the CDN.
   *
   * @param fileName - Name of the file to delete.
   */
  public static async deleteRemoteFile(fileName: string) {
    const url = `https://${env.get('CDN_HOST')}/${env.get('CDN_ZONE')}/${fileName}`
    return axios.delete(url, {
      headers: { AccessKey: env.get('CDN_KEY') },
    })
  }

  /**
   * Delete a local file from the storage uploads directory.
   *
   * @param fileName - Name of the file to remove.
   */
  public static async deleteLocalFile(fileName: string) {
    const filePath = app.makePath('storage/uploads', fileName)
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => (err ? reject(err) : resolve(true)))
    })
  }

  private static async deleteOldFile(previousUrl: string) {
    previousUrl = previousUrl.split('?')[0]
    const urlEncoded = encodeURIComponent(previousUrl) + '%2A'

    const path = new URL(previousUrl).pathname

    try {
      await FileHelper.deleteRemoteFile(path)
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return
      } else {
        throw new Error(error)
      }
    }

    try {
      void cloudflareClient.cache.purge({
        zone_id: env.get('CF_ZONE'),
        files: [previousUrl, ...imageTypes.map((type) => `${previousUrl}?class=${type}`)],
      })

      void axios.request({
        params: {
          url: urlEncoded,
          async: true,
        },
        url: `https://api.bunny.net/purge`,
        method: 'POST',
        headers: {
          AccessKey: env.get('BUNNY_KEY'),
        },
      })
    } catch (_) {}
  }
}
