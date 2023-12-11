export class SekaiVirtualLive{
    id:number
    virtualLiveType:string
    name:string
    assetbundleName:string
    startAt:number
    endAt:number
    liveBannerAssetUrl:string
    virtualLiveSchedules:{
        id:number
        virtualLiveId:number
        startAt:number
        endAt:number
    }[]

    getLiveBannerAssetUrl(assetUrl:string):string{
        this.liveBannerAssetUrl = `${assetUrl}/sekai-assets/virtual_live/select/banner/${this.assetbundleName}_rip/${this.assetbundleName}.png`;
        return this.liveBannerAssetUrl;
    }
}