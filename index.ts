import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import NodeCache from "node-cache";
import { Page, Post, User } from "./types/wordpress";
import { getMenuData, getPage, getPages, getPostByLink, getPosts, getRecentPosts, getUsersFromApi } from "./wordpress";

const cache = new NodeCache({ stdTTL: 0 })

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  console.log(JSON.stringify(event, null, 2))

  const pathParts = event.rawPath.split('/').filter(e => e)
  const path = pathParts[pathParts.findIndex(e => e === 'clem-wp') + 1]
  let result: unknown

  try {
    switch (path) {
      case 'post-slugs':
        const posts = await getPosts()
        result = posts.map(d => d.slug)
        break

      case 'page-slugs':
        const pages = await getPages()
        result = pages.map(p => p.slug)
        break

      case 'recent-posts':
        result = await getRecentPosts()
        break

      case 'users':
        result = await getUsers()
        break

      case 'post':
        const link = event.queryStringParameters?.slug ? decodeURIComponent(event.queryStringParameters?.slug) : undefined
        if (!link) {
          console.error('Cannot retrieve page from empty slug')
          return {
            statusCode: 400,
            body: 'Cannot retrieve page from empty slug'
          }
        }

        result = await getPostByLink(link)
        break

      case 'page':
        const pageId = parseInt(event.pathParameters?.id ?? '')

        if (!pageId) {
          result = { message: 'Must supply a valid numerical id' }
          break
        }

        result = await getPage(pageId)
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

async function getUsers() {
  const cachedUsers = cache.get<User[]>('wp-users')

  if (cachedUsers) {
    return cachedUsers
  }

  const apiUsers = await getUsersFromApi()
  cache.set('wp-users', apiUsers)

  return apiUsers
}