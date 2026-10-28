import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <main
      className="space-y-6"
      aria-busy="true"
      aria-label="Carregando página"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </main>
  );
}
