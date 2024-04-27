import { receiveBody, sendPostRequest } from "../utils";

export async function commandMusic(backendUrl:string,text:string):Promise<receiveBody>{
    const data = {type:'string',context:text,from:'koishi'}
    console.log('send /music ',data)
    return await sendPostRequest(`${backendUrl}/music`,data);
}