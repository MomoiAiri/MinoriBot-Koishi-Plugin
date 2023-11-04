import { Context, Schema, h } from 'koishi'
import { commandCard, commandCardIll } from './command/searchCard'
import { commandEvent } from './command/searchEvent'
import { commandMusic } from './command/searchMusic'
import { paresMessageList, sendByDataType } from './utils'
import { commandChart } from './command/searchChart'

export const name = 'minoribot'

export interface Config {
  backendUrl:string
}

export const Config: Schema<Config> = Schema.object({
  backendUrl: Schema.string().default('http://yue.momoiairi.fun:18080').description('后端服务器地址').required(),
  backendProjectUrl: Schema.string().default('https://github.com/MomoiAiri/MinoriBot').description('后端服务器项目地址，可自行搭建').disabled()
})

export function apply(ctx: Context,config: Config) {
  // write your plugin here
  ctx.command('测试 text1:string text2:string')
  .action((_,text1,text2)=> {return text1 + text2})

  ctx.command('sk查卡 <keys:text>','查卡').alias('查卡牌')
  .usage('根据关键词或者卡牌ID查曲卡牌信息')
  .example('sk查卡 mmj 4x : 返回所有mmj的4星成员卡面缩略图列表')
  .example('sk查卡 114  : 返回卡牌ID为114的卡牌信息')
  .action(async({session},text)=>{
    const data = await commandCard(config.backendUrl,text);
    return paresMessageList(data);
  })

  ctx.command('sk查活动 <keys:text>','查活动').alias('查活动')
  .usage('根据关键词或者活动ID查曲活动信息')
  .example('sk查活动 橙 mmj : 返回所有happy属性的mmj厢活列表')
  .example('sk查活动 100 : 返回活动编号为100的活动信息')
  .action(async({session},text)=>{
    const data = await commandEvent(config.backendUrl,text);
    return paresMessageList(data);
  })

  ctx.command('sk卡面 <id:integer>','查卡面').alias('查卡面')
  .usage('查询对应ID卡牌的卡面')
  .example('sk查卡面 114 : 返回卡牌ID为114的卡牌卡面')
  .action(async(_,text)=>{
    const data = await commandCardIll(config.backendUrl,text.toString());
    return paresMessageList(data);
  })

  ctx.command('sk查曲 <keys:text>','查歌曲').alias('查歌曲')
  .usage('根据关键词或者歌曲ID查曲歌曲信息')
  .example('sk查曲 mmj lv30 ma : 返回所有包含mmj成员演唱的且master难度等级为30的歌曲列表')
  .example('sk查曲 213 : 返回歌曲编号为213的歌曲信息')
  .action(async({session},text)=>{
    const data = await commandMusic(config.backendUrl,text);
    return paresMessageList(data);
  })

  ctx.command('sk查谱面 <id:integer> <diff:string>','查谱面').alias('查谱面')
  .usage('根据歌曲ID与难度等级来查询对应谱面信息')
  .example('查谱面 213 ma : 返回歌曲ID为213的mater难度的谱面(无easy,normal,hard谱面)')
  .action(async({session},id,diff)=>{
    const data = await commandChart(config.backendUrl,`${id.toString()} ${diff}`);
    return paresMessageList(data);
  })
}
