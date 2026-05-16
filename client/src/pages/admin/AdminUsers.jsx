import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { userService } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../components/Toast';

const roles = ['', 'admin', 'clerk', 'lawyer', 'judge', 'citizen'];

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({ role: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', isActive: true });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.role) params.role = filters.role;
      if (filters.search) params.search = filters.search;
      const data = await userService.getAll(params);
      setUsers(data.users);
      setPagination((p) => ({ ...p, total: data.pagination.total }));
    } catch (err) {
      toast?.show(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [pagination.page, filters]);

  function openEdit(user) {
    setSelected(user);
    setEditForm({ name: user.name, phone: user.phone || '', isActive: user.isActive });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await userService.update(selected.id, editForm);
      toast?.show('User updated successfully', 'success');
      setModalOpen(false);
      load();
    } catch (err) {
      toast?.show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this user?')) return;
    try {
      await userService.delete(id);
      toast?.show('User deleted', 'success');
      load();
    } catch (err) {
      toast?.show(err.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>User Management</h1><p>Manage all system users</p></div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div className="search-input" style={{ flex: 1, minWidth: 200 }}>
              <span className="search-icon search-icon-wrap"><Icon name="search" size={16} /></span>
              <input className="form-control" placeholder="Search by name or email…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} style={{ paddingLeft: 36 }} />
            </div>
            <select className="form-control filter-select" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
              <option value="">All Roles</option>
              {roles.filter(Boolean).map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && <tr><td colSpan={6}><div className="empty-state"><div className="icon"><Icon name="user" size={48} /></div><h3>No users found</h3></div></td></tr>}
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td><StatusBadge status={u.role} /></td>
                        <td><span className={`badge ${u.isActive ? 'badge-completed' : 'badge-postponed'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pagination.page} total={pagination.total} limit={pagination.limit} onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} />
            </>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit User"
        footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
        <div className="form-group"><label className="form-label">Name</label><input className="form-control" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={editForm.isActive ? 'active' : 'inactive'} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
