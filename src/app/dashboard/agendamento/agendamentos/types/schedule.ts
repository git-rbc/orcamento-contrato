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
  date: string;
  preVendor?: any;
  vendor?: any;
  city?: any;
  cityPlace?: any;
  createdAt: Date;
  updatedAt: Date;
}