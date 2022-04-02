import { BatchWriteItemCommandInput, DynamoDB } from '@aws-sdk/client-dynamodb';
import { getPages, getPosts, getUsersFromApi } from './wordpress';

export async function storeWpContent() {
  const dbClient = new DynamoDB({ region: 'eu-west-2' })

  const users = await getUsersFromApi()
  const pages = await getPages()
  // const posts = await getPosts()

  const usersParams: BatchWriteItemCommandInput = {
    RequestItems: {
      'clem-wp-content': users.map((user) => ({
        PutRequest: {
          Item: {
            'wp-entity-type': { S: 'user' },
            'entity-id': { N: user.id.toString() },
            name: { S: user.name }
          }
        }
      }))
    }
  }

  await dbClient.batchWriteItem(usersParams)

  // for (const user of users) {
  //   await dbClient.putItem({
  //     TableName: 'clem-wp-content', Item: {
  //       'wp-entity-type': { S: 'user' },
  //       'entity-id': { N: user.id.toString() },
  //       name: { S: user.name }
  //     }
  //   })
  // }

  for (const page of pages) {
    await dbClient.putItem({
      TableName: 'clem-wp-content',
      Item: {
        'wp-entity-type': { S: 'pages' },
        'entity-id': { N: page.id.toString() },
        slug: { S: page.slug },
        title: { S: page.title },
        content: { S: page.content }
      }
    })
  }
}