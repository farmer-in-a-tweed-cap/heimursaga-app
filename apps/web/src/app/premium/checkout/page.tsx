import { CheckoutLayout } from '@/app/layout';

export default function Page() {
  return (
    <CheckoutLayout>
      <div className="w-full h-auto flex flex-col lg:flex-row gap-4 py-10">
        <div className="basis-7/12">
          <div className="flex flex-col gap-2">
            <span className="text-xl"></span>
            <p className="text-sm"></p>
          </div>
        </div>
        <div className="basis-5/12"></div>
      </div>
    </CheckoutLayout>
  );
}
