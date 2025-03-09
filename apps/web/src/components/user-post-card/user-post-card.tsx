import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from '@repo/ui/components';
import { HeartIcon, MessageCircleIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const UserPostCard = () => (
  <div className="w-full min-h-[140px] bg-white box-border p-6 rounded-xl flex flex-col">
    <div className="flex flex-row justify-between items-center">
      <div className="flex flex-row justify-start items-center gap-3">
        <Link href="#">
          <Avatar className="w-[40px] h-[40px]">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>mj</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col items-start justify-center">
          <Link href="#">
            <span className="text-sm font-semibold">mick johnson</span>
          </Link>
          <span className="text-xs text-gray-500">Feb 01</span>
        </div>
      </div>
    </div>
    <div className="mt-6 w-full aspect-5/2 overflow-hidden rounded-xl">
      <Image
        src="https://images.alltrails.com/eyJidWNrZXQiOiJhc3NldHMuYWxsdHJhaWxzLmNvbSIsImtleSI6InVwbG9hZHMvcGhvdG8vaW1hZ2UvOTM1MDAwMTEvMjQzMDZhODk1Mzg3YjUyYTcxZTdiYTUyOWQyMDEyN2QuanBnIiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJqcGVnIiwicmVzaXplIjp7IndpZHRoIjoyMDQ4LCJoZWlnaHQiOjIwNDgsImZpdCI6Imluc2lkZSJ9LCJyb3RhdGUiOm51bGwsImpwZWciOnsidHJlbGxpc1F1YW50aXNhdGlvbiI6dHJ1ZSwib3ZlcnNob290RGVyaW5naW5nIjp0cnVlLCJvcHRpbWlzZVNjYW5zIjp0cnVlLCJxdWFudGlzYXRpb25UYWJsZSI6M319fQ=="
        width={400}
        height={300}
        className="w-full h-auto"
        alt=""
      />
    </div>
    <div className="mt-4">
      <p className="text-base font-normal text-neutral-700">
        We got to the MacRitchie Reservoir by taking the train to Caldecott and
        walking to the reservoir so we could start a hike there. We completed
        the nature track here all the way to the tree top walk, the jelutong
        tower and walkin..
      </p>
    </div>
    <div className="mt-6 flex flex-row gap-2">
      <Button variant="ghost" size="sm">
        <HeartIcon size={20} />
        <span>Like</span>
      </Button>
      <Button variant="ghost" size="sm">
        <MessageCircleIcon size={20} />
        <span>Comment</span>
      </Button>
    </div>
  </div>
);
