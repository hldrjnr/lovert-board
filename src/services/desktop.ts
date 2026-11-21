import { invoke } from "@tauri-apps/api/core";
import type { Board, BoardDocument, Project } from "../types/domain";

export const desktop = {
  listProjects: () => invoke<Project[]>("list_projects"),
  createProject: (name: string, description: string) =>
    invoke<Project>("create_project", { name, description }),
  deleteProject: (projectId: string) =>
    invoke<void>("delete_project", { projectId }),
  listBoards: (projectId: string) =>
    invoke<Board[]>("list_boards", { projectId }),
  createBoard: (projectId: string, name: string) =>
    invoke<Board>("create_board", { projectId, name }),
  deleteBoard: (projectId: string, boardId: string) =>
    invoke<void>("delete_board", { projectId, boardId }),
  loadBoard: (projectId: string, boardId: string) =>
    invoke<BoardDocument>("load_board", { projectId, boardId }),
  saveBoard: (projectId: string, board: Board, items: BoardDocument["items"]) =>
    invoke<void>("save_board", { projectId, board, items }),
  exportProject: (projectId: string, destination: string) =>
    invoke<void>("export_project", { projectId, destination }),
  importProject: (source: string) =>
    invoke<Project>("import_project", { source }),
};
