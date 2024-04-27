export class SekaiEvent{
    id:number
    eventType:string
    name:string
    assetbundleName:string
    startAt:number
    aggregateAt:number
    isReminded:boolean = false
}