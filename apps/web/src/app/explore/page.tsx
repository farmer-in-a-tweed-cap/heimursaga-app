import { ExploreMap } from '@/components';

export default async function Page() {
  return (
    <div className="w-full flex flex-col justify-start items-center">
      <div className="w-full h-screen">
        <ExploreMap />
      </div>
    </div>
  );
}
