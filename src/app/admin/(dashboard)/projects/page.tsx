import { ProjectsManager } from "@/components/admin/projects-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Portofolio",
};

export default function AdminProjectsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Portofolio</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola proyek yang tampil di halaman portofolio &amp; beranda.
        </p>
      </div>
      <ProjectsManager />
    </div>
  );
}
