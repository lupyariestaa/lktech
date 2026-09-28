export type ProjectMetric = {
  label: string;
  value: string;
};

export type ProjectTestimonial = {
  quote: string;
  author: string;
  role: string;
};

export type Project = {
  slug: string;
  title: string;
  client: string;
  category: string;
  serviceSlug: string;
  year: number;
  summary: string;
  cover: string;
  accent: string;
  tags: string[];
  challenge: string;
  solution: string;
  results: string[];
  metrics: ProjectMetric[];
  techStack: string[];
  testimonial?: ProjectTestimonial;
};

/** Proyek tersimpan di Firestore (dengan id dokumen). */
export type StoredProject = Project & { id: string };
