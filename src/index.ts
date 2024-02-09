import { Context, Schema, h ,Bot, Channel, sleep, Database} from 'koishi'
import { commandCard, commandCardIll } from './command/searchCard'
import { commandEvent } from './command/searchEvent'
import { commandMusic } from './command/searchMusic'
import { paresMessageList, sendByDataType } from './utils'
import { commandChart } from './command/searchChart'
import { checkVirtualLives } from './utils/virtualLiveReminder'
import { text } from 'stream/consumers'
import { GeminiClient } from './command/gemini'
import moment from 'moment';
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
  gemini_APIKey:string
  gemini_proxy:string
}

export let context:Context = undefined
let gemini:GeminiClient

export const Config: Schema<Config> = Schema.object({
  commandPrefix: Schema.string().default('sk').description('指令前缀，用于解决指令多插件冲突的问题'),
  backendUrl: Schema.string().default('http://yue.momoiairi.fun:18080').description('后端服务器地址'),
  backendProjectUrl: Schema.string().default('https://github.com/MomoiAiri/MinoriBot').description('后端服务器项目地址，可自行搭建').disabled(),
  gemini_APIKey: Schema.string().default('').description('gemini API Key'),
  gemini_proxy: Schema.string().description('gemini 代理地址，可解决无法访问 gemini 的问题').default('http://127.0.0.1:7890')
})

export function apply(ctx: Context,config: Config) {
  // write your plugin here
  context = ctx
  async function interval(){
    if(isInterval){
      const channels:Channel[] = await ctx.database.get('channel',{});
      checkVirtualLives(ctx,channels);
    }
  }
  
  // ctx.setInterval(interval,60*1000);
  setInterval(interval,60*1000);

  function init(){
    if(config.gemini_APIKey!=''){
      gemini = new GeminiClient(config.gemini_APIKey,config.gemini_proxy)
    }
  }
  
  init()

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
    const messageTime:string = `[${moment(new Date()).format('YYYY-MM-DD HH:mm')}]`;
    console.log(`${messageTime}[${session.channelId}][${session.event.user.name}]${session.content}`)
    // console.log(session)
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
  ctx.command('gmn [msg:text]','Gemini对话')
  .action(async({session},msg)=>{
    console.log(msg)
    const result = await gemini.textDialogue(msg)
    session.send(result)
  })
  ctx.command('gmn-p [msg:string] [...image:image]','Gemini图片对话')
  .action(async ({session},msg,...image)=>{
    if(image!=undefined && msg != undefined){
      session.send(`本次会话共有${image.length}张图`)
      const result = await gemini.textAndImageDialogue(msg,image)
      session.send(result);
    }
  })
  ctx.command('gmn-d [msg:text]','Genmini长对话')
  .action(async({session},msg)=>{
    const result = await gemini.longDilogue(msg)
    session.send(result)
  })
  ctx.command('gmn-r','重置长对话')
  .action((_)=>{
    gemini.resetChat()
    return '已重置'
  })

}
