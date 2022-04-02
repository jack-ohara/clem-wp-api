import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { getPages, getPosts, getUsersFromApi } from './wordpress';

export async function storeWpContent() {
  const dbClient = new DynamoDB({ region: 'eu-west-2' })

  const users = await getUsersFromApi()
  // const pages = await getPages()
  // const posts = await getPosts()

  for (const user of users) {
    dbClient.putItem({
      TableName: 'clem-wp-content', Item: {
        'wp-entity-type': { S: 'user' },
        'entity-id': { N: user.id.toString() },
        name: { S: user.name }
      }
    })
  }
}