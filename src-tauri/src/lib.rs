use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{fs, io::{Read, Write}, path::{Path, PathBuf}};
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use zip::{ZipArchive, ZipWriter, write::FileOptions};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Project {
    id: String,
    name: String,
    description: String,
    created_at: String,
    updated_at: String,
    path: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Board {
    id: String,
    project_id: String,
    name: String,
    created_at: String,
    updated_at: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
struct BoardItem {
    id: String,
    kind: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    text: String,
    color: String,
    #[serde(default)]
    checked: bool,
}
#[derive(Debug, Serialize, Deserialize)]
struct BoardDocument { board: Board, items: Vec<BoardItem> }

fn data_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("projects")).map_err(|e| e.to_string())?;
    Ok(root)
}
fn project_dir(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    if id.contains('/') || id.contains('\\') || id.contains("..") { return Err("ID de projeto inválido".into()); }
    Ok(data_root(app)?.join("projects").join(id))
}
fn read_project(path: &Path) -> Result<Project, String> {
    let raw = fs::read_to_string(path.join("project.json")).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}
fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
    fs::write(path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_projects(app: AppHandle) -> Result<Vec<Project>, String> {
    let root = data_root(&app)?.join("projects");
    let mut result = Vec::new();
    for entry in fs::read_dir(root).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.join("project.json").exists() {
            if let Ok(p) = read_project(&path) { result.push(p); }
        }
    }
    result.sort_by(|a,b| b.updated_at.cmp(&a.updated_at));
    Ok(result)
}

#[tauri::command]
fn create_project(app: AppHandle, name: String, description: String) -> Result<Project, String> {
    let name = name.trim();
    if name.is_empty() || name.len() > 120 { return Err("O nome deve ter entre 1 e 120 caracteres".into()); }
    let id = Uuid::new_v4().to_string();
    let dir = project_dir(&app, &id)?;
    fs::create_dir_all(dir.join("boards")).map_err(|e| e.to_string())?;
    fs::create_dir_all(dir.join("assets/originals")).map_err(|e| e.to_string())?;
    fs::create_dir_all(dir.join("assets/thumbnails")).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let project = Project { id, name: name.into(), description, created_at: now.clone(), updated_at: now, path: dir.to_string_lossy().into_owned() };
    write_json(&dir.join("project.json"), &project)?;
    write_json(&dir.join("project.lbmeta"), &serde_json::json!({"format":"lovert-board","formatVersion":1,"projectId":project.id}))?;
    Ok(project)
}

#[tauri::command]
fn delete_project(app: AppHandle, project_id: String) -> Result<(), String> {
    let dir = project_dir(&app, &project_id)?;
    if dir.exists() { fs::remove_dir_all(dir).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
fn list_boards(app: AppHandle, project_id: String) -> Result<Vec<Board>, String> {
    let dir = project_dir(&app, &project_id)?.join("boards");
    if !dir.exists() { return Ok(vec![]); }
    let mut result = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|x| x.to_str()) == Some("json") {
            if let Ok(raw) = fs::read_to_string(path) {
                if let Ok(board) = serde_json::from_str::<BoardDocument>(&raw) { result.push(board.board); }
            }
        }
    }
    result.sort_by(|a,b| b.updated_at.cmp(&a.updated_at));
    Ok(result)
}

#[tauri::command]
fn create_board(app: AppHandle, project_id: String, name: String) -> Result<Board, String> {
    let name = name.trim();
    if name.is_empty() || name.len() > 120 { return Err("Nome do board inválido".into()); }
    let dir = project_dir(&app, &project_id)?;
    if !dir.exists() { return Err("Projeto não encontrado".into()); }
    let now = Utc::now().to_rfc3339();
    let board = Board { id: Uuid::new_v4().to_string(), project_id, name: name.into(), created_at: now.clone(), updated_at: now };
    write_json(&dir.join("boards").join(format!("{}.json", board.id)), &BoardDocument { board: board.clone(), items: vec![] })?;
    Ok(board)
}

