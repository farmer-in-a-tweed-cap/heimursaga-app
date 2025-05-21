import Image from 'next/image';

type Props = {
  size?: 'lg' | 'sm';
  color?: 'dark' | 'light';
};

export const Logo: React.FC<Props> = ({ color = 'dark', size = 'sm' }) => {
  switch (color) {
    case 'dark':
      switch (size) {
        case 'lg':
          return <LogoLgDark />;
        case 'sm':
          return <LogoSmDark />;
      }
      break;
    case 'light':
      switch (size) {
        case 'lg':
          return <LogoLgLight />;
        case 'sm':
          return <LogoSmLight />;
      }
      break;
  }
};

const LogoLgLight = () => (
  <div className="w-[140px] h-[50px] flex flex-row items-center justify-center">
    <Image src="/logo-lg-light.svg" width={140} height={80} alt="logo" />
  </div>
);

const LogoLgDark = () => (
  <div className="w-[140px] h-[50px] flex flex-row items-center justify-center">
    <Image src="/logo-lg-dark.svg" width={140} height={80} alt="logo" />
  </div>
);

const LogoSmLight = () => (
  <div className="w-[45px] h-[45px]">
    <Image src="/logo-sm-light.svg" width={80} height={80} alt="" />
  </div>
);

const LogoSmDark = () => (
  <div className="w-[45px] h-[45px]">
    <Image src="/logo-sm-dark.svg" width={80} height={80} alt="" />
  </div>
);
