import { MenuItem, Page, Post, PostDetail, User } from "../types/wordpress";
import responseTypes from "../types/wordpress-responses";
import { JSDOM } from "jsdom";
import NodeCache from "node-cache";
import fetch, { Response } from "node-fetch"

const urlReplace = `^(${process.env.WP_BASE_URL})`;
const urlRegRx = new RegExp(urlReplace);

const wpCache = new NodeCache({ stdTTL: 0 });

export async function getRecentPosts() {
  const recentPostsRaw = await fetchFromWordpress('posts?_embed&per_page=12&order=desc&status=publish');

  const recentPosts = await recentPostsRaw.json() as responseTypes.Post[];

  return mapPostsResponseToDomain(recentPosts);
}

export async function getPage(id: number): Promise<Page> {
  const page = await fetchFromWordpress(`pages/${id}`);

  const rawPage = await page.json() as responseTypes.Page;

  return {
    id: rawPage.id,
    slug: rawPage.link.replace(urlRegRx, ""),
    content: rawPage.content.rendered,
    title: rawPage.title.rendered
  }
}

export async function getPost(id: number): Promise<Post> {
  const page = await fetchFromWordpress(`posts/${id}`);

  const rawPost = await page.json() as responseTypes.Post;

  return {
    id: rawPost.id,
    slug: rawPost.link.replace(urlRegRx, ''),
    type: rawPost.type,
    date: rawPost.date_gmt,
    title: extractTextFromHtml(rawPost.title.rendered),
    content: rawPost.content.rendered,
    excerpt: extractTextFromHtml(rawPost.excerpt.rendered),
    author: rawPost._embedded.author[0].name,
    featuredImage: rawPost._embedded["wp:featuredmedia"] ? {
      url: rawPost._embedded["wp:featuredmedia"][0].media_details.sizes.medium_large?.source_url ?? rawPost._embedded["wp:featuredmedia"][0].media_details.sizes.full.source_url,
      altText: rawPost._embedded["wp:featuredmedia"][0].alt_text ?? extractTextFromHtml(rawPost._embedded["wp:featuredmedia"][0].title.rendered)
    } : null
  }
}

export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  const allPages = await getPages();

  return allPages.find(p => p.slug.replace(/^(.*)(\/)$/, '$1') === slug)
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const allPostDetails = await getPostDetails();

  const postId = allPostDetails.find(p => p.slug.replace(/^(.*)(\/)$/, '$1') === slug)?.id

  console.log(`Could not find id for post with slug '${slug}'`)

  if (!postId) return

  console.log(`Post with slug '${slug}' found with id ${postId}`)

  return await getPost(postId)
}

export async function getPages(): Promise<Page[]> {
  const pageMap = (rawPage: responseTypes.Page): Page => ({
    id: rawPage.id,
    slug: rawPage.link.replace(urlRegRx, ""),
    content: rawPage.content.rendered,
    title: rawPage.title.rendered
  })

  return await makePaginatedCall(`pages?_embed&per_page=100`, pageMap)
}

export async function getPosts(): Promise<Post[]> {
  const postMap = (item: responseTypes.Post): Post => (
    {
      id: item.id,
      slug: item.link.replace(urlRegRx, ''),
      type: item.type,
      date: item.date_gmt,
      title: extractTextFromHtml(item.title.rendered),
      content: item.content.rendered,
      excerpt: extractTextFromHtml(item.excerpt.rendered),
      author: item._embedded.author[0].name,
      featuredImage: item._embedded["wp:featuredmedia"] ? {
        url: item._embedded["wp:featuredmedia"][0].media_details.sizes.medium_large?.source_url ?? item._embedded["wp:featuredmedia"][0].media_details.sizes.full.source_url,
        altText: item._embedded["wp:featuredmedia"][0].alt_text ?? extractTextFromHtml(item._embedded["wp:featuredmedia"][0].title.rendered)
      } : null
    }
  )
  return await makePaginatedCall(`posts?_embed&per_page=50`, postMap)
}

export async function getPostDetails(): Promise<PostDetail[]> {
  const mapFunction = (post: responseTypes.Post): PostDetail => ({
    id: post.id,
    slug: post.link.replace(urlRegRx, '')
  })

  return await makePaginatedCall(`posts?context=embed&per_page=100`, mapFunction)
}

async function makePaginatedCall<TRaw, TResponse>(url: string, mappingFunction: (r: TRaw) => TResponse): Promise<TResponse[]> {
  let entities: TResponse[] = [];
  let pageNumber = 1;
  let totalNumberOfPages = 0;

  do {
    const result = await fetchFromWordpress(`${url}&page=${pageNumber}`);

    totalNumberOfPages = parseInt(result.headers.get('x-wp-TotalPages') ?? "0")

    const rawEntities = await result.json() as TRaw[]

    try {
      entities = entities.concat(rawEntities.map(mappingFunction))
    } catch (e) {
      console.error(JSON.stringify(e, null, 2))
    }

    pageNumber++;
  } while (pageNumber <= totalNumberOfPages)

  return entities;
}

