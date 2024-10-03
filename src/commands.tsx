import { Context, Schema, $ } from 'koishi'
import { Niuzi } from './models'

export function apply(ctx: Context) {
  ctx.command('niuzi', '斗牛子')
  ctx.command('niuzi/niuzi_guide', '斗牛子说明').action(() => '斗牛子游戏！与他人进行牛子决斗！先发制人者获胜概率更高，但有概率两败俱伤！领取你的牛子，登上至尊牛圣宝座！')
  ctx.command('niuzi/getniuzi', '领取一个牛子，性别随机').action(async ({ session }) => {
    const niuzis = await ctx.database.get('niuzi', {
      user_id: session.userId,
      platform: session.platform
    }, ['id'])
    if (niuzis.length !== 0) {
      return `${session.username}，你已经有牛子了呦~`
    } else {
      await session.send(`${session.userId}，请输入牛子的名字：`)
      const name = await session.prompt()
      if (!name) return '输入超时。'

      const niuzi = await ctx.database.create('niuzi', {
        user_id: session.userId,
        platform: session.platform,
        name: name,
        is_male: Math.random() < 0.5 ? true : false,
        length: 15 + Math.random() - 0.5,
        until: new Date(),
        workout_until: new Date()
      })
      return `完成！牛子信息：\n名称：${niuzi.name}\n主人：${niuzi.user_id}\n性别：${niuzi.is_male ? '男' : '女'}\n长度：${niuzi.length.toFixed(2)}cm`
    }
  });

  ctx.command('niuzi/info [target:user]', '查询用户牛子信息，参数留空则查询自己的牛子信息').action(async ({ session }, target?) => {
    if (!target) target = session.platform + session.userId
    const targetPlatform = target.slice(0, session.platform.length)
    const targetId = target.slice(session.platform.length + 1)

    const niuzis: Niuzi[] = await ctx.database.get('niuzi', {
      user_id: targetId,
      platform: targetPlatform
    })
    if (niuzis.length === 0) {
      return '还没有牛子，快去领取一个牛子吧！'
    }
    const niuzi = niuzis[0]
    return `牛子信息：\n名称：${niuzi.name}\n主人：${niuzi.user_id}\n性别：${niuzi.is_male ? '男' : '女'}\n长度：${niuzi.length.toFixed(2)}cm`
  })

  ctx.command('niuzi/ranking', '查看牛子长度排行').action(async ({ session }) => {
    let niuzis = await ctx.database.get("niuzi", {})
    if (niuzis.length === 0) return '还没有人有牛子！快去领取一个牛子吧！'

    // 牛子降序显示
    niuzis.sort((a, b) => b.length - a.length)
    // 这里给牛子对象加上order属性方便后面map里用
    let ordered_niuzis: any[] = niuzis
    for (let i = 0; i < ordered_niuzis.length; i++) ordered_niuzis[i].order = i
    const botId = session.bot.selfId
    // 这里换行用不了<br>，也不能直接写\n
    const messages = ordered_niuzis.map(niuzi => <message id={botId}>{niuzi.order + 1}. {niuzi.name}{'\n'}主人：{niuzi.user_id}{'\n'}长度：{niuzi.length.toFixed(2)}cm{'\n'}性别：{niuzi.is_male ? '男' : '女'}</message>)
    return <message id={botId} forward>{messages}</message>
  })

  ctx.command('niuzi/battle <target:user>', '与他人进行牛子决斗！').action(async ({ session }, target?) => {
    if (!target) return '用法：battle @成员'

    const niuzis_self = await ctx.database.get('niuzi', {
      user_id: session.userId,
      platform: session.platform
    }, ['id', 'until', 'name', 'user_id'])
    if (niuzis_self.length === 0) return '你还没有牛子，快去领取一个牛子吧！'
    const niuzi_self = niuzis_self[0]

    const targetPlatform = target.slice(0, session.platform.length)
    const targetId = target.slice(session.platform.length + 1)
    const niuzis_opponent = await ctx.database.get('niuzi', {
      user_id: targetId,
      platform: targetPlatform
    }, ['id', 'name', 'user_id'])
    if (niuzis_opponent.length === 0) return '对方还没有牛子，快让对方去领取一个牛子吧！'
    const niuzi_opponent = niuzis_opponent[0]

    // 检查牛子休息时间是否已达到
    const now = new Date()
    if (now < niuzi_self.until) {
      const diff = new Date()
      diff.setTime(niuzi_self.until.getTime() - now.getTime())
      return `你的牛子累了！还需要休息到${niuzi_self.until.toLocaleString()}`
    }

    // 计算休息时间
    let new_until = new Date()
    new_until.setTime(now.getTime() + 5 * 60 * 1000) // 5分钟

    // 计算长度变化
    const amount = Math.random() * 5
    const random_num = Math.random()
    let coefficient: number[]
    let flag: number

    // 50%胜利，30%失败，20%两败俱伤
    if (random_num < 0.5) {
      flag = 1
      coefficient = [1, -1]
    } else if (random_num < 0.8) {
      flag = 0
      coefficient = [-1, 1]
    } else {
      flag = -1
      coefficient = [-1, -1]
    }

    await ctx.database.upsert('niuzi', (row) => [
      {
        id: niuzi_self.id,
        length: $.add(row.length, amount * coefficient[0]),
        until: new_until
      },
      {
        id: niuzi_opponent.id,
        length: $.add(row.length, amount * coefficient[1])
      }
    ])

    switch (flag) {
      case 1:
        return <><at id={niuzi_self.user_id} /><at id={niuzi_opponent.user_id} />成功！{niuzi_self.name}增长了{amount}cm，{niuzi_opponent.name}缩短了{amount}cm！</>
        break;
      case 2:
        return <><at id={niuzi_self.user_id} /><at id={niuzi_opponent.user_id} />失败！{niuzi_self.name}缩短了{amount}cm，{niuzi_opponent.name}增长了{amount}cm！</>
        break;
      case 3:
        return <><at id={niuzi_self.user_id} /><at id={niuzi_opponent.user_id} />两败俱伤！{niuzi_self.name}和{niuzi_opponent.name}都缩短了{amount}cm！</>
        break;
    }
  })

  ctx.command('niuzi/workout', '锻炼牛子').action(async ({ session }) => {
    const niuzis = await ctx.database.get('niuzi', {
      user_id: session.userId,
      platform: session.platform
    }, ['id', 'name', 'user_id', 'workout_until'])
    if (niuzis.length === 0) return '你还没有牛子，快去领取一个牛子吧！'
    const niuzi = niuzis[0]

    const now = new Date()
    if (now < niuzi.workout_until) {
      const diff = new Date()
      diff.setTime(niuzi.workout_until.getTime() - now.getTime())
      return `你的牛子不想锻炼！还需要休息到${niuzi.workout_until.toLocaleString()}`
    }

    const amount = 5 + Math.random() * 15
    await ctx.database.set('niuzi', niuzi.id, (row) => ({
      length: $.add(row.length, amount)
    }))

    return `锻炼成功！你的牛子增长了${amount}cm！`
  })
}
