export function getDurationString(length: number, float = false) {
  const hours = Math.trunc(length / 3600);
  const minutes = Math.trunc((length - hours * 3600) / 60);
  const seconds = length - minutes * 60 - hours * 3600;

  return [minutes && hours, minutes || "00", float ? seconds : Math.round(seconds)]
    .filter((v) => v)
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
