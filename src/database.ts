import { Context } from "koishi";
import { Niuzi } from "./models";

declare module 'koishi' {
  interface Tables {
    niuzi: Niuzi
  }
}

export function apply(ctx: Context) {
  ctx.database.extend('niuzi', {
    id: 'unsigned',
    user_id: 'string',
    platform: 'string',
    name: 'string',
    is_male: 'boolean',
    length: 'float',
    until: 'timestamp',
    workout_until: 'timestamp'
  },{
    primary: 'id',
    autoInc: true,
    unique: ['name', 'user_id']
  })
}
