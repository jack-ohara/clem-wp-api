import { MenuItem, Page, Post } from "../types/wordpress";
import responseTypes from "../types/wordpress-responses";
import { JSDOM } from "jsdom";
import NodeCache from "node-cache";
import axios, { AxiosResponse } from 'axios'

const urlReplace = `^(${process.env.WP_BASE_URL})`;
const urlRegRx = new RegExp(urlReplace);

const wpCache = new NodeCache({ stdTTL: 0 });

export async function getRecentPosts() {
  const response = await fetchFromWordpress<responseTypes.Post[]>('posts?_embed&per_page=12&order=desc&status=publish');

  return response.data.map(item => (
    {
      title: extractTextFromHtml(item.title.rendered),
      slug: item.link.replace(urlRegRx, ''),
      date: item.date_gmt,
      excerpt: extractTextFromHtml(item.excerpt.rendered),
      author: item._embedded.author[0].name,
      featuredImage: item._embedded["wp:featuredmedia"] ? {
        url: item._embedded["wp:featuredmedia"][0].media_details.sizes.medium_large?.source_url ?? item._embedded["wp:featuredmedia"][0].media_details.sizes.full.source_url,
        altText: item._embedded["wp:featuredmedia"][0].alt_text ?? extractTextFromHtml(item._embedded["wp:featuredmedia"][0].title.rendered)
      } : null
    }
  ))
}

export async function getPage(id: number): Promise<Page> {
  const response = await fetchFromWordpress<responseTypes.Page>(`pages/${id}?_embed`);

  const rawPage = response.data

  return {
    id: rawPage.id,
    slug: rawPage.link.replace(urlRegRx, ""),
    content: rawPage.content.rendered,
    title: rawPage.title.rendered,
    featuredImage: rawPage._embedded["wp:featuredmedia"] ? {
      url: rawPage._embedded["wp:featuredmedia"][0].media_details.sizes.medium_large?.source_url ?? rawPage._embedded["wp:featuredmedia"][0].media_details.sizes.full.source_url,
      altText: rawPage._embedded["wp:featuredmedia"][0].alt_text ?? extractTextFromHtml(rawPage._embedded["wp:featuredmedia"][0].title.rendered)
    } : null
  }
}

export async function getPageByLink(link: string): Promise<Page | undefined> {
  console.log(`Attempting to find page with link '${link}'`)

  const cachedPages = wpCache.get<Page[]>('pages')

  if (cachedPages) {
    // From a consumer point of view, the entire slug will be /grand-parent/parent/child
    // so that's what we store in the cache

    const cachedPost = cachedPages.find(page => page.slug === link || page.slug === `${link}/`)

    if (cachedPost) return cachedPost
  }

  // WP sees the slug only as 'child', so we need to grab
  // the last component of the link to send to their api

  const slug = link.split('/').filter(e => e).slice(-1)[0]

  const response = await fetchFromWordpress<responseTypes.Post[]>(`pages?_embed&slug=${slug}`)

  const pages = response.data

  if (!pages.length) {
    console.log(`Did not retrieve any posts from WP with slug matching ${decodeURIComponent(link)}`)
    return
  }

  if (pages.length > 1) {
    console.log(`Found multiple posts matching slug ${decodeURIComponent(link)}. This endpoint only supports single slugs`)
    return
  }

  const rawPage = pages[0]

  return {
    id: rawPage.id,
    slug: rawPage.link.replace(urlRegRx, ""),
    content: rawPage.content.rendered,
    title: rawPage.title.rendered,
    featuredImage: rawPage._embedded["wp:featuredmedia"] ? {
      url: rawPage._embedded["wp:featuredmedia"][0].media_details.sizes.medium_large?.source_url ?? rawPage._embedded["wp:featuredmedia"][0].media_details.sizes.full.source_url,
      altText: rawPage._embedded["wp:featuredmedia"][0].alt_text ?? extractTextFromHtml(rawPage._embedded["wp:featuredmedia"][0].title.rendered)
    } : null
  }
}

export async function getPostByLink(link: string): Promise<Post | undefined> {
  console.log(`Attempting to find post with link '${link}'`)

  const cachedPosts = wpCache.get<Post[]>('posts')

  if (cachedPosts) {
    // From a consumer point of view, the entire slug will be /grand-parent/parent/child
    // so that's what we store in the cache

    const cachedPost = cachedPosts.find(post => post.slug === link || post.slug === `${link}/`)

    if (cachedPost) return cachedPost
  }

  // WP sees the slug only as 'child', so we need to grab
  // the last component of the link to send to their api

  const slug = link.split('/').filter(e => e).slice(-1)[0]

  const response = await fetchFromWordpress<responseTypes.Post[]>(`posts?_embed&slug=${slug}`)

  const posts = response.data

  if (!posts.length) {
    console.log(`Did not retrieve any posts from WP with slug matching ${decodeURIComponent(link)}`)
    return
  }

  if (posts.length > 1) {
    console.log(`Found multiple posts matching slug ${decodeURIComponent(link)}. This endpoint only supports single slugs`)
    return
  }

  const rawPost = posts[0]

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

export async function getPages(): Promise<Page[]> {
  const cachedPages = wpCache.get<Post[]>('pages')

  if (cachedPages) return cachedPages

  const pageMap = (rawPage: responseTypes.Page): Page => ({
    id: rawPage.id,
    slug: rawPage.link.replace(urlRegRx, ""),
    content: rawPage.content.rendered,
    title: rawPage.title.rendered
  })

  const pages = await makePaginatedCall(`pages?_embed&per_page=100`, pageMap)

  wpCache.set('pages', pages)

  return pages
}

export async function getPosts(): Promise<Post[]> {
  const cachedPosts = wpCache.get<Post[]>('posts')

  if (cachedPosts) return cachedPosts

  const postMap = (item: responseTypes.Post): Post => (
    {
      id: item.id,
      slug: item.link.replace(urlRegRx, ""),
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
  const posts = await makePaginatedCall(`posts?_embed&per_page=50`, postMap)

  wpCache.set('posts', posts)

  return posts
}

async function makePaginatedCall<TRaw, TResponse>(url: string, mappingFunction: (r: TRaw) => TResponse): Promise<TResponse[]> {
  let entities: TResponse[] = [];
  let pageNumber = 1;
  let totalNumberOfPages = 0;

  do {
    const response = await fetchFromWordpress<TRaw[]>(`${url}&page=${pageNumber}`);

    totalNumberOfPages = parseInt(response.headers['x-wp-totalpages'] ?? "0")

    try {
      entities = entities.concat(response.data.map(mappingFunction))
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

  const response = await fetchFromWordpress<responseTypes.MenuItem[]>("new-menu");

  const menuItems = mapMenuResponseToDomain(response.data);

  wpCache.set('wp-menu-items', menuItems)

  return menuItems
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

async function fetchFromWordpress<TResponse>(relativeURL: string, retryCount: number = 5): Promise<AxiosResponse<TResponse>> {
  if (!process.env.WP_JSON_ENDPOINT_BASE_URL) {
    throw new Error("Wordpress base URL not found in environment variable")
  }

  const url = `${process.env.WP_JSON_ENDPOINT_BASE_URL}${relativeURL.startsWith('/') ? relativeURL : `/${relativeURL}`}`;

  console.log(`Calling ${url}`)

  try {
    const result = await axios.get(url)

    console.log(result)

    return result
  } catch (e) {
    console.error(`Failed to call ${url}`)
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