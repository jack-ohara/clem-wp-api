import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import fetch from "node-fetch";
import { getPages, getPosts } from "./wordpress";

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const path = event.rawPath.split('/').slice(-1)[0]
  let result: unknown

  try {
    switch (path) {
      case 'posts':
        result = await getPosts()
        break

      case 'pages':
        result = await getPages()
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