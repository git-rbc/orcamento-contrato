import { Schedule } from "../../agendamentos/type/schedule"
import { City } from "../../cidades/types/city"

export interface Availability {
  id: string
  vendorId: string
  cityId: string
  date: string
  startHour: string
  endHour: string
  createdAt: string
  updatedAt: string
  vendor?: any
  city?: City
  schedule?: Schedule[]
}