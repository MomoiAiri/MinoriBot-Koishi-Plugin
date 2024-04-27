import kpp from 'koishi-plugin-puppeteer';
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js';
import { Context } from 'koishi';
import { Config } from '..';
import Puppeteer from 'koishi-plugin-puppeteer';
import { unwatchFile } from 'node:fs';

export async function getScreenShot(markdown:string,ctx:Context):Promise<Buffer>{
    const marked = new Marked(markedHighlight({
        langPrefix:'hljs language-',
        highlight(code,lang,info){
            const language = hljs.getLanguage(lang) ? lang : 'plaintext'
            return hljs.highlight(code,{language}).value
        }
    }))
    let htmlString =  marked.parse(markdown).toString()
    const html = `
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-top: 20px;
        }
        pre {
          background-color: #f6f8fa;
          border-radius: 6px;
          padding: 16px;
          overflow: auto;
        }
        code {
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
          font-size: 12px;
        }
      </style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/default.min.css">
    </head>
    <body>
      ${htmlString}
    </body>
    </html>
    `
    const result = await ctx.puppeteer.render(html,async(page,next)=>{
      const image = await page.screenshot({fullPage:true,type:'jpeg',quality:100})
      return image.toString('base64')
    })
    return Buffer.from(result,'base64')
}