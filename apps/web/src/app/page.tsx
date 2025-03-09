import { Button } from "@repo/ui/components/button";

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || "http://localhost:5000";

export default function App() {
  return (
    <main className="flex flex-col justify-center items-center gap-4 w-full max-w-l">
      <div className="">heimursaga</div>
      <Button>button</Button>
    </main>
  );
}
