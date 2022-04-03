import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { getPages, getPosts, getUsersFromApi } from './wordpress';

export async function storeWpContent() {
  const dbClient = new DynamoDB({ region: 'eu-west-2' })

  const usersPromise = getUsersFromApi()
  const pagesPromise = getPages()
  const postsPromise = getPosts()

  const [users, pages, posts] = await Promise.all([usersPromise, pagesPromise, postsPromise])

  for (const user of users) {
    await dbClient.updateItem({
      TableName: 'clem-wp-content',
      ReturnValues: 'ALL_NEW',
      Key: {
        'wp-entity-type': { S: 'user' },
        'entity-id': { N: user.id.toString() }
      },
      ExpressionAttributeNames: {
        '#N': 'name',
      },
      ExpressionAttributeValues: {
        ':n': { S: user.name },
      },
      UpdateExpression: 'SET #N = :n'
    })
  }

  for (const page of pages) {
    await dbClient.updateItem({
      TableName: 'clem-wp-content',
      ReturnValues: 'ALL_NEW',
      Key: {
        'wp-entity-type': { S: 'page' },
        'entity-id': { N: page.id.toString() }
      },
      ExpressionAttributeNames: {
        '#S': 'slug',
        '#T': 'title',
        '#C': 'content'
      },
      ExpressionAttributeValues: {
        ':s': { S: page.slug },
        ':t': { S: page.title },
        ':c': { S: page.content }
      },
      UpdateExpression: "SET #S = :s, #T = :t, #C = :c"
    })
  }

  for (const post of posts) {
    await dbClient.updateItem({
      TableName: 'clem-wp-content',
      ReturnValues: 'ALL_NEW',
      Key: {
        'wp-entity-type': { S: 'post' },
        'entity-id': { N: post.id.toString() }
      },
      ExpressionAttributeNames: {
        '#S': 'slug',
        '#T': 'title',
        '#C': 'content',
        '#Ty': 'type',
        '#A': 'author',
        '#D': 'date',
        '#E': 'excerpt',
        '#FI': 'featuredImage'
      },
      ExpressionAttributeValues: {
        ':s': { S: post.slug },
        ':t': { S: post.title },
        ':c': { S: post.content },
        ':ty': { S: post.type },
        ':a': { S: post.author },
        ':d': { S: post.date },
        ':e': post.excerpt ? { S: post.excerpt } : { NULL: true },
        ':fi': post.featuredImage ? { M: { url: { S: post.featuredImage.url }, altText: { S: post.featuredImage.altText } } } : { NULL: true }
      },
      UpdateExpression: "SET #S = :s, #T = :t, #C = :c, #Ty = :ty, #A = :a, #D = :d, #E = :e, #FI = :fi"
    })
  }
}