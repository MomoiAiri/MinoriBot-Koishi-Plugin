import { receiveBody, sendPostRequest } from "../utils";

export async function commandEvent(backendUrl:string,text:string):Promise<receiveBody>{
    const data = {type:'string',context:text,from:'koishi'}
    console.log('send /event ',data)
    return await sendPostRequest(`${backendUrl}/event`,data);
}