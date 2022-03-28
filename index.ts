import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 0 })

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const path = event.rawPath.split('/').slice(-1)[0]
  let body: string

  switch (path) {
    case 'posts':
      body = 'Here are some posts...'
      break

    case 'pages':
      body = 'Here are some pages...'
      break

    default:
      body = 'What the hell is that?'
      break
  }

  return {
    statusCode: 200,
    body
  }
}