export class SearchEngineHelper {
  static removeHtmlTags(str?: string | null): string | null {
    // Remove HTML tags using a regular expression
    if (!str) {
      return null
    }
    return str.replace(/<[^>]*>/g, '')
  }
}
