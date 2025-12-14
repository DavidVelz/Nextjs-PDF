export type ElementNode = {
  name: string;
  lw?: number | null;
  lp?: number | null;
  material?: string;
  children?: ElementNode[];
};
