import Image from 'next/image';

import { APP_CONFIG } from '@/config';

type Props = {
  theme?: 'dark' | 'light';
  size?: 'lg' | 'sm';
};

export const Logo: React.FC<Props> = ({ theme = 'light', size = 'sm' }) => {
  if (theme === 'light') {
    switch (size) {
      case 'lg':
        return <LogoDark />;
      case 'sm':
        return <LogoDark />;
      default:
        return <LogoDark />;
    }
  } else {
    switch (size) {
      case 'lg':
        return <LogoSmall />;
      case 'sm':
        return <LogoSmall />;
      default:
        return <LogoSmall />;
    }
  }
};

const LogoDark = () => (
  <div className="text-black text-xl font-medium">{APP_CONFIG.APP.NAME}</div>
);

const LogoSmall = () => (
  <div className="w-[45px] h-auto">
    <Image src="/logo-sm-light.svg" width={80} height={80} alt="" />
  </div>
);
