export type Post = {
  id: number;
  slug: string;
  title: string;
  content: string;
  type: string;
  author: string;
  date: string;
  excerpt: string | null;
  featuredImage?: {
      url: stirng;
      altText: string;
  } | null;
}

export type Page = {
  id: number;
  slug: string;
  content: string;
  title: string;
};

export type MenuItem = {
  id: number;
  menuOrder: number;
  label: string;
  parentId?: number | undefined;
  childItems: MenuItem[];
  url: string;
}