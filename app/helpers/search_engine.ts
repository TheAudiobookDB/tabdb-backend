export class SearchEngineHelper {
  static removeHtmlTags(str?: string | null): string | null {
    // Remove HTML tags using a regular expression
    if (!str) {
      return null
    }
    return str.replace(/<[^>]*>/g, '')
  }

  static buildPagination(currentPage: number, totalResults: number, limit: number): any {
    const lastPage = Math.max(Math.ceil(totalResults / limit), 1)
    return {
      total: totalResults,
      lastPage: lastPage,
      firstPage: 1,
      page: currentPage,
      perPage: limit,
      currentPage: currentPage,
      firstPageUrl: '/?page=1',
      lastPageUrl: `/?page=${lastPage}`,
      nextPageUrl: currentPage + 1 <= lastPage ? `/?page=${currentPage + 1}` : null,
      previousPageUrl: currentPage - 1 >= 1 ? `/?page=${currentPage - 1}` : null,
    }
  }
}
