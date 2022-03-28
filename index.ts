import { APIGatewayProxyEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 0 })

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResultV2> {
  console.log(event.path, null, 2)
  
  if (cache.has('keykey')) {
    return {
      statusCode: 200,
      body: 'Hey from clem'
    }
  }

  cache.set('keykey', { something: 'nothing' })

  return {
    statusCode: 200,
    body: 'No dice'
  }
}