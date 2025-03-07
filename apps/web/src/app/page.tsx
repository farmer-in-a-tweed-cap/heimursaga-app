import { useState } from "react";
import { Button } from "@repo/ui/button";

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || "http://localhost:5000";

export default function App() {
  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col justify-center items-center">
      <main className="flex flex-col justify-center items-center gap-2 w-full max-w-lg">
        <div className="">heimursaga</div>
        <Button>ok</Button>
      </main>
    </div>
  );
}
