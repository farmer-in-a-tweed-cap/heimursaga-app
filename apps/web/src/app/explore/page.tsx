import { Map } from '@/components';

type PageProps = {
  params: {
    username: string;
  };
};

export default function Page({ params }: PageProps) {
  const { username } = params;

  return (
    <div className="w-full flex flex-col justify-start items-center">
      <div className="w-full h-screen">
        <Map className="h-screen" />
      </div>
    </div>
  );
}
