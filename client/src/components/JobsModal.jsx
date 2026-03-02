import { useState, useEffect } from 'react';
import { createJob, updateJob, deleteJob } from '../api';

function JobsModal({ jobs, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1',
  });
  const [editingJob, setEditingJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = editingJob !== null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        await updateJob(editingJob.id, formData);
      } else {
        await createJob(formData);
      }
      setFormData({ name: '', description: '', color: '#6366f1' });
      setEditingJob(null);
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      name: job.name,
      description: job.description || '',
      color: job.color || '#6366f1',
    });
    setError(null);
  };

  const handleDelete = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job? Cards will be unassigned.')) {
      setSaving(true);
      try {
        await deleteJob(jobId);
        if (editingJob && editingJob.id === jobId) {
          setEditingJob(null);
          setFormData({ name: '', description: '', color: '#6366f1' });
        }
        onSave();
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setEditingJob(null);
    setFormData({ name: '', description: '', color: '#6366f1' });
    setError(null);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const colorOptions = [
    '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4',
    '#10b981', '#f59e0b', '#f97316', '#ef4444'
  ];

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal jobs-modal">
        <div className="modal-header">
          <h2>Manage Jobs</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          <div className="jobs-list">
            <h3>Existing Jobs</h3>
            {jobs.length === 0 ? (
              <p className="no-jobs">No jobs yet</p>
            ) : (
              <div className="jobs-grid">
                {jobs.map((job) => (
                  <div key={job.id} className="job-item">
                    <div className="job-info">
                      <span
                        className="job-color"
                        style={{ backgroundColor: job.color }}
                      />
                      <div className="job-details">
                        <span className="job-name">{job.name}</span>
                        {job.description && (
                          <span className="job-description">{job.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="job-actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleEdit(job)}
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      {job.name !== 'General' && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDelete(job.id)}
                          title="Delete"
                          disabled={saving}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="job-form">
            <h3>{isEditing ? 'Edit Job' : 'Add New Job'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="job-name">Name</label>
                <input
                  id="job-name"
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Job name..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="job-description">Description</label>
                <input
                  id="job-description"
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="form-actions">
                {isEditing && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : isEditing ? 'Update Job' : 'Add Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobsModal;
