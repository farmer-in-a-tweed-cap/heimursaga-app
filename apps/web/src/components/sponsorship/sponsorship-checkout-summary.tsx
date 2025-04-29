import { UserBar } from '../user';

type Props = {
  user?: {
    name: string;
    picture: string;
    bio?: string;
  };
};

export const SponsorCheckoutSummary: React.FC<Props> = ({ user }) => {
  return (
    <div className="flex flex-col">
      <div>
        <span className="font-medium text-base">Creator</span>
      </div>
      <div className="mt-6 flex flex-row gap-2">
        <UserBar name={user?.name} picture={user?.picture} text={user?.bio} />
      </div>
    </div>
  );
};
