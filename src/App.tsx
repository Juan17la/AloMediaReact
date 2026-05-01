import { Suspense } from "react";
import { RouterProvider } from "react-router";
import router from "./router";

export default function App() {
  return (
    <Suspense fallback={<div className="h-screen bg-dark" />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
