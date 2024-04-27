import axios from 'axios'
import exp from 'constants';
import { h, Session,Element} from 'koishi';

export interface receiveBody{
    context:{type:string,content:string}[],
    from:string
}
export interface sendBody{
    type:string,
    context:string,
    from:string
}

export async function sendPostRequest(url:string,data:sendBody):Promise<receiveBody> {
    try{
        const response = await axios.post(url,data);
        if(response.status == 200){
            const result = response.data as receiveBody;
            return result;
        }
    }
    catch(error){
        if(axios.isAxiosError(error)){
            console.error('Axios Error',error.message)
            return {
                context:[{type:'string',content:'无法连接到后端服务器'}],
                from:'self'
            }
        }
        else {
            console.error('Error:', error.message);
          }
          return {
            context:[{type:'string',content:'内部错误'}],
            from:'self'
        }
    }
}

export function sendByDataType(data:any,session:Session){
    if(data instanceof Buffer){
        session.send(h.image(data,'image/png'));
      }
      else if(typeof data == 'string'){
        return data;
      }
}

export function paresMessageList(msg:receiveBody): Array<Element | string> {
    if (!msg) {
      return []
    }
    let messageList = []
    for (let i = 0; i < msg.context.length; i++) {
      parseMessage(msg.context[i])
    }
    function parseMessage( message:{type:string,content:string}) {
      if (message.type == 'string') {
        messageList.push(message.content)
      }
      else if (message.type == 'image') {
        messageList.push(h.image(Buffer.from(message.content,'base64'), 'image/png'))
      }
    }
    return messageList
  }

  export function replaceImgTags(input: string): string {
    const regex = /<img.*?\/>/gi;
    return input.replace(regex, '[图片]');
}