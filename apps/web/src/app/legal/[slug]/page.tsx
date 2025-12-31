import fs from 'fs';
import matter from 'gray-matter';
import { marked } from 'marked';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import path from 'path';
import DOMPurify from 'isomorphic-dompurify';

import { AppLayout } from '@/layouts';

import { PageHeaderTitle } from '@/components';

// Define the content directory path
// In production, this resolves from the build output
const getContentPath = () => {
  // Try multiple potential paths for different deployment scenarios
  const possiblePaths = [
    path.join(process.cwd(), 'src/content/legal'),
    path.join(process.cwd(), 'apps/web/src/content/legal'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`[Legal Pages] Using content path: ${p}`);
      return p;
    }
  }

  // Default to the standard path
  console.warn(`[Legal Pages] No existing path found, defaulting to: ${path.join(process.cwd(), 'src/content/legal')}`);
  return path.join(process.cwd(), 'src/content/legal');
};

// Force static generation
export const dynamic = 'force-static';
export const dynamicParams = false;

// generate static params
export async function generateStaticParams() {
  const PATH = getContentPath();

  try {
    if (!fs.existsSync(PATH)) {
      console.error(`[Legal Pages] Content directory not found at: ${PATH}`);
      // Return hardcoded slugs as fallback
      return [
        { slug: 'privacy' },
        { slug: 'terms' },
      ];
    }

    const files = fs.readdirSync(PATH);
    const params = files
      .filter((file) => file.endsWith('.md'))
      .map((file) => ({
        slug: file.replace(/\.md$/, ''),
      }));

    console.log(`[Legal Pages] Generated params:`, params);
    return params;
  } catch (error) {
    console.error(`[Legal Pages] Error in generateStaticParams:`, error);
    // Return hardcoded slugs as fallback
    return [
      { slug: 'privacy' },
      { slug: 'terms' },
    ];
  }
}

// generate metadata
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;
  const PATH = getContentPath();
  const filePath = path.join(PATH, `${slug}.md`);

  // check if file exist
  if (!fs.existsSync(filePath)) {
    console.error(`[Legal Pages] File not found for metadata: ${filePath}`);
    notFound();
  }

  // read and parse markdown
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(fileContents);
  const { title = '', description = '', date = new Date() } = data || {};

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/legal/${slug}`,
      type: 'article',
      publishedTime: date ? new Date(date).toISOString() : undefined,
    },
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const PATH = getContentPath();
  const filePath = path.join(PATH, `${slug}.md`);

  // check if file exist
  if (!fs.existsSync(filePath)) {
    console.error(`[Legal Pages] File not found for page render: ${filePath}`);
    console.error(`[Legal Pages] Checked path: ${PATH}`);
    console.error(`[Legal Pages] Slug: ${slug}`);
    notFound();
  }

  // read and parse markdown
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  const { title = '', date = new Date() } = data || {};

  // convert markdown to html
  const htmlContent = await marked(content);

  // sanitize HTML to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(htmlContent);

  return (
    <AppLayout secure={false}>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>{title}</PageHeaderTitle>
        <div
          className="richtext"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>
    </AppLayout>
  );
}
