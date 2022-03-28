import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import NodeCache from "node-cache";
import fetch from "node-fetch";
import { Page } from "./types/wordpress";
import { getPages, getPosts } from "./wordpress";

const cache = new NodeCache({ stdTTL: 0 })

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const path = event.rawPath.split('/').slice(-1)[0]
  let result: unknown

  try {
    switch (path) {
      case 'posts':
        result = await getPosts()
        break

      case 'pages':
        const cachedPages = cache.get<Page[]>('wp-pages')
        if (cachedPages) {
          console.log('Returning pages from cache...')
          result = cachedPages
        } else {
          console.log('Getting pages from wp api')
          result = await getPages()
          cache.set('wp-pages', result)
        }
        break

      case 'something':
        result = await getSomething()
        break

      default:
        result = { message: 'What the hell is that?' }
        break
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    }
  } catch (error) {
    console.error(JSON.stringify(error))

    return {
      statusCode: 500,
      body: "Something went wrong... More info in logs"
    }
  }
}

async function getSomething() {
  const result = await fetch('https://icanhazdadjoke.com/')

  return await result.text()
}