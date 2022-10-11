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
  [Key in keyof Obj]: _TypeFromAny<Obj[Key]>;
};

type _TypeFromAny<Val> = Val extends Record<string, any> ? _TypeFromObj<Val> : _TypeFromPrimitive<Val>;

type _TypeFromPrimitive<Val> = Val extends keyof _Types ? _Types[Val] : unknown;

type _TryOptional<Obj extends ValidationSchema, Val> = Obj["optional"] extends true ? Val | undefined : Val;

type _TypeFromObj<Obj extends ValidationSchema> = _TryOptional<
  Obj,
  Obj["$$type"] extends "object"
    ? TypeFromValidationSchema<Omit<Obj, "$$type">>
    : Obj["type"] extends "object"
    ? TypeFromValidationSchema<Obj["props"]>
    : // Record
    Obj["type"] extends "record"
    ? { [Key in _TypeFromPrimitive<Obj["key"]>]: _TypeFromAny<Obj["value"]> }
    : // Array
    Obj["type"] extends "array"
    ? _TypeFromAny<Obj["items"]>[]
    : // Enum
    Obj["type"] extends "enum"
    ? Obj["values"][number]
    : // Primitive
      _TypeFromPrimitive<Obj["type"]>
>;
