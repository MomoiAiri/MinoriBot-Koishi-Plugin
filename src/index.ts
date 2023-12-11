import { Context, Schema, h ,Bot, Channel, sleep, Database} from 'koishi'
import { commandCard, commandCardIll } from './command/searchCard'
import { commandEvent } from './command/searchEvent'
import { commandMusic } from './command/searchMusic'
import { paresMessageList, sendByDataType } from './utils'
import { commandChart } from './command/searchChart'
import { checkVirtualLives } from './utils/virtualLiveReminder'
import { text } from 'stream/consumers'
require('./utils/virtualLiveReminder')

export const name = 'minoribot'
const isInterval = true

declare module 'koishi'{
  interface Channel{
    usingVirtualLiveRemind:boolean,
  }
  interface Tables{
    virtualLive:VirtualLive,
  }
}

export interface VirtualLive{
  id:number
  name:string
  startAt:string
  endAt:string
  virtualLiveSchedules:{
    schedulesid:number
    virtualLiveId:number
    startAt:string
    endAt:string
    reminded:boolean
  }[]
}

export interface Config {
  commandPrefix:string
  backendUrl:string
  backendProjectUrl:string
}

export const Config: Schema<Config> = Schema.object({
  commandPrefix: Schema.string().default('sk').description('指令前缀，用于解决指令多插件冲突的问题'),
  backendUrl: Schema.string().default('http://yue.momoiairi.fun:18080').description('后端服务器地址'),
  backendProjectUrl: Schema.string().default('https://github.com/MomoiAiri/MinoriBot').description('后端服务器项目地址，可自行搭建').disabled()
})

export function apply(ctx: Context,config: Config) {
  // write your plugin here
  async function interval(){
    if(isInterval){
      const channels:Channel[] = await ctx.database.get('channel',{});
      checkVirtualLives(ctx,channels);
    }
  }
  async function test_addDB(){
    const VirtualLive:VirtualLive[] = await ctx.database.get('virtualLive',{});
    const now = Date.now();
    let vlschedules:any = []
    vlschedules.push({
      schedulesid:1,
      virtualLiveId:1,
      startAt:now+6*60*1000,
      endAt:now+7*60*1000,
      reminded:false
    });
    vlschedules.push({
      schedulesid:2,
      virtualLiveId:1,
      startAt:now+12*60*1000,
      endAt:now+13*60*1000,
      reminded:false
    })
    ctx.database.set('virtualLive',1,{virtualLiveSchedules:vlschedules});
  }
  
  ctx.setInterval(interval,60*1000);

  ctx.model.extend('channel',{
    usingVirtualLiveRemind:{type:'boolean',initial:false,nullable:false},
  })

  ctx.model.extend('virtualLive',{
    id:'unsigned',
    name:'string',
    startAt:'string',
    endAt:'string',
    virtualLiveSchedules:'json'
  })

  ctx.middleware((session,next)=>{
    console.log(`[${session.channelId}][${session.event.member?.nick}]${session.content}`)
    if(session.content=='插入数据'){
      test_addDB();
      return '插入成功';
    }
    return next();
  })

  ctx.command('测试 text1:string text2:string')
  .action((_,text1,text2)=> {return text1 + text2})

  ctx.command('echo text:string')
  .action((_,text)=>{return text})

  ctx.command(`${config.commandPrefix}查卡 <keys:text>`,'查卡')
  .usage('根据关键词或者卡牌ID查曲卡牌信息')
  .example('sk查卡 mmj 4x : 返回所有mmj的4星成员卡面缩略图列表')
  .example('sk查卡 114  : 返回卡牌ID为114的卡牌信息')
  .action(async({session},text)=>{
    const data = await commandCard(config.backendUrl,text);
    return paresMessageList(data);
  })

  ctx.command(`${config.commandPrefix}查活动 <keys:text>`,'查活动')
  .usage('根据关键词或者活动ID查曲活动信息')
  .example('sk查活动 橙 mmj : 返回所有happy属性的mmj厢活列表')
  .example('sk查活动 100 : 返回活动编号为100的活动信息')
  .action(async({session},text)=>{
    const data = await commandEvent(config.backendUrl,text);
    return paresMessageList(data);
  })

  ctx.command(`${config.commandPrefix}查卡面 <id:integer>`,'查卡面')
  .usage('查询对应ID卡牌的卡面')
  .example('sk查卡面 114 : 返回卡牌ID为114的卡牌卡面')
  .action(async(_,text)=>{
    const data = await commandCardIll(config.backendUrl,text.toString());
    return paresMessageList(data);
  })

  ctx.command(`${config.commandPrefix}查曲 <keys:text>`,'查歌曲')
  .usage('根据关键词或者歌曲ID查曲歌曲信息')
  .example('sk查曲 mmj lv30 ma : 返回所有包含mmj成员演唱的且master难度等级为30的歌曲列表')
  .example('sk查曲 213 : 返回歌曲编号为213的歌曲信息')
  .action(async({session},text)=>{
    const data = await commandMusic(config.backendUrl,text);
    return paresMessageList(data);
  })

  ctx.command(`${config.commandPrefix}查谱面 <id:integer> <diff:string>`,'查谱面')
  .usage('根据歌曲ID与难度等级来查询对应谱面信息')
  .example('查谱面 213 ma : 返回歌曲ID为213的mater难度的谱面(无easy,normal,hard谱面)')
  .action(async({session},id,diff)=>{
    const data = await commandChart(config.backendUrl,`${id.toString()} ${diff}`);
    return paresMessageList(data);
  })

  ctx.command('演唱会提醒 <word:text>','开关虚拟演唱会提醒功能')
  .usage('开关虚拟演唱会提醒功能，需要管理员权限')
  .example('演唱会提醒 开启：开启提醒功能')
  .example('演唱会提醒 关闭：关闭提醒功能')
  .channelFields(['usingVirtualLiveRemind'])
  .userFields(['authority'])
  .action(async({session},text)=>{
    const eventMemberRoles = session?.event?.member?.roles || [];
    const authorRoles = session?.author?.roles || [];
    // 合并两个角色列表并去重
    const roles = Array.from(new Set([...eventMemberRoles, ...authorRoles]));

    // 检查是否有所需角色
    const hasRequiredRole = roles.includes('admin') || roles.includes('owner');
    if(session.user.authority>1||hasRequiredRole){
      switch(text){
        case '开启':
          if(session.channel.usingVirtualLiveRemind==true){
            session.send('功能已开启无序再次开启')
          }
          else{
            session.channel.usingVirtualLiveRemind=true;
            session.send('虚拟演唱会提醒已开启');
          }
          break;
        case '关闭':
          if(session.channel.usingVirtualLiveRemind==false){
            session.send('功能已关闭无序再次关闭')
          }
          else{
            session.channel.usingVirtualLiveRemind=false;
            session.send('虚拟演唱会提醒已关闭');
          }
          break;
      }
    }
  })
}
