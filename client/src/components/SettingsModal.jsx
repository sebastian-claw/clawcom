import { memo, useState } from 'react';

const DEFAULT_SETTINGS = {
  bgPrimary: '#0d0d0f',
  bgTertiary: '#27272a',
  priorityLow: '#22c55e',
  priorityMedium: '#eab308',
  priorityHigh: '#f97316',
  priorityUrgent: '#ef4444',
};

const SettingsModal = memo(function SettingsModal({ settings, onSave, onClose, onReset }) {
  const [localSettings, setLocalSettings] = useState({ ...settings });

  const handleChange = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    onReset();
    setLocalSettings({ ...DEFAULT_SETTINGS });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal settings-modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h3>General</h3>
            <div className="settings-grid">
              <div className="form-group">
                <label>Background Color</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={localSettings.bgPrimary}
                    onChange={(e) => handleChange('bgPrimary', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={localSettings.bgPrimary}
                    onChange={(e) => handleChange('bgPrimary', e.target.value)}
                    className="color-text"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Card Background</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={localSettings.bgTertiary}
                    onChange={(e) => handleChange('bgTertiary', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={localSettings.bgTertiary}
                    onChange={(e) => handleChange('bgTertiary', e.target.value)}
                    className="color-text"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Priority Colors</h3>
            <div className="settings-grid">
              <div className="form-group">
                <label>Low Priority</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={localSettings.priorityLow}
                    onChange={(e) => handleChange('priorityLow', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={localSettings.priorityLow}
                    onChange={(e) => handleChange('priorityLow', e.target.value)}
                    className="color-text"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Medium Priority</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={localSettings.priorityMedium}
                    onChange={(e) => handleChange('priorityMedium', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={localSettings.priorityMedium}
                    onChange={(e) => handleChange('priorityMedium', e.target.value)}
                    className="color-text"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>High Priority</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={localSettings.priorityHigh}
                    onChange={(e) => handleChange('priorityHigh', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={localSettings.priorityHigh}
                    onChange={(e) => handleChange('priorityHigh', e.target.value)}
                    className="color-text"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Urgent Priority</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={localSettings.priorityUrgent}
                    onChange={(e) => handleChange('priorityUrgent', e.target.value)}
                    className="color-input"
                  />
                  <input
                    type="text"
                    value={localSettings.priorityUrgent}
                    onChange={(e) => handleChange('priorityUrgent', e.target.value)}
                    className="color-text"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
});

export default SettingsModal;
