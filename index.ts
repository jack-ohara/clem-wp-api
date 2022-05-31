import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import NodeCache from "node-cache";
import { getMenuData, getPage, getPageByLink, getPages, getPostByLink, getPostDetails, getPosts, getRecentPosts } from "./wordpress";

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

      case 'post':
        const postLink = event.queryStringParameters?.slug ? decodeURIComponent(event.queryStringParameters?.slug) : undefined

        if (!postLink) {
          console.error('Cannot retrieve page from empty slug')
          return {
            statusCode: 400,
            body: 'Cannot retrieve page from empty slug'
          }
        }

        result = (await getPostByLink(postLink)) ?? {}
        break

      case 'page':
        const pageId = parseInt(event.pathParameters?.id ?? '')

        if (pageId) {
          console.log(`Attempting to retrieve page with id ${pageId}`)

          result = await getPage(pageId)
          break
        }

        const pageLink = event.queryStringParameters?.slug ? decodeURIComponent(event.queryStringParameters?.slug) : undefined

        if (!pageLink) {
          console.error('Cannot retrieve page with no id or slug')
          return {
            statusCode: 400,
            body: 'Cannot retrieve page with no id or slug'
          }
        }

        result = (await getPageByLink(pageLink)) ?? {}
        break

      case 'menu':
        result = await getMenuData()
        break

      case 'post-detais':
        result = await getPostDetails()
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
    console.log(error)

    return {
      statusCode: 500,
      body: "Something went wrong... More info in logs"
    }
  }
}