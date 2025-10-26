export type Schedule = {
  id: string;
  externalCode: string | null;
  clientName: string;
  clientPhone: string;
  preVendorId: string;
  vendorId: string;
  cityId: string;
  cityPlaceId: string;
  availabilityId: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}