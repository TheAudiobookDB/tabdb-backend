export enum LogAction {
  CREATE = 1,
  UPDATE = 2,
  DELETE = 3,
}

export enum LogModel {
  BOOK = 'Book',
}

export enum LogState {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  ERROR = 3,
  DUPLICATE_FOUND = 20,
}
