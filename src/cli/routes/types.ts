// src/cli/routes/types.ts
export type Route = {
  id: string;
  name: string;
  action: () => Promise<void>;
};

export type Router = {
  title: string;
  items: Route[];
};
