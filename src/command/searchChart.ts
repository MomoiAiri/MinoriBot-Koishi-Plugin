import { receiveBody, sendPostRequest } from "../utils";

export async function commandChart(backendUrl:string,text:string):Promise<receiveBody>{
    return await sendPostRequest(`${backendUrl}/chart`,{type:'string',context:text,from:'koishi'});
}