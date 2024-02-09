import {ChatSession, EnhancedGenerateContentResponse, GenerateContentResult, GenerationConfig, GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, SafetySetting,ModelParams, GenerativeModel} from '@google/generative-ai'
import {setGlobalDispatcher, ProxyAgent} from 'undici'


interface chatHistory{
    history:{
        role:string,
        parts:string
    }[]
    generationConfig:{
        maxOutputTokens:number
    }
}

export class GeminiClient{
    dispatcher:ProxyAgent
    genAi:GoogleGenerativeAI
    model:GenerativeModel
    ch:chatHistory = {history:[],generationConfig:{maxOutputTokens:100000}}
    chat:ChatSession
    safetySettings:SafetySetting[] = [
        {
            category:HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold:HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category:HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold:HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category:HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold:HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
            category:HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold:HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
    ]
    generationConfig:GenerationConfig = {
        maxOutputTokens:1000000,
        temperature:1,
    }
    modelParams:ModelParams = {model:'gemini-pro', safetySettings:this.safetySettings, generationConfig:this.generationConfig}

    constructor(apikey:string,proxy?:string){
        if(proxy!=undefined){
            this.dispatcher = new ProxyAgent({uri:new URL(proxy).toString()})
            setGlobalDispatcher(this.dispatcher)
        }
        this.genAi = new GoogleGenerativeAI(apikey)
        this.model = this.genAi.getGenerativeModel(this.modelParams)
        this.chat = this.model.startChat(this.ch)
    }

    async textDialogue(prompt:string):Promise<string>{
        const result:GenerateContentResult = await this.model.generateContent(prompt)
        const response:EnhancedGenerateContentResponse = await result.response;
        const reply:string = response.text();
        if(reply!=undefined&&reply!=''){
            return reply
        }
        return undefined
    }

    async longDilogue(prompt:string):Promise<string>{
        try{
            const result:GenerateContentResult = await this.chat.sendMessage(prompt)
            const response:EnhancedGenerateContentResponse = await result.response
            console.log(response.promptFeedback.safetyRatings)
            const reply = response.text()
            // console.log('*************下面是response*************')
            // console.log(response)
            // console.log('*************下面是history*************')
            // console.log(ch.history)
            return reply
        }
        catch(e){
            console.log(e)
        }
        return ''
    }

    async textAndImageDialogue(prompt:string,image:JSX.ResourceElement[]):Promise<string>{
        const model2 = this.genAi.getGenerativeModel({ model: "gemini-pro-vision" })
        const imageParts = []
        for(let i = 0; i < image.length; i++){
            const tempBuffer = await this.fetchImageToBuffer(image[i].src)
            imageParts.push(this.fileToGenerativePart(tempBuffer,'image/png'))
        }
        try{
            const result:GenerateContentResult = await model2.generateContent([prompt,...imageParts])
            const response:EnhancedGenerateContentResponse = await result.response
            const reply:string = response.text();
            if(reply!=undefined&&reply!=''){
                return reply
            }
        }
        catch(e){
            return '发生错误'
        }
        return undefined
    }

    resetChat(){
        this.chat = this.model.startChat(this.ch)
    }
    
    fileToGenerativePart(buffer:Buffer,mimeType:string){
        return {
            inlineData:{
                data:buffer.toString('base64'),
                mimeType
            }
        }
    }
    
    async fetchImageToBuffer(imageUrl: string): Promise<Buffer | null> {
        try {
          const response = await fetch(imageUrl);
          
          if (!response.ok) {
            console.error(`Failed to fetch image. Status: ${response.status}`);
            return null;
          }
      
          const buffer = Buffer.from(await response.arrayBuffer())
          return buffer;
        } catch (error) {
          console.error('Error fetching image:', error.message);
          return null;
        }
      }
  }