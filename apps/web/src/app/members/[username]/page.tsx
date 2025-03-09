import { UserPostCard, UserProfileCard } from '@/components';

type PageProps = {
  params: {
    username: string;
  };
};

export default function Page({ params }: PageProps) {
  const { username } = params;

  return (
    <div className="w-full flex flex-col justify-start items-center">
      <div className="app-container w-full max-w-5xl flex flex-row justify-between gap-6">
        <div className="w-full max-w-[320px]">
          <div className="sticky top-6">
            <UserProfileCard
              username={username}
              firstName="mark"
              lastName="johnson"
            />
          </div>
        </div>
        <div className="basis-full flex flex-col h-auto">
          <div className="w-full flex flex-col gap-2">
            {Array(10)
              .fill(0)
              .map((post, key) => (
                <UserPostCard key={key} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
