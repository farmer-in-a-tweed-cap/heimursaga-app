import Image from 'next/image';

type Props = {
  size?: 'xlg' | 'lg' | 'md' | 'sm';
  color?: 'dark' | 'light';
};

export const Logo: React.FC<Props> = ({ color = 'dark', size = 'sm' }) => {
  switch (color) {
    case 'dark':
      switch (size) {
        case 'lg':
          return <LogoLgDark />;
        case 'md':
          return <LogoMdDark />;
        case 'sm':
          return <LogoSmDark />;
      }
      break;
    case 'light':
      switch (size) {
        case 'lg':
          return <LogoLgLight />;
        case 'xlg':
          return <LogoXLgLight />;
        case 'md':
          return <LogoMdLight />;
        case 'sm':
          return <LogoSmLight />;
      }
      break;
  }
};

const LogoLgLight = () => (
  <div className="w-[140px] h-[50px] flex flex-row items-center justify-center">
    <Image
      src="/logo-lg-light.svg"
      width={140}
      height={80}
      alt="logo"
      priority={false}
    />
  </div>
);

const LogoXLgLight = () => (
  <div className="w-full h-full flex items-center justify-center">
    <Image
      src="/logo-lg-light.svg"
      width={576}
      height={448}
      alt="logo"
      className="w-full h-full object-contain"
      priority={true}
    />
  </div>
);

const LogoLgDark = () => (
  <div className="w-[140px] h-[50px] flex flex-row items-center justify-center">
    <Image
      src="/logo-lg-dark.svg"
      width={140}
      height={80}
      alt="logo"
      priority={false}
    />
  </div>
);

const LogoMdLight = () => (
  <div className="w-[60px] h-[60px]">
    <Image
      src="/logo-sm-light.svg"
      width={80}
      height={80}
      alt=""
      priority={false}
    />
  </div>
);

const LogoMdDark = () => (
  <div className="w-[60px] h-[60px]">
    <Image
      src="/logo-sm-dark.svg"
      width={80}
      height={80}
      alt=""
      priority={false}
    />
  </div>
);

const LogoSmLight = () => (
  <div className="w-[45px] h-[45px]">
    <Image
      src="/logo-sm-light.svg"
      width={80}
      height={80}
      alt=""
      priority={false}
    />
  </div>
);

const LogoSmDark = () => (
  <div className="w-[45px] h-[45px]">
    <Image
      src="/logo-sm-dark.svg"
      width={80}
      height={80}
      alt=""
      priority={false}
    />
  </div>
);
