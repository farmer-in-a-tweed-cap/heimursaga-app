import { array } from '@/lib/utils';

const data = {
  posts: array(100).map(() => ({
    title: 'entry',
    content: 'It is a long established fact that a reader will be distracted..',
    author: 'john',
  })),
};

export const ExploreSidebar = () => {
  return (
    <div className="bg-white w-full h-full rounded-2xl box-border p-6 flex flex-col">
      <div className="flex flex-col">
        <span className="text-xl font-medium">Explore</span>
        <span className="pt-3 text-sm font-normal text-gray-800">
          {data.posts.length} entries found
        </span>
      </div>
      <div className="mt-8 flex flex-col gap-2 overflow-y-scroll no-scrollbar">
        {data.posts.map(({ title, content, author }, key) => (
          <div key={key} className="bg-gray-50 p-4 box-border">
            <span className="text-base font-medium">
              {title} #{key + 1}
            </span>
            <p className="pt-3 font-normal text-gray-800">{content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
