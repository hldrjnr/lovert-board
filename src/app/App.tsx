import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Archive, ArrowLeft, Check, ChevronDown, CircleHelp, Clock3, Download,
  FilePlus2, Folder, FolderPlus, Grid2X2, Import, LayoutGrid, MoreHorizontal,
  Plus, Search, Settings2, StickyNote, Trash2, X, ZoomIn, ZoomOut
} from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { desktop } from "../services/desktop";
import type { Board, BoardDocument, BoardItem, Project } from "../types/domain";

const palette = ["#fff2c9", "#f6dce4", "#dce9fa", "#dcefe2", "#e9e2fa", "#f4e5d4"];

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"project" | "board" | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<number | undefined>(undefined);

  const refreshProjects = useCallback(async () => {
    try { setProjects(await desktop.listProjects()); }
    catch (e) { setError(String(e)); }
  }, []);

  useEffect(() => { refreshProjects(); }, [refreshProjects]);

  const refreshBoards = useCallback(async (project: Project) => {
    const result = await desktop.listBoards(project.id);
    setBoards(result);
    setActiveBoard(null);
    setItems([]);
  }, []);

  async function chooseProject(project: Project) {
    setActiveProject(project);
    await refreshBoards(project);
  }

  async function chooseBoard(board: Board) {
    if (!activeProject) return;
    const doc = await desktop.loadBoard(activeProject.id, board.id);
    setActiveBoard(doc.board);
    setItems(doc.items);
    setZoom(1);
  }

  async function createNamed() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (modal === "project") {
        const p = await desktop.createProject(name.trim(), "");
        await refreshProjects();
        setActiveProject(p);
        await refreshBoards(p);
      } else if (modal === "board" && activeProject) {
        const b = await desktop.createBoard(activeProject.id, name.trim());
        setBoards((prev) => [b, ...prev]);
        await chooseBoard(b);
      }
      setName("");
      setModal(null);
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  const persist = useCallback((nextItems: BoardItem[]) => {
    if (!activeProject || !activeBoard) return;
    setSaved(false);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await desktop.saveBoard(activeProject.id, activeBoard, nextItems);
        setSaved(true);
      } catch (e) { setError(String(e)); }
    }, 450);
  }, [activeProject, activeBoard]);

  function updateItems(next: BoardItem[]) {
    setItems(next);
    persist(next);
  }

  function addItem(kind: BoardItem["kind"]) {
    if (!activeBoard) return;
    const item: BoardItem = {
      id: crypto.randomUUID(), kind, x: 100 + items.length * 24, y: 100 + items.length * 20,
      width: kind === "text" ? 260 : 220, height: kind === "text" ? 100 : 170,
      text: kind === "task" ? "Nova tarefa" : kind === "text" ? "Escreve uma ideia..." : "Nova nota",
      color: palette[items.length % palette.length], checked: false
    };
    updateItems([...items, item]);
  }

  async function exportCurrent() {
    if (!activeProject) return;
    const destination = await save({ title: "Exportar projeto", defaultPath: `${activeProject.name}.lbboard`, filters: [{ name: "Lovert Board", extensions: ["lbboard"] }] });
    if (destination) {
      try { await desktop.exportProject(activeProject.id, destination); }
      catch (e) { setError(String(e)); }
    }
  }

  async function importProject() {
    const source = await open({ multiple: false, filters: [{ name: "Lovert Board", extensions: ["lbboard", "zip"] }] });
    if (typeof source === "string") {
      try {
        const imported = await desktop.importProject(source);
        await refreshProjects();
        setActiveProject(imported);
        await refreshBoards(imported);
      } catch (e) { setError(String(e)); }
    }
  }

  async function removeProject(project: Project) {
    if (!confirm(`Eliminar "${project.name}" e todos os seus boards? Esta ação não pode ser desfeita.`)) return;
    try {
      await desktop.deleteProject(project.id);
      if (activeProject?.id === project.id) {
        setActiveProject(null); setActiveBoard(null); setBoards([]); setItems([]);
      }
      await refreshProjects();
    } catch (e) { setError(String(e)); }
  }

  async function removeBoard(board: Board) {
    if (!activeProject || !confirm(`Eliminar o board "${board.name}"?`)) return;
    try {
      await desktop.deleteBoard(activeProject.id, board.id);
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
      if (activeBoard?.id === board.id) { setActiveBoard(null); setItems([]); }
    } catch (e) { setError(String(e)); }
  }

  const visibleProjects = useMemo(() => projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())), [projects, query]);

  if (activeBoard && activeProject) {
    return <BoardEditor
      project={activeProject} board={activeBoard} items={items} zoom={zoom} setZoom={setZoom}
      saved={saved} onBack={() => setActiveBoard(null)} onAdd={addItem}
      onChange={updateItems} onExport={exportCurrent}
    />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">L</div><div className="brand-copy"><strong>lovert<span>board</span></strong><small>Creative workspace</small></div></div>
        <div className="workspace-switch"><div className="workspace-avatar">L</div><span><strong>Personal workspace</strong><small>Local · Offline-first</small></span><ChevronDown size={15}/></div>
        <div className="sidebar-section"><div className="section-label">WORKSPACE</div>
          <div className="nav-item active"><Grid2X2/><span>Todos os projetos</span></div>
          <div className="nav-item"><Clock3/><span>Recentes</span></div>
          <div className="nav-item"><Archive/><span>Arquivo</span></div>
        </div>
        <div className="sidebar-section"><div className="section-label">ATALHOS</div>
          <button className="nav-item" onClick={() => setModal("project")}><FolderPlus/><span>Nova pasta / projeto</span></button>
          <button className="nav-item" onClick={importProject}><Import/><span>Importar projeto</span></button>
        </div>
        <div className="sidebar-bottom"><div className="offline-status"><span className="status-dot"/> Armazenamento local</div><div className="nav-item"><Settings2/><span>Definições</span></div><div className="nav-item"><CircleHelp/><span>Ajuda</span></div><div className="profile"><div className="profile-avatar">LB</div><div><strong>Lovert Studio</strong><small>Local workspace</small></div></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Todos os projetos</strong></div><div className="top-actions"><div className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar projetos..."/></div><span className="local-pill"><i/> Offline</span></div></header>
        <div className="content-scroll">
          <section className="welcome-row"><div><div className="eyebrow">✳ O TEU ESPAÇO CRIATIVO</div><h1>As ideias ganham<br/><span>forma aqui.</span></h1><p>Um espaço visual para pensar, planear e criar — sem depender da Internet.</p></div><div className="welcome-art"><div className="art-back"/><div className="art-front"><small>IDEAS / 001</small><strong>Think<br/>visually.</strong><i>✳</i></div></div></section>
          {error && <div className="error-banner">{error}<button onClick={() => setError("")}><X size={14}/></button></div>}
          <section className="projects-section">
            <div className="section-title-row"><div><h2>Os teus projetos</h2><span className="muted-count">{visibleProjects.length} projetos locais</span></div><div className="section-actions"><button className="subtle-button" onClick={importProject}><Import size={15}/> Importar</button><button className="primary-button" onClick={() => setModal("project")}><Plus size={16}/> Novo projeto</button></div></div>
            {visibleProjects.length ? <div className="project-grid">{visibleProjects.map(p => <div className="project-card" key={p.id}><button className="project-open" onClick={() => chooseProject(p)}><div className={`project-cover cover-${Math.abs(p.name.length)%4}`}><span>{p.name.slice(0,2).toUpperCase()}</span><div className="cover-orbit"/></div><div className="project-meta"><strong>{p.name}</strong><small>{p.description || "Workspace criativo"}</small></div><div className="project-foot"><span>Atualizado {new Date(p.updated_at).toLocaleDateString()}</span><span>Abrir →</span></div></button><button className="delete-project" title="Eliminar projeto" onClick={() => removeProject(p)}><Trash2 size={14}/></button></div>)}</div> : <div className="empty-state"><Folder size={28}/><strong>Ainda não tens projetos</strong><span>Cria um projeto para começar a organizar as tuas ideias.</span><button className="primary-button" onClick={() => setModal("project")}><Plus size={15}/> Criar primeiro projeto</button></div>}
          </section>
          {activeProject && <section className="boards-section"><div className="section-title-row"><div><h2>{activeProject.name}</h2><span className="muted-count">Boards deste projeto</span></div><button className="primary-button" onClick={() => setModal("board")}><Plus size={16}/> Novo board</button></div><div className="board-list">{boards.map(b => <div className="board-row" key={b.id}><button onClick={() => chooseBoard(b)}><LayoutGrid size={18}/><span>{b.name}</span><small>{new Date(b.updated_at).toLocaleDateString()}</small></button><button className="delete-project" onClick={() => removeBoard(b)}><Trash2 size={14}/></button></div>)}{!boards.length && <p className="hint">Este projeto ainda não tem boards. Cria o primeiro para abrir o canvas.</p>}</div></section>}
          <footer className="footer-note"><span>LOVERT BOARD</span><span>Offline-first · Local data · v0.2.0</span></footer>
        </div>
      </main>
      {modal && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><div className="modal"><div className="modal-heading"><div><span className="eyebrow">{modal === "project" ? "NOVO PROJETO" : "NOVO BOARD"}</span><h2>{modal === "project" ? "Criar projeto" : "Criar board"}</h2></div><button className="icon-button" onClick={() => setModal(null)}><X size={18}/></button></div><p>{modal === "project" ? "Cada projeto é guardado localmente no teu computador." : "Um board é um canvas para organizar ideias e referências."}</p><input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && createNamed()} placeholder={modal === "project" ? "Nome do projeto..." : "Nome do board..."}/><div className="modal-actions"><button className="subtle-button" onClick={() => setModal(null)}>Cancelar</button><button className="primary-button" disabled={!name.trim() || busy} onClick={createNamed}>{busy ? "A criar..." : "Criar"} <Plus size={15}/></button></div></div></div>}
    </div>
  );
}

