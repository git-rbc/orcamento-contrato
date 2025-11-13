import { Schedule } from "../../agendamentos/types/schedule"
import { City } from "../../cidades/types/city"

export interface AvailabilityPriority {
  id: string
  availabilityId: string
  userId: string
  comment: string | null;
  createdAt: string
  updatedAt: string
  user?: any;
}

export interface Availability {
  id: string
  vendorId: string
  cityId: string
  cityPlaceId: string | null
  date: string
  startHour: string
  endHour: string
  createdAt: string
  updatedAt: string
  vendor?: any
  city?: City
  cityPlace?: any
  schedule?: Schedule[]
  availabilityPriority?: AvailabilityPriority[]
}
