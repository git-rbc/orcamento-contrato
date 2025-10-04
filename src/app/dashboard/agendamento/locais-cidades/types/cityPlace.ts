import { City } from "../../cidades/types/city";

export type CityPlace = {
    id: string;
    name: string;
    cityId:string;
    color?: string | null;
    createdAt: Date;
    updatedAt: Date;

    city?: City;
}