function BoardEditor({ project, board, items, zoom, setZoom, saved, onBack, onAdd, onChange, onExport }: {
  project: Project; board: Board; items: BoardItem[]; zoom: number; setZoom: (n:number)=>void; saved: boolean;
  onBack: ()=>void; onAdd: (kind:BoardItem["kind"])=>void; onChange:(items:BoardItem[])=>void; onExport:()=>void;
}) {
  const [drag, setDrag] = useState<{id:string; dx:number; dy:number}|null>(null);
  const [editing, setEditing] = useState<string|null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  function pointerDown(e: ReactPointerEvent, item: BoardItem) {
    if ((e.target as HTMLElement).closest("textarea,input,button")) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrag({id:item.id, dx:(e.clientX-rect.left)/zoom-item.x, dy:(e.clientY-rect.top)/zoom-item.y});
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function pointerMove(e: ReactPointerEvent) {
    if (!drag) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x=(e.clientX-rect.left)/zoom-drag.dx, y=(e.clientY-rect.top)/zoom-drag.dy;
    onChange(items.map(i => i.id===drag.id ? {...i,x:Math.max(0,x),y:Math.max(0,y)} : i));
  }
  const updateText=(id:string,text:string)=>onChange(items.map(i=>i.id===id?{...i,text}:i));
  const toggleTask=(id:string)=>onChange(items.map(i=>i.id===id?{...i,checked:!i.checked}:i));
  const remove=(id:string)=>onChange(items.filter(i=>i.id!==id));

  return <div className="board-editor">
    <header className="editor-topbar"><button className="back-button" onClick={onBack}><ArrowLeft size={17}/><span>{project.name}</span></button><span className="crumb-divider">/</span><strong>{board.name}</strong><span className="save-state">{saved ? <><Check size={13}/> Guardado</> : "A guardar..."}</span><div className="editor-actions"><button className="subtle-button" onClick={onExport}><Download size={15}/> Exportar</button></div></header>
    <div className="editor-toolbar"><div className="tool-group"><button onClick={()=>onAdd("note")}><StickyNote size={16}/> Nota</button><button onClick={()=>onAdd("text")}><Plus size={16}/> Texto</button><button onClick={()=>onAdd("task")}><Check size={16}/> Tarefa</button></div><div className="zoom-tools"><button onClick={()=>setZoom(Math.max(.4,zoom-.1))}><ZoomOut size={16}/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(Math.min(1.8,zoom+.1))}><ZoomIn size={16}/></button><button onClick={()=>setZoom(1)}>Repor</button></div></div>
    <div className="canvas-viewport"><div ref={boardRef} className="canvas-world" style={{transform:`scale(${zoom})`}} onPointerMove={pointerMove} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)}>
      <div className="canvas-hint">BOARD / {board.name.toUpperCase()}</div>
      {items.map(item=><div key={item.id} className={`canvas-item item-${item.kind}`} style={{left:item.x,top:item.y,width:item.width,minHeight:item.height,background:item.color}} onPointerDown={e=>pointerDown(e,item)}>
        <div className="item-top"><span>{item.kind==="note"?"NOTA":item.kind==="task"?"TAREFA":"TEXTO"}</span><button onClick={()=>remove(item.id)} title="Eliminar"><X size={13}/></button></div>
        {item.kind==="task" && <label className="task-line"><input type="checkbox" checked={!!item.checked} onChange={()=>toggleTask(item.id)}/><textarea value={item.text} onChange={e=>updateText(item.id,e.target.value)} rows={2}/></label>}
        {item.kind!=="task" && <textarea aria-label="Conteúdo do cartão" value={item.text} onChange={e=>updateText(item.id,e.target.value)} rows={item.kind==="text"?4:6} />}
        <div className="item-grip">•••</div>
      </div>)}
      {!items.length && <div className="canvas-empty"><div><StickyNote size={25}/><strong>O teu board começa aqui</strong><span>Adiciona uma nota, texto ou tarefa na barra superior.</span></div></div>}
    </div></div>
  </div>;
}
