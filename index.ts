import { APIGatewayProxyEvent, APIGatewayProxyResultV2 } from "aws-lambda";

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResultV2> {
  return {
    statusCode: 200,
    body: 'Hey from clem'
  }
}