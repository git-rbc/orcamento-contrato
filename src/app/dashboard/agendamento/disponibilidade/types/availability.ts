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
  date: string
  startHour: string
  endHour: string
  createdAt: string
  updatedAt: string
  vendor?: any
  city?: City
  schedule?: Schedule[]
  availabilityPriority?: AvailabilityPriority[]
}
