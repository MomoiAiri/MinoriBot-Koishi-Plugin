import { receiveBody, sendPostRequest } from "../utils";

export async function commandMusic(backendUrl:string,text:string):Promise<receiveBody>{
    return await sendPostRequest(`${backendUrl}/music`,{type:'string',context:text,from:'koishi'});
}