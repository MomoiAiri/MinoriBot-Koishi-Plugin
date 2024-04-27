import { receiveBody, sendPostRequest } from "../utils";

export async function commandGacha(backendUrl:string,text:string):Promise<receiveBody>{
    const data = {type:'string',context:text,from:'koishi'}
    console.log('send /gacha ',data)
    return await sendPostRequest(`${backendUrl}/gacha`,data);
}