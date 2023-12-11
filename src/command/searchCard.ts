import { buffer } from "stream/consumers";
import { receiveBody, sendPostRequest } from "../utils";

export async function commandCard(backendUrl:string,text:string):Promise<receiveBody>{
    const data = {
        type:'string',
        context:text,
        from:'koishi'
    }
    console.log('send /card '+ JSON.stringify(data))
    return await sendPostRequest(`${backendUrl}/card`,data);
}

export async function commandCardIll(backendUrl:string,text:string):Promise<receiveBody>{
    return await sendPostRequest(`${backendUrl}/cardIll`,{type:'string',context:text,from:'koishi'});
}