import Link from "next/link";

import { Button, Logo } from "@repo/ui/components";
import { ROUTER } from "@/router";

export const AppHeader = () => {
  return (
    <div className="w-full h-[64px] bg-white flex flex-row justify-center items-center">
      <div className="app-container flex flex-row items-center justify-between">
        <Link href={ROUTER.HOME}>
          <Logo />
        </Link>
        <Link href={ROUTER.LOGIN}>
          <Button>Log in</Button>
        </Link>
      </div>
    </div>
  );
};