export async function getMenuData(): Promise<MenuItem[]> {
  const cachedItems = wpCache.get<MenuItem[]>('wp-menu-items');
  if (cachedItems) return cachedItems;

  console.log('Fetching menu items from api...')

  const menuDataRaw = await fetchFromWordpress("new-menu");

  const menuData = await menuDataRaw.json() as responseTypes.MenuItem[];

  const menuItems = mapMenuResponseToDomain(menuData);

  wpCache.set('wp-menu-items', menuItems)

  return menuItems
}

export async function getUsersFromApi() {
  const response = await fetchFromWordpress('users')

  const users = (await response.json() as any[]).map((i): User => ({ id: i.id, name: i.name }))

  return users
}

function mapPostsResponseToDomain(responseItems: responseTypes.Post[]): Post[] {
  return responseItems.map(item => (
    {
      id: item.id,
      slug: item.link.replace(urlRegRx, ''),
      type: item.type,
      date: item.date_gmt,
      title: extractTextFromHtml(item.title.rendered),
      content: extractTextFromHtml(item.content.rendered),
      excerpt: extractTextFromHtml(item.excerpt.rendered),
      author: item._embedded.author[0].name,
      featuredImage: item._embedded["wp:featuredmedia"] ? {
        url: item._embedded["wp:featuredmedia"][0].media_details.sizes.medium_large?.source_url ?? item._embedded["wp:featuredmedia"][0].media_details.sizes.full.source_url,
        altText: item._embedded["wp:featuredmedia"][0].alt_text ?? extractTextFromHtml(item._embedded["wp:featuredmedia"][0].title.rendered)
      } : null
    }
  ))
}

function mapMenuResponseToDomain(responseItems: responseTypes.MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];
  let itemsToAllocate = responseItems;

  let atLeastOneItemAdded: boolean;

  do {
    atLeastOneItemAdded = false;
    const itemsNotPlaced: responseTypes.MenuItem[] = [];

    for (const item of itemsToAllocate) {
      const parentId = parseInt(item.menu_item_parent);

      if (parentId) {
        let parent: MenuItem | undefined;

        for (const placedItem of result) {
          parent = tryGetParent(placedItem, parentId);

          if (parent) break;
        }

        if (!parent) {
          itemsNotPlaced.push(item);

          continue;
        };

        parent.childItems.push({
          id: item.ID,
          label: item.title,
          menuOrder: item.menu_order,
          url: item.url.replace(urlRegRx, ''),
          childItems: [],
          parentId
        })
      } else {
        result.push({
          id: item.ID,
          label: item.title,
          menuOrder: item.menu_order,
          url: item.url.replace(urlRegRx, ''),
          childItems: []
        })
      }

      atLeastOneItemAdded = true;
    }

    itemsToAllocate = itemsNotPlaced;
  } while (atLeastOneItemAdded)

  result.forEach(sortChildren)

  return result.sort((a, b) => a.menuOrder > b.menuOrder ? 1 : -1);
}

/**
 * Will return the item itself if it is the parent, or the child item
 * if it is a nested child (will keep checking all the way down the chain)
 * @param itemToCheck 
 * @param targetParentItem 
 */
function tryGetParent(itemToCheck: MenuItem, targetParentItem: number): MenuItem | undefined {
  if (itemToCheck.id === targetParentItem) return itemToCheck;

  for (const child of itemToCheck.childItems) {
    const resultFromChild = tryGetParent(child, targetParentItem);

    if (resultFromChild) return resultFromChild;
  }
}

function sortChildren(item: MenuItem): void {
  if (item.childItems.length) {
    item.childItems.sort((a, b) => a.menuOrder > b.menuOrder ? 1 : -1);

    item.childItems.forEach(sortChildren);
  }
}

function extractTextFromHtml(html: string): string {
  return new JSDOM(html).window.document.querySelector("*")?.textContent ?? "";
}

async function fetchFromWordpress(relativeURL: string, retryCount: number = 5): Promise<Response> {
  if (!process.env.WP_JSON_ENDPOINT_BASE_URL) {
    throw new Error("Wordpress base URL not found in environment variable")
  }

  const url = `${process.env.WP_JSON_ENDPOINT_BASE_URL}${relativeURL.startsWith('/') ? relativeURL : `/${relativeURL}`}`;

  console.log(`Calling ${url}`)

  try {
    return await fetch(url)
  } catch (e) {
    console.error(JSON.stringify(e, null, 2))
    console.log(url)

    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      return fetchFromWordpress(relativeURL, retryCount - 1)
    }

    console.error(`Failed to call ${url}`)

    throw e
  }
}