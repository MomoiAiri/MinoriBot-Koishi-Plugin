import { buffer } from "stream/consumers";
import { receiveBody, sendPostRequest } from "../utils";

export async function commandCard(backendUrl:string,text:string):Promise<receiveBody>{
    return await sendPostRequest(`${backendUrl}/card`,{type:'string',context:text,from:'koishi'});
}

export async function commandCardIll(backendUrl:string,text:string):Promise<receiveBody>{
    return await sendPostRequest(`${backendUrl}/cardIll`,{type:'string',context:text,from:'koishi'});
}