export type MenuItem = {
  ID: number;
  menu_order: number;
  menu_item_parent: string;
  title: string;
  url: string;
}

export type Post = {
  id: number;
  date_gmt: string;
  link: string;
  type: string;
  slug: string;
  title: RenderedContent;
  content: RenderedContent;
  excerpt: RenderedContent;
  _embedded: {
      author: {
          name: string
      }[];
      "wp:featuredmedia"?: {
          alt_text: string;
          title: RenderedContent;
          media_details: {
              sizes: {
                  medium_large?: {
                      source_url: string;
                  } | null;
                  full : {
                      source_url: string;
                  }
              }
          }
      }[] | null
  }
}

export type Page = {
  id: number;
  link: string;
  content: RenderedContent;
  title: RenderedContent;
  _embedded: {
      "wp:featuredmedia"?: {
          alt_text: string;
          title: RenderedContent;
          media_details: {
              sizes: {
                  medium_large?: {
                      source_url: string;
                  } | null;
                  full : {
                      source_url: string;
                  }
              }
          }
      }[] | null
  }
}

type RenderedContent = {
  rendered: string;
}