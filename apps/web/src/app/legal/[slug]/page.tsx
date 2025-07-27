import fs from 'fs';
import matter from 'gray-matter';
import { marked } from 'marked';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import path from 'path';
import DOMPurify from 'isomorphic-dompurify';

import { AppLayout } from '@/app/layout';

import { PageHeaderTitle } from '@/components';

const PATH = path.join(process.cwd(), 'src/content/legal');

// generate static params
export async function generateStaticParams() {
  const files = fs.readdirSync(PATH);
  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      slug: file.replace(/\.md$/, ''),
    }));
}

// generate metadata
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;
  const filePath = path.join(PATH, `${slug}.md`);

  // check if file exist
  if (!fs.existsSync(filePath)) {
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
  const filePath = path.join(PATH, `${slug}.md`);

  // check if file exist
  if (!fs.existsSync(filePath)) {
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
