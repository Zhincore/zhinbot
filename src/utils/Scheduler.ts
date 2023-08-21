import { Snowflake } from "discord.js";
import * as Chrono from "chrono-node";
import { Schedule } from "./Schedule.js";

const DAY = 24 * 60 * 60 * 1000;

export class Scheduler {
  private readonly schedules = new Map<Snowflake, Schedule>();

  constructor(readonly trigger: (guildId: Snowflake) => Promise<void>) {}

  public updateSchedule(guildId: Snowflake, time: string) {
    let schedule = this.schedules.get(guildId);
    if (schedule) schedule.destroy();

    const now = new Date();
    let start = Chrono.strict.parseDate(time, now);
    if (!start) throw new Error("Failed to parse schedule time");

    // If the start already happened today, schedule for tomorrow
    if (+start < +now) start = new Date(+start + DAY);

    schedule = new Schedule(() => this.trigger(guildId).catch(console.error), start, DAY);
    this.schedules.set(guildId, schedule);
  }

  public removeSchedule(guildId: Snowflake) {
    const schedule = this.schedules.get(guildId);
    if (!schedule) return;
    schedule.destroy();
    this.schedules.delete(guildId);
  }
}
