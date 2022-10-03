import { ValidationSchema } from "fastest-validator";

export function defineValidationSchema<T extends ValidationSchema>(schema: T) {
  return schema;
}

type _Types = {
  ms: number;
  number: number;
  string: string;
  boolean: boolean;
  "number[]": number[];
  "string[]": string[];
  "boolean[]": boolean[];
};

export type TypeFromValidationSchema<Obj extends ValidationSchema> = {
  [Key in keyof Obj]: Obj[Key] extends Record<string, any> ? _FromObj<Obj[Key]> : _FromPrimitive<Obj[Key]>;
};

type _FromPrimitive<Val> = Val extends keyof _Types ? _Types[Val] : unknown;

type _TryOptional<Obj extends ValidationSchema, Val> = Obj["optional"] extends true ? Val | undefined : Val;

type _FromObj<Obj extends ValidationSchema> = _TryOptional<
  Obj,
  Obj["$$type"] extends "object"
    ? TypeFromValidationSchema<Omit<Obj, "$$type">>
    : Obj["type"] extends "object"
    ? TypeFromValidationSchema<Obj["props"]>
    : // Record
    Obj["type"] extends "record"
    ? { [Key in _FromPrimitive<Obj["key"]>]: _FromObj<Obj["value"]> }
    : // Array
    Obj["type"] extends "array"
    ? _FromObj<Obj["items"]>[]
    : // Primitive
      _FromPrimitive<Obj["type"]>
>;
