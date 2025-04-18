import { Button } from '@repo/ui/components';
import Link from 'next/link';

export const MapPreviewOverlay = ({
  href,
  onClick = () => {},
}: {
  href?: string;
  onClick?: () => void;
}) => (
  <div className="absolute z-20 transition-all inset-0 w-full h-full flex flex-row justify-center items-center opacity-0 cursor-pointer hover:opacity-100">
    {href ? (
      <Link href={href}>
        <div className="absolute z-10 inset-0 bg-gray-200 opacity-50"></div>
      </Link>
    ) : (
      <div className="absolute z-10 inset-0 bg-gray-200 opacity-50"></div>
    )}
    {href ? (
      <Button variant="outline" className="z-20 bg-white">
        <Link href={href}>Open map </Link>
      </Button>
    ) : (
      <Button variant="outline" className="z-20" onClick={onClick}>
        Open map
      </Button>
    )}
  </div>
);
