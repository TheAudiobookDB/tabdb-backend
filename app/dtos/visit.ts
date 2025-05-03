import { BaseModelDto } from '@adocasts.com/dto/base'
import Visit from '#models/visit'
import { IntervalType } from '../enum/interval_enum.js'

export class VisitMinimalDto extends BaseModelDto {
  declare intervalType: IntervalType
  declare visitCount: number
  declare intervalStartDate: string

  constructor(visit?: Visit) {
    super()
    if (!visit) return
    this.intervalType = visit.intervalType
    this.visitCount = visit.visitCount
    this.intervalStartDate = visit.intervalStartDate.toISO()!
  }
}

export class VisitBaseDto extends VisitMinimalDto {
  declare trackableType: string
  declare trackableId: string

  constructor(visit?: Visit) {
    super()
    if (!visit) return
    this.trackableType = visit.trackableType
    this.trackableId = visit.trackableId
  }
}
