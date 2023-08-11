import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import React from 'react';
import { SettingsEnum } from 'main/sentient-sims/models/SettingsEnum';
import { useDebugMode } from '../providers/DebugModeProvider';
import useSetting from '../hooks/useSetting';

export default function CustomLLMSettingsComponent() {
  const debugMode = useDebugMode();
  const customLLMEnabled = useSetting(SettingsEnum.CUSTOM_LLM_ENABLED, false);
  const customLLMHostname = useSetting(SettingsEnum.CUSTOM_LLM_HOSTNAME);

  return (
    <div>
      {debugMode.isEnabled ? (
        <Box display="flex" alignItems="center" sx={{ marginBottom: 2 }}>
          <FormControlLabel
            label="Enable Custom LLM"
            control={
              <Checkbox
                checked={customLLMEnabled.value}
                onChange={(change) =>
                  customLLMEnabled.setSetting(change.target.checked)
                }
              />
            }
          />
        </Box>
      ) : null}
      {customLLMEnabled.value && debugMode.isEnabled ? (
        <Box display="flex" alignItems="center" sx={{ marginBottom: 2 }}>
          <TextField
            focused
            id="outlined-basic"
            label="Custom LLM Hostname"
            variant="outlined"
            value={customLLMHostname.value}
            size="small"
            fullWidth
            onChange={(change) =>
              customLLMHostname.setSetting(change.target.value)
            }
            sx={{ marginRight: 2 }}
          />
          <Tooltip title="Reset to Default">
            <IconButton onClick={() => customLLMHostname.resetSetting()}>
              <RotateLeftIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null}
    </div>
  );
}