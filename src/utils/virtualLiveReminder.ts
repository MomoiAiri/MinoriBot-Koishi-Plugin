import { json } from "stream/consumers";
import axios from "axios";
import { conversionTimeSpanToDateTime } from "./utils";
import { unwatchFile } from "fs";
import { Bot, Context,Channel,h } from "koishi";
import { count } from "console";
import { SekaiVirtualLive } from "../types/SekaiVirtualLives";
import { VirtualLive } from "..";
import test from "node:test";

let virtualLiveList:SekaiVirtualLive[];
const virtualLiveJsonDataUrl:string = 'https://sekai-world.github.io/sekai-master-db-diff//virtualLives.json';
const assetUrl:string = 'https://storage.sekai.best/sekai-assets/virtual_live/select/banner';
let lastUpdateTime:number = Date.now()-11*60*1000;


async function getVirtualLiveList(){
    const now = Date.now();
    if(now - lastUpdateTime<1000*60*10){
        // console.log('[HTTP] 还没到十分钟，等会在来吧');
        return;
    }
    else{
        try{
            const response = await axios.get(virtualLiveJsonDataUrl);
            if(response.status==200){
                virtualLiveList = response.data as SekaiVirtualLive[];
                lastUpdateTime=now;
                // virtualLiveList = JSON.parse(response.data);
                console.log('[HTTP] 获取虚拟Live数据成功');
            }
        }
        catch(e){
            console.error('[HTTP] 获取虚拟Live数据失败'+e);
        }
    }
}

function getCurrentVirtualLives():SekaiVirtualLive[]{
    if(virtualLiveList){
        const currentVirtualLives:SekaiVirtualLive[] = virtualLiveList.map((vl)=>{
            const date = Date.now();
            if(vl.startAt<date&&vl.endAt>date&&vl.id<20000){
                return vl;
            }
            else{
                return undefined;
            }
        }).filter((vl)=>vl!=undefined);
        // console.log('当前正在进行中的Live');
        // for(let i =0 ;i<currentVirtualLives.length;i++){
        //     console.log(currentVirtualLives[i].id+' '+currentVirtualLives[i].name);
        // }
        return currentVirtualLives;
    }
    return undefined;
}

export function sendRemindMessage(ctx:Context,channel:Channel[],message:Array<h|string>){
    for(let i =0;i<channel.length;i++){
        if(channel[i].usingVirtualLiveRemind){
            ctx.bots[`${channel[i].platform}:${channel[i].assignee}`].sendMessage(channel[i].id,message)
            console.log(`[reminder] 已向群${channel[i].id}发送了一条消息`)
        }
    }
}

export async function checkVirtualLives(ctx:Context,channel:Channel[]){
    await getVirtualLiveList();
    let cvl = getCurrentVirtualLives();
    // let testvl = new SekaiVirtualLive();
    // testvl.id=1;
    // testvl.name='testvl';
    // cvl.push(testvl);
    // console.log(`[Interval] 进入了一次提醒检测函数,当前有${cvl.length}场演唱会`);
    if(cvl){
        for(let i = 0;i<cvl.length;i++){
            const tempvl = cvl[i];
            //判断数据库中是否存在当前活动
            const data:VirtualLive[] = await ctx.database.get('virtualLive',tempvl.id);
            if(data.length==0){
                let vlschedules:any[]=[];
                console.log(tempvl.virtualLiveSchedules.length);
                for(let j =0;j<tempvl.virtualLiveSchedules.length;j++){
                    vlschedules.push({
                        schedulesid:tempvl.virtualLiveSchedules[j].id,
                        virtualLiveId:tempvl.virtualLiveSchedules[j].virtualLiveId,
                        startAt:tempvl.virtualLiveSchedules[j].startAt,
                        endAt:tempvl.virtualLiveSchedules[j].endAt,
                        reminded:Date.now()>tempvl.virtualLiveSchedules[j].startAt
                    });
                }
                ctx.database.create('virtualLive',{
                    id:tempvl.id,
                    name:tempvl.name,
                    startAt:tempvl.startAt.toString(),
                    endAt:tempvl.endAt.toString(),
                    virtualLiveSchedules:vlschedules
                });
            }
            else{
                const now = Date.now()+1000*60*5;
                const scheduleList = data[0].virtualLiveSchedules;
                for(let j=0;j<scheduleList.length;j++){
                    const tempTime:number = Number(scheduleList[j].startAt);
                    if(now>tempTime&&now<Number(scheduleList[j].endAt)&&scheduleList[j].reminded==false){//当前时间大于开始时间时提醒（提前了五分钟）
                        let messageList = [];
                        try{
                            const url = `${assetUrl}/${tempvl.assetbundleName}_rip/${tempvl.assetbundleName}.png`;
                            const response = await axios.get(url,{ responseType: 'arraybuffer' });
                            let liveBanner = Buffer.from(response.data);
                            messageList.push(h.image(liveBanner,'image/png'));
                        }
                        catch(e){
                            console.error('获取LiveBanner失败');
                        }
                        messageList.push(`Title: ${tempvl.name}\n该演唱会快要开始了，别忘了拿300石头哦`);
                        sendRemindMessage(ctx,channel,messageList);
                        //更新数据库内信息
                        scheduleList[j].reminded=true;
                        ctx.database.set('virtualLive',tempvl.id,{
                            virtualLiveSchedules:data[0].virtualLiveSchedules
                        });
                    }
                }
            }
        }
    }
    else{
        return;
    }
}

