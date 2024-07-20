import axios from 'axios';
import { SekaiEvent } from '../types/SekaiEvent';
import { Channel, Context, h } from 'koishi';
import { sendRemindMessage } from './virtualLiveReminder';
const eventJsonDataUrl:string = 'https://sekai-world.github.io/sekai-master-db-diff//events.json';
const assetUrl:string = 'https://storage.sekai.best/sekai-jp-assets/home/banner';
let sekaiEventList:SekaiEvent[] = []
let lastUpdateTime:number = Date.now()-11*60*1000;
async function getEventList(){
    const now = Date.now();
    if(now - lastUpdateTime<1000*60*10){
        // console.log('[HTTP] 还没到十分钟，等会在来吧');
        return;
    }
    else{
        try{
            const response = await axios.get(eventJsonDataUrl);
            if(response.status==200){
                sekaiEventList = response.data as SekaiEvent[];
                lastUpdateTime=now;
                console.log('[HTTP] 获取活动数据成功');
            }
        }
        catch(e){
            console.error('[HTTP] 获取活动数据失败'+e);
        }
    }
}

function getCurrentEvent(eventList:SekaiEvent[]):SekaiEvent{
    let currentEvent = new SekaiEvent()
    const now = Date.now();
    for(let i = eventList.length-1;i>=0;i--){
        if(now>eventList[i].startAt && now<eventList[i].aggregateAt){
            currentEvent.aggregateAt = eventList[i].aggregateAt;
            currentEvent.assetbundleName = eventList[i].assetbundleName;
            currentEvent.id = eventList[i].id;
            currentEvent.name = eventList[i].name;
            currentEvent.startAt = eventList[i].startAt;
            currentEvent.isReminded = false;
            currentEvent.eventType = eventList[i].eventType;
            break;
        }
    }
    return currentEvent
}

export async function checkEventEndTime(ctx:Context,channel:Channel[]){
    await getEventList()
    let ce = getCurrentEvent(sekaiEventList);
    if(ce){
        //检查数据库中是否存在当前活动
        const eventInDatabase = await ctx.database.get('projectSekaiData',{})
        let isFind = false;
        let eventIndex = -1
        for(let i = eventInDatabase.length-1;i>=0;i--){
            if(eventInDatabase[i].event.id==ce.id){
                isFind = true;
                eventIndex = eventInDatabase[i].id;
                break;
            }
        }
        if(!isFind){
            ctx.database.create('projectSekaiData',{event:ce})
        }
        const now = Date.now() + 1000*60*60
        if(now > ce.aggregateAt && eventInDatabase[eventIndex].event.isReminded == false){
            let messageList = []
            try{
                const url = `${assetUrl}/${ce.assetbundleName}_rip/${ce.assetbundleName}.png`
                const response = await axios.get(url,{responseType:'arraybuffer'})
                const eventBanner = Buffer.from(response.data)
                messageList.push(h.image(eventBanner,'image/png'))
            }
            catch(e){
                console.error('获取活动Banner失败')
            }
            messageList.push(`Title:${ce.name}\n该活动还有一小时就要结活了，需要清火/保排名的记得上线哦`)
            sendRemindMessage(ctx,channel,messageList)
            ce.isReminded = true;
            ctx.database.set('projectSekaiData',eventIndex,{event:ce})
        }
    }
    else{
        return
    }
}