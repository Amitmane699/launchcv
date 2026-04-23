import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Plus, Trash, Calendar } from "@phosphor-icons/react";
import { toast } from "sonner";
import { DndContext, useDraggable, useDroppable, DragOverlay } from "@dnd-kit/core";

const COLUMNS = [
    { id: "wishlist", label: "Saved", color: "#4A4D57" },
    { id: "applied", label: "Applied", color: "#0D0D12" },
    { id: "interview", label: "Interview Scheduled", color: "#FFB300" },
    { id: "offer", label: "Offer Received", color: "#00A859" },
    { id: "rejected", label: "Rejected", color: "#EF4444" },
];

export default function Tracker() {
    const [apps, setApps] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [dragId, setDragId] = useState(null);

    useEffect(() => { load(); }, []);
    async function load() { const r = await api.get("/applications"); setApps(r.data || []); }

    async function addApp(form) {
        try {
            await api.post("/applications", form);
            toast.success("Added to tracker");
            setShowAdd(false); load();
        } catch { toast.error("Could not add"); }
    }

    async function updateStatus(id, status) {
        await api.put(`/applications/${id}`, { status });
        load();
    }
    async function del(id) {
        if (!window.confirm("Delete this tracker card?")) return;
        await api.delete(`/applications/${id}`);
        load();
    }

    function onDragEnd(e) {
        setDragId(null);
        if (e.over && e.active) {
            const overId = e.over.id;
            const activeId = e.active.id;
            const card = apps.find((a) => a.id === activeId);
            if (card && card.status !== overId) {
                updateStatus(activeId, overId);
            }
        }
    }

    const activeCard = apps.find((a) => a.id === dragId);

    return (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-10">
            <div className="flex justify-between items-end mb-8 flex-wrap gap-3">
                <div>
                    <span className="rp-overline">Tracker</span>
                    <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">Kanban application tracker</h1>
                    <p className="text-[#4A4D57] mt-1">Drag cards between columns as your applications progress.</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="rp-btn-orange" data-testid="tracker-add-btn">
                    <Plus size={14} weight="bold" /> Track a Role
                </button>
            </div>

            <DndContext onDragStart={(e) => setDragId(e.active.id)} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="kanban-board">
                    {COLUMNS.map((col) => {
                        const items = apps.filter((a) => a.status === col.id);
                        return <Column key={col.id} col={col} apps={items} onDelete={del} />;
                    })}
                </div>
                <DragOverlay>
                    {activeCard && <Card app={activeCard} onDelete={() => {}} overlay />}
                </DragOverlay>
            </DndContext>

            {showAdd && <AddModal onClose={() => setShowAdd(false)} onSubmit={addApp} />}
        </div>
    );
}

function Column({ col, apps, onDelete }) {
    const { setNodeRef, isOver } = useDroppable({ id: col.id });
    return (
        <div ref={setNodeRef} data-testid={`kanban-column-${col.id}`} className="min-h-[400px]">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2" style={{ background: col.color, borderRadius: 1 }} />
                    <span className="font-display font-bold text-sm">{col.label}</span>
                </div>
                <span className="text-xs text-[#4A4D57]">{apps.length}</span>
            </div>
            <div className={`space-y-2 p-2 border ${isOver ? "border-[#FF4400] bg-[#FFF5EF]" : "border-[#E5E7EB] bg-[#F4F5F7]"} min-h-[300px] transition-colors`} style={{ borderRadius: 2 }}>
                {apps.map((a) => <Card key={a.id} app={a} onDelete={onDelete} />)}
                {apps.length === 0 && <div className="text-xs text-[#4A4D57] py-4 text-center">Drop here</div>}
            </div>
        </div>
    );
}

function Card({ app, onDelete, overlay }) {
    const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: app.id });
    return (
        <div
            ref={overlay ? undefined : setNodeRef}
            {...(overlay ? {} : attributes)}
            {...(overlay ? {} : listeners)}
            className={`bg-white border border-[#0D0D12] p-3 cursor-grab active:cursor-grabbing ${isDragging && !overlay ? "opacity-30" : ""}`}
            style={{ borderRadius: 2 }}
            data-testid={`kanban-card-${app.id}`}
        >
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <div className="font-display font-bold text-sm truncate">{app.company}</div>
                    <div className="text-xs text-[#4A4D57] truncate">{app.role}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(app.id); }} onPointerDown={(e) => e.stopPropagation()} className="text-[#4A4D57] hover:text-[#FF4400]" data-testid={`kanban-del-${app.id}`}>
                    <Trash size={12} />
                </button>
            </div>
            {app.deadline && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-[#FF4400] font-bold">
                    <Calendar size={10} weight="bold" /> {new Date(app.deadline).toLocaleDateString("en-IN")}
                </div>
            )}
            {app.salary_exp && <div className="text-[10px] text-[#4A4D57] mt-1">Expected: ₹{(app.salary_exp / 100000).toFixed(1)}L</div>}
        </div>
    );
}

function AddModal({ onClose, onSubmit }) {
    const [form, setForm] = useState({ company: "", role: "", status: "wishlist", deadline: "", salary_exp: "" });
    function submit(e) {
        e.preventDefault();
        onSubmit({
            ...form,
            salary_exp: form.salary_exp ? Number(form.salary_exp) : null,
            deadline: form.deadline || null,
        });
    }
    return (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4" onClick={onClose}>
            <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white border border-[#0D0D12] p-6 w-full max-w-md" style={{ borderRadius: 2 }} data-testid="tracker-add-modal">
                <h2 className="font-display font-extrabold text-xl">Track a new role</h2>
                <div className="mt-4 space-y-3">
                    <input required placeholder="Company" className="rp-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="tracker-company-input" />
                    <input required placeholder="Role" className="rp-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="tracker-role-input" />
                    <select className="rp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <input type="date" className="rp-input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                    <input type="number" placeholder="Expected salary (₹)" className="rp-input" value={form.salary_exp} onChange={(e) => setForm({ ...form, salary_exp: e.target.value })} />
                </div>
                <div className="flex gap-2 mt-4">
                    <button type="button" onClick={onClose} className="rp-btn-outline flex-1">Cancel</button>
                    <button type="submit" className="rp-btn-orange flex-1" data-testid="tracker-submit-btn">Add</button>
                </div>
            </form>
        </div>
    );
}
