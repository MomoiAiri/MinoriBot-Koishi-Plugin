import { receiveBody, sendPostRequest } from "../utils";

export async function commandEvent(backendUrl:string,text:string):Promise<receiveBody>{
    return await sendPostRequest(`${backendUrl}/event`,{type:'string',context:text,from:'koishi'});
}