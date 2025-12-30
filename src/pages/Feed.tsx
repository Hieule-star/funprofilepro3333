import Sidebar from "@/components/Sidebar";
import HonorBoard from "@/components/HonorBoard";

export default function Feed() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <Sidebar />
          </aside>
          
          <main className="lg:col-span-6">
            {/* TODO: CreatePost component */}
            {/* TODO: Posts list */}
            <div className="text-center text-muted-foreground py-12">
              Trang Feed - Đang xây dựng lại...
            </div>
          </main>
          
          <aside className="hidden lg:col-span-3 lg:block">
            <HonorBoard />
          </aside>
        </div>
      </div>
    </div>
  );
}
