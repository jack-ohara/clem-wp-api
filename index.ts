import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import NodeCache from "node-cache";
import { Page, Post, User } from "./types/wordpress";
import { getMenuData, getPages, getPostBySlug, getPosts, getUsersFromApi } from "./wordpress";

const cache = new NodeCache({ stdTTL: 0 })

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  console.log(JSON.stringify(event, null, 2))

  const pathParts = event.rawPath.split('/').filter(e => e)
  const path = pathParts[pathParts.findIndex(e => e === 'clem-wp') + 1]
  let result: unknown

  try {
    switch (path) {
      case 'posts':
        result = await getWpEntities<Post>('wp-posts', getPosts)
        break

      case 'pages':
        result = await getWpEntities<Page>('wp-pages', getPages)
        break

      case 'users':
        result = await getUsers()
        break

      case 'post-slugs':
        const posts = await getPosts()
        result = posts.map(d => d.slug)
        break

      case 'post':
        const slug = event.queryStringParameters?.slug ? event.queryStringParameters?.slug : undefined
        if (!slug) {
          console.error('Cannot retrieve page from empty slug')
          return {
            statusCode: 400,
            body: 'Cannot retrieve page from empty slug'
          }
        }

        result = await getPostBySlug(slug)
        break

      case 'page':
        const pageId = event.pathParameters?.id

        result = `Gonna find page ${pageId}`
        break

      case 'menu':
        result = await getMenuData()
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