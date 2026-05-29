import React, { useState, useEffect } from 'react';
import { ProjectItem } from '../types';
import { getProjects, addProject, updateProject, deleteProject } from '../utils/db';
import { addActivityLog } from '../utils/activityLogger';
import { Plus, Edit2, Trash2, CheckCircle, AlertCircle, RefreshCw, FolderPlus, Sprout } from 'lucide-react';

export default function AdminProjectsView() {
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const [notif, setNotif] = useState<{ type: 'success' | 'err'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjectsList(data);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'err', message: string) => {
    setNotif({ type, message });
    setTimeout(() => setNotif(null), 3500);
  };

  const handleStartAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
  };

  const handleStartEdit = (proj: ProjectItem) => {
    setIsEditing(true);
    setEditingId(proj.id);
    setName(proj.name);

    // Scroll gently
    const formElement = document.getElementById('project-form-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('err', 'Nama proyek tidak boleh kosong.');
      return;
    }

    setActionLoading(true);
    try {
      if (isEditing && editingId) {
        // Update
        const oldName = projectsList.find(p => p.id === editingId)?.name || '';
        const updated: ProjectItem = {
          id: editingId,
          name: name.trim(),
        };
        const ok = await updateProject(updated);
        if (ok) {
          addActivityLog('EDIT_PROYEK', `Mengubah nama proyek greenhouse dari "${oldName}" menjadi "${updated.name}"`);
          showNotification('success', `Proyek "${updated.name}" berhasil diperbarui.`);
          setIsEditing(false);
          setEditingId(null);
          setName('');
        } else {
          throw new Error('Gagal memperbarui database.');
        }
      } else {
        // Create
        const newProj: ProjectItem = {
          id: `proj-${Date.now()}`,
          name: name.trim(),
        };
        const ok = await addProject(newProj);
        if (ok) {
          addActivityLog('TAMBAH_PROYEK', `Menambahkan proyek greenhouse baru "${newProj.name}"`);
          showNotification('success', `Proyek "${newProj.name}" berhasil ditambahkan.`);
          setName('');
        } else {
          throw new Error('Gagal menambah ke database.');
        }
      }
      await loadProjects();
    } catch (err: any) {
      showNotification('err', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, projectName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus proyek "${projectName}"? Semua transaksi terikat pada proyek ini akan tetap ada, tapi disarankan mengganti nama saja untuk menghindari inkonsistensi.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const ok = await deleteProject(id);
      if (ok) {
        addActivityLog('HAPUS_PROYEK', `Menghapus proyek greenhouse "${projectName}"`);
        showNotification('success', `Proyek "${projectName}" berhasil dihapus.`);
        await loadProjects();
      } else {
        throw new Error('Gagal menghapus dari database.');
      }
    } catch (err: any) {
      showNotification('err', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div id="admin-projects-view" className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600" />
            Kelola Proyek Greenhouse (Projects)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Definisikan dan kelola sub-proyek produktif Greenhouse (seperti Melon, Cabe, dll) yang langsung tersinkron di Google Sheets.
          </p>
        </div>
        <button 
          onClick={loadProjects}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-semibold text-xs transition duration-200 cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data Proyek
        </button>
      </div>

      {notif && (
        <div className={`p-4 border rounded-2xl text-xs flex items-center gap-3 animate-in fade-in duration-200 ${
          notif.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {notif.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{notif.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form */}
        <div id="project-form-card" className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm self-start">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 font-display">
            <FolderPlus className="w-4 h-4 text-emerald-500" />
            {isEditing ? 'Ubah Proyek Terpilih' : 'Tambah Proyek Baru'}
          </h3>
          <p className="text-[11px] text-slate-400">
            {isEditing 
              ? 'Ubah nama label proyek agar tercermin pada seluruh posting kas.' 
              : 'Proyek baru akan langsung muncul sebagai opsi bagi pengelola maupun tim analis.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
            <div>
              <label className="block text-slate-500 mb-1">NAMA PROYEK</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Melon, Cabe, Anggur"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs shadow-xs transition duration-200 cursor-pointer"
              >
                {actionLoading ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Tambahkan'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition duration-200 cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List of Projects */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider">DAFTAR PROYEK GREENHOUSE AKTIF</h4>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] text-slate-500 font-mono font-bold">
                {projectsList.length} Proyek
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                <p className="text-xs">Memuat data proyek dari Google Sheets...</p>
              </div>
            ) : projectsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs font-semibold">Belum ada proyek terdaftar.</p>
                <p className="text-[10px] mt-1">Gunakan panel disamping untuk menambahkan proyek pertama Anda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projectsList.map((proj) => (
                  <div key={proj.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Sprout className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">{proj.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(proj)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-850 transition duration-150 cursor-pointer"
                        title="Edit Proyek"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id, proj.name)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition duration-150 cursor-pointer"
                        title="Hapus Proyek"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
