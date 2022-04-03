import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, EventBridgeEvent } from "aws-lambda";
import NodeCache from "node-cache";
import fetch from "node-fetch";
import { storeWpContent } from "./data-store";
import { Page, Post, User } from "./types/wordpress";
import { getPages, getPosts, getPostSlugs, getUsersFromApi } from "./wordpress";

const cache = new NodeCache({ stdTTL: 0 })

export async function handler(event: APIGatewayProxyEventV2 | EventBridgeEvent<'Scheduled Event', {}>): Promise<APIGatewayProxyResultV2> {
  console.log(JSON.stringify(event, null, 2))

  const eventBridgeEvent = event as EventBridgeEvent<'Scheduled Event', {}>
  const apiGatewayEvent = event as APIGatewayProxyEventV2

  if (eventBridgeEvent.source) {
    try {
      await storeWpContent()

      return {
        statusCode: 200
      }
    } catch (e) {
      console.error(e)

      return {
        statusCode: 502,
        body: "Something went wrong... check logs"
      }
    }
  }

  const path = apiGatewayEvent.rawPath.split('/').slice(-1)[0]
  let result: unknown

  try {
    switch (path) {
      case 'posts':
        result = await getWpEntities<Post>('wp-posts', getPosts)
        break

      case 'pages':
        result = await getWpEntities<Page>('wp-pages', getPages)
        break

      case 'something':
        result = await getSomething()
        break

      case 'users':
        result = await getUsers()
        break

      case 'post-slugs':
        result = await getPostSlugs()
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

async function getWpEntities<TWpEntity>(cacheKey: string, getEntitiesFunction: () => Promise<TWpEntity[]>): Promise<TWpEntity[]> {
  const cachedEntities = cache.get<TWpEntity[]>(cacheKey)

  if (cachedEntities) {
    console.log(`Returning ${cacheKey} from cache...`)
    return cachedEntities
  }

  console.log(`Getting ${cacheKey} from wp api`)

  const apiResult = await getEntitiesFunction()
  cache.set(cacheKey, apiResult)

  return apiResult
}

async function getUsers() {
  const cachedUsers = cache.get<User[]>('wp-users')

  if (cachedUsers) {
    return cachedUsers
  }

  const apiUsers = await getUsersFromApi()
  cache.set('wp-users', apiUsers)

  return apiUsers
}