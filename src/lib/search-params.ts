import { z } from "zod";

type Param = string | string[] | undefined;

/** First value of a search param, trimmed and length-capped. */
export function stringParam(value: Param, max = 100): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim().slice(0, max);
  return trimmed ? trimmed : undefined;
}

export function uuidParam(value: Param): string | undefined {
  const v = stringParam(value, 36);
  return v && z.uuid().safeParse(v).success ? v : undefined;
}

export function enumParam<T extends string>(value: Param, allowed: readonly T[]): T | undefined {
  const v = stringParam(value, 40);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}
