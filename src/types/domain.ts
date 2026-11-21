export type Project = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  path: string;
};

export type Board = {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type BoardItem = {
  id: string;
  kind: "note" | "text" | "task";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  checked?: boolean;
};

export type BoardDocument = {
  board: Board;
  items: BoardItem[];
};
