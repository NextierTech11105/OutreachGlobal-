import { customType } from "drizzle-orm/pg-core";

type CustomTypeValues = {
  data: number;
  config: { precision?: number; scale?: number };
};

export const customNumeric = customType<CustomTypeValues>({
  dataType(config) {
    const precision = config?.precision ?? 12;
    const scale = config?.scale ?? 2;
    return `numeric(${precision}, ${scale})`;
  },
  fromDriver(value) {
    return Number(value);
  },
});

export const pricing = () => customNumeric({ precision: 12, scale: 4 });
