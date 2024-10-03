import { Context, Schema } from 'koishi'
import { apply as database } from './database'
import { apply as commands } from './commands'

export const name = 'niuzi'

export const inject = ['database']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.plugin(database)
  ctx.plugin(commands)
}
