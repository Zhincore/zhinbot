import ms from "ms";
import { TranslateFn } from "~/core/index.js";

export * from "./ErrnoException.js";

export function getDurationString(length: number, float = false) {
  const hours = Math.trunc(length / 3600);
  const minutes = Math.trunc((length - hours * 3600) / 60);
  const seconds = length - minutes * 60 - hours * 3600;

  return [minutes && hours, minutes || "00", float ? seconds : Math.round(seconds)]
    .filter((v) => v)
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export function dateToUTC(date: Date) {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

export function chooseRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function isUppercase(str: string) {
  return str && str[0] === str[0].toUpperCase();
}

export function translateTime(time: number, t: TranslateFn) {
  const parsedResult = /^(\d+)(\w+)$/.exec(ms(time))!;
  const value = parsedResult[1];
  const unit = parsedResult[2];

  return t("time-unit-" + unit, { value });
}