#[tauri::command]
fn delete_board(app: AppHandle, project_id: String, board_id: String) -> Result<(), String> {
    let path = project_dir(&app, &project_id)?.join("boards").join(format!("{}.json", board_id));
    if path.exists() { fs::remove_file(path).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
fn load_board(app: AppHandle, project_id: String, board_id: String) -> Result<BoardDocument, String> {
    let path = project_dir(&app, &project_id)?.join("boards").join(format!("{}.json", board_id));
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_board(app: AppHandle, project_id: String, mut board: Board, items: Vec<BoardItem>) -> Result<(), String> {
    if board.project_id != project_id { return Err("Board não pertence ao projeto".into()); }
    board.updated_at = Utc::now().to_rfc3339();
    let dir = project_dir(&app, &project_id)?;
    write_json(&dir.join("boards").join(format!("{}.json", board.id)), &BoardDocument { board: board.clone(), items })?;
    let project_path = dir.join("project.json");
    if project_path.exists() {
        let mut p = read_project(&dir)?;
        p.updated_at = board.updated_at;
        write_json(&project_path, &p)?;
    }
    Ok(())
}

fn add_dir_to_zip<W: Write + std::io::Seek>(zip: &mut ZipWriter<W>, base: &Path, current: &Path) -> Result<(), String> {
    let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    for entry in fs::read_dir(current).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let rel = path.strip_prefix(base).map_err(|e| e.to_string())?.to_string_lossy().replace('\\', "/");
        if path.is_dir() {
            zip.add_directory(format!("{}/", rel), options).map_err(|e| e.to_string())?;
            add_dir_to_zip(zip, base, &path)?;
        } else {
            zip.start_file(rel, options).map_err(|e| e.to_string())?;
            let bytes = fs::read(path).map_err(|e| e.to_string())?;
            zip.write_all(&bytes).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn export_project(app: AppHandle, project_id: String, destination: String) -> Result<(), String> {
    let dir = project_dir(&app, &project_id)?;
    if !dir.exists() { return Err("Projeto não encontrado".into()); }
    let file = fs::File::create(destination).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    add_dir_to_zip(&mut zip, &dir, &dir)?;
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn import_project(app: AppHandle, source: String) -> Result<Project, String> {
    let file = fs::File::open(source).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let target = project_dir(&app, &id)?;
    fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let enclosed = match entry.enclosed_name() { Some(p) => p.to_owned(), None => continue };
        let out = target.join(enclosed);
        if entry.is_dir() {
            fs::create_dir_all(&out).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
            let mut output = fs::File::create(&out).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            entry.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            output.write_all(&buffer).map_err(|e| e.to_string())?;
        }
    }
    let project_file = target.join("project.json");
    if !project_file.exists() { let _ = fs::remove_dir_all(&target); return Err("O ficheiro não contém um projeto Lovert Board válido".into()); }
    let mut project: Project = serde_json::from_slice(&fs::read(&project_file).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let previous_id = project.id.clone();
    project.id = id.clone();
    project.path = target.to_string_lossy().into_owned();
    project.updated_at = Utc::now().to_rfc3339();

    // Rebind every imported board to the newly generated project ID.
    let boards_dir = target.join("boards");
    if boards_dir.exists() {
        for entry in fs::read_dir(&boards_dir).map_err(|e| e.to_string())? {
            let board_path = entry.map_err(|e| e.to_string())?.path();
            if board_path.extension().and_then(|x| x.to_str()) != Some("json") { continue; }
            let raw = fs::read(&board_path).map_err(|e| e.to_string())?;
            let mut document: BoardDocument = serde_json::from_slice(&raw).map_err(|e| e.to_string())?;
            if document.board.project_id == previous_id {
                document.board.project_id = id.clone();
                write_json(&board_path, &document)?;
            }
        }
    }
    write_json(&project_file, &project)?;
    write_json(&target.join("project.lbmeta"), &serde_json::json!({"format":"lovert-board","formatVersion":1,"projectId":project.id}))?;
    Ok(project)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_projects, create_project, delete_project, list_boards,
            create_board, delete_board, load_board, save_board, export_project, import_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lovert Board");
}